/**
 * MIRRORBUDDY - Rate Limiter with Redis Support
 *
 * Uses Upstash Redis when UPSTASH_REDIS_REST_URL is configured,
 * falls back to in-memory for local development.
 *
 * Multi-instance safe when Redis is configured.
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'rate-limit' });

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// Circuit breaker: if Redis auth is misconfigured (Upstash WRONGPASS), stop
// calling Redis for the lifetime of the serverless instance to avoid log spam.
let redisDisabledUntilRestart = false;

// In-memory store (cleared on server restart)
const store = new Map<string, RateLimitEntry>();

// Check if Redis rate limiting is available
function isRedisConfigured(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

// Lazy-init Redis client - one per config
const redisLimiters = new Map<string, Ratelimit>();

function getRedisRatelimit(maxRequests: number, windowMs: number): Ratelimit {
  const key = `${maxRequests}:${windowMs}`;
  let limiter = redisLimiters.get(key);

  if (!limiter) {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!.trim(),
      token: process.env.UPSTASH_REDIS_REST_TOKEN!.trim(),
    });

    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(maxRequests, `${windowMs}ms`),
      analytics: false,
      prefix: 'mirrorbuddy:ratelimit',
    });

    redisLimiters.set(key, limiter);
    log.info('Redis rate limiter initialized', { maxRequests, windowMs });
  }

  return limiter;
}

/**
 * Get the current rate limit mode
 */
export function getRateLimitMode(): 'redis' | 'memory' {
  return isRedisConfigured() ? 'redis' : 'memory';
}

// Cleanup old entries every 5 minutes (memory mode only)
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let cleanupTimer: NodeJS.Timeout | null = null;

function startCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.resetTime < now) {
        store.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);
  cleanupTimer.unref();
}

/**
 * Stop cleanup timer (for graceful shutdown)
 */
export function stopCleanup(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

// Re-export types from shared module to maintain API compatibility
export type { RateLimitConfig, RateLimitResult } from './rate-limit-types';
import type { RateLimitConfig, RateLimitResult } from './rate-limit-types';

/**
 * Memory-based rate limit check
 */
function checkMemoryRateLimit(identifier: string, config: RateLimitConfig): RateLimitResult {
  startCleanup();

  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || entry.resetTime < now) {
    const resetTime = now + config.windowMs;
    store.set(identifier, { count: 1, resetTime });
    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetTime,
      limit: config.maxRequests,
    };
  }

  if (entry.count >= config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
      limit: config.maxRequests,
    };
  }

  entry.count++;
  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
    limit: config.maxRequests,
  };
}

/**
 * Redis-based rate limit check (async)
 */
async function checkRedisRateLimitAsync(
  identifier: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  if (redisDisabledUntilRestart) {
    return checkMemoryRateLimit(identifier, config);
  }

  try {
    const limiter = getRedisRatelimit(config.maxRequests, config.windowMs);
    const result = await limiter.limit(identifier);

    return {
      success: result.success,
      remaining: result.remaining,
      resetTime: result.reset,
      limit: result.limit,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('WRONGPASS')) {
      redisDisabledUntilRestart = true;
      log.error('Redis rate limiter disabled (WRONGPASS). Falling back to memory until restart.', {
        error: message,
      });
    } else {
      log.error('Redis rate limit error, falling back to memory', { error });
    }
    return checkMemoryRateLimit(identifier, config);
  }
}

/**
 * Check rate limit for a given identifier (usually IP or userId)
 *
 * Uses Redis when configured (multi-instance safe),
 * falls back to in-memory for local development.
 *
 * @param identifier - Unique identifier for rate limiting (IP, userId, etc.)
 * @param config - Rate limit configuration
 * @returns Rate limit result with remaining quota
 */
export function checkRateLimit(identifier: string, config: RateLimitConfig): RateLimitResult {
  // Validate identifier at start
  const idValidation = validateIdentifier(identifier);
  if (!idValidation.valid) {
    return {
      success: false,
      remaining: 0,
      resetTime: Date.now() + 60000,
      limit: 0,
      error: idValidation.error,
    };
  }

  // Skip rate limiting in E2E tests and development mode
  if (process.env.E2E_TESTS === '1' || process.env.NODE_ENV === 'development') {
    const resetTime = Date.now() + config.windowMs;
    return {
      success: true,
      remaining: config.maxRequests,
      resetTime,
      limit: config.maxRequests,
    };
  }

  // Use memory-based for sync compatibility
  // For async Redis support, use checkRateLimitAsync
  return checkMemoryRateLimit(identifier, config);
}

/**
 * Async rate limit check - uses Redis when available
 *
 * @param identifier - Unique identifier for rate limiting
 * @param config - Rate limit configuration
 * @returns Rate limit result with remaining quota
 */
export async function checkRateLimitAsync(
  identifier: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  // Validate identifier at start
  const idValidation = validateIdentifier(identifier);
  if (!idValidation.valid) {
    return {
      success: false,
      remaining: 0,
      resetTime: Date.now() + 60000,
      limit: 0,
      error: idValidation.error,
    };
  }

  // Skip rate limiting in E2E tests and development mode
  if (process.env.E2E_TESTS === '1' || process.env.NODE_ENV === 'development') {
    const resetTime = Date.now() + config.windowMs;
    return {
      success: true,
      remaining: config.maxRequests,
      resetTime,
      limit: config.maxRequests,
    };
  }

  // In production, Redis is REQUIRED - fail fast if not configured
  if (process.env.NODE_ENV === 'production' && !isRedisConfigured()) {
    log.error('CRITICAL: Redis not configured in production - rate limiting disabled');
    // Fail-fast: return service unavailable
    return {
      success: false,
      remaining: 0,
      resetTime: Date.now() + 60000, // Retry in 1 minute
      limit: 0,
      error: 'Rate limiting service unavailable',
    };
  }

  if (isRedisConfigured()) {
    return checkRedisRateLimitAsync(identifier, config);
  }

  return checkMemoryRateLimit(identifier, config);
}

/**
 * Validate rate limit identifier
 * In production, "anonymous" is not allowed (security risk)
 */
export function validateIdentifier(identifier: string): {
  valid: boolean;
  error?: string;
} {
  if (process.env.NODE_ENV === 'production' && identifier === 'anonymous') {
    log.warn('Anonymous rate limit identifier rejected in production');
    return {
      valid: false,
      error: 'Unable to identify client for rate limiting',
    };
  }
  return { valid: true };
}

/**
 * Get client identifier from request (IP address)
 * Falls back to 'anonymous' if IP cannot be determined
 */
export function getClientIdentifier(request: Request): string {
  // Try various headers for IP
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback for local development
  return 'anonymous';
}

/**
 * Get the best identifier for rate limiting
 * Prefers userId (authenticated) over IP address
 *
 * @param request - The incoming request
 * @param userId - Optional authenticated userId
 * @returns Best identifier for rate limiting
 */
export function getRateLimitIdentifier(request: Request, userId?: string | null): string {
  // Prefer userId for authenticated users (more accurate, prevents IP sharing issues)
  if (userId) {
    return `user:${userId}`;
  }

  // Fall back to client IP
  return getClientIdentifier(request);
}

// ============================================================================
// PRE-CONFIGURED RATE LIMITERS
// ============================================================================

/**
 * Rate limit configs for different endpoint types
 */
export const RATE_LIMITS = {
  // ========== AUTH ENDPOINTS (Strict - Prevent brute force) ==========

  /** Login attempts: 5 per 15 minutes (very strict) */
  AUTH_LOGIN: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000,
  },
  /** Password changes: 3 per 15 minutes (very strict) */
  AUTH_PASSWORD: {
    maxRequests: 3,
    windowMs: 15 * 60 * 1000,
  },
  /** OAuth flows: 10 per minute */
  AUTH_OAUTH: {
    maxRequests: 10,
    windowMs: 60 * 1000,
  },
  /** General auth operations: 30 per minute */
  AUTH_GENERAL: {
    maxRequests: 30,
    windowMs: 60 * 1000,
  },
  /** Invite requests: 3 per hour (public endpoint, strict) */
  INVITE_REQUEST: {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000,
  },
  /** Contact form submissions: 5 per hour (public endpoint, moderate) */
  CONTACT_FORM: {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000,
  },
  /** COPPA verification: 5 per hour (email costs, strict) */
  COPPA: {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000,
  },

  // ========== API ENDPOINTS ==========

  /** Chat API: 60 requests per minute (expensive AI calls) */
  CHAT: {
    maxRequests: 60,
    windowMs: 60 * 1000,
  },
  /** Realtime token: 30 requests per minute (voice session tokens) */
  REALTIME_TOKEN: {
    maxRequests: 30,
    windowMs: 60 * 1000,
  },
  /** Homework analysis: 10 requests per minute (vision API, very expensive) */
  HOMEWORK: {
    maxRequests: 10,
    windowMs: 60 * 1000,
  },
  /** Search API: 30 requests per minute */
  SEARCH: {
    maxRequests: 30,
    windowMs: 60 * 1000,
  },
  /** TTS API: 15 requests per minute (audio generation, expensive) */
  TTS: {
    maxRequests: 15,
    windowMs: 60 * 1000,
  },
  /** General API: 60 requests per minute */
  GENERAL: {
    maxRequests: 60,
    windowMs: 60 * 1000,
  },
  /** Web Vitals metrics: 60 requests per minute (client-side performance monitoring) */
  WEB_VITALS: {
    maxRequests: 60,
    windowMs: 60 * 1000,
  },
} as const;

/**
 * Helper to create rate limit error response
 */
export function rateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': result.resetTime.toString(),
        'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
      },
    },
  );
}

// Re-export persistence functions
export { logRateLimitEvent, getRateLimitEvents, getRateLimitStats } from './rate-limit-persistence';

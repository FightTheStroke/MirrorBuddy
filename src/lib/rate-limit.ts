/**
 * MIRRORBUDDY - Simple In-Memory Rate Limiter
 *
 * Lightweight rate limiting for API routes without external dependencies.
 * Suitable for MVP/single-instance deployments.
 *
 * For multi-instance production, replace with Redis-based solution.
 */


interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store (cleared on server restart)
const store = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
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
  // Unref to allow process to exit without waiting for cleanup
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

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  success: boolean;
  /** Remaining requests in current window */
  remaining: number;
  /** Unix timestamp when the limit resets */
  resetTime: number;
  /** Total limit for the window */
  limit: number;
}

/**
 * Check rate limit for a given identifier (usually IP or userId)
 *
 * @param identifier - Unique identifier for rate limiting (IP, userId, etc.)
 * @param config - Rate limit configuration
 * @returns Rate limit result with remaining quota
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  if (process.env.E2E_TESTS === '1') {
    const resetTime = Date.now() + config.windowMs;
    return {
      success: true,
      remaining: config.maxRequests,
      resetTime,
      limit: config.maxRequests,
    };
  }

  startCleanup();

  const now = Date.now();
  const key = identifier;
  const entry = store.get(key);

  // First request or window expired
  if (!entry || entry.resetTime < now) {
    const resetTime = now + config.windowMs;
    store.set(key, { count: 1, resetTime });
    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetTime,
      limit: config.maxRequests,
    };
  }

  // Within window, check count
  if (entry.count >= config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
      limit: config.maxRequests,
    };
  }

  // Increment and allow
  entry.count++;
  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
    limit: config.maxRequests,
  };
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

// ============================================================================
// PRE-CONFIGURED RATE LIMITERS
// ============================================================================

/**
 * Rate limit configs for different endpoint types
 */
export const RATE_LIMITS = {
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
    }
  );
}

// Re-export persistence functions
export { logRateLimitEvent, getRateLimitEvents, getRateLimitStats } from './rate-limit-persistence';

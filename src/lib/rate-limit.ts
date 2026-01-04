/**
 * MIRRORBUDDY - Simple In-Memory Rate Limiter
 *
 * Lightweight rate limiting for API routes without external dependencies.
 * Suitable for MVP/single-instance deployments.
 *
 * For multi-instance production, replace with Redis-based solution.
 */

import { prisma } from '@/lib/db';

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

// ============================================================================
// PERSISTENCE (Dashboard Analytics)
// ============================================================================

/**
 * Log a rate limit violation event to the database
 * Called when rate limit is exceeded (for analytics dashboard)
 */
export async function logRateLimitEvent(
  endpoint: string,
  config: RateLimitConfig,
  options: { userId?: string; ipAddress?: string } = {}
): Promise<void> {
  try {
    await prisma.rateLimitEvent.create({
      data: {
        userId: options.userId ?? null,
        endpoint,
        limit: config.maxRequests,
        window: Math.floor(config.windowMs / 1000),
        ipAddress: options.ipAddress ?? null,
      },
    });
  } catch (error) {
    // Don't let logging failures break the app
    console.error('Failed to log rate limit event:', error);
  }
}

/**
 * Get rate limit events for dashboard analytics
 */
export async function getRateLimitEvents(options: {
  startDate?: Date;
  endDate?: Date;
  endpoint?: string;
  limit?: number;
} = {}): Promise<{
  events: Array<{
    id: string;
    userId: string | null;
    endpoint: string;
    limit: number;
    window: number;
    ipAddress: string | null;
    timestamp: Date;
  }>;
  total: number;
}> {
  const where = {
    ...(options.startDate || options.endDate ? {
      timestamp: {
        ...(options.startDate && { gte: options.startDate }),
        ...(options.endDate && { lte: options.endDate }),
      },
    } : {}),
    ...(options.endpoint && { endpoint: options.endpoint }),
  };

  const [events, total] = await Promise.all([
    prisma.rateLimitEvent.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: options.limit ?? 100,
    }),
    prisma.rateLimitEvent.count({ where }),
  ]);

  return { events, total };
}

/**
 * Get aggregated rate limit stats for dashboard
 */
export async function getRateLimitStats(
  startDate: Date,
  endDate: Date
): Promise<{
  totalEvents: number;
  byEndpoint: Record<string, number>;
  uniqueUsers: number;
  uniqueIps: number;
}> {
  const events = await prisma.rateLimitEvent.findMany({
    where: {
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      endpoint: true,
      userId: true,
      ipAddress: true,
    },
  });

  const byEndpoint: Record<string, number> = {};
  const users = new Set<string>();
  const ips = new Set<string>();

  for (const event of events) {
    byEndpoint[event.endpoint] = (byEndpoint[event.endpoint] || 0) + 1;
    if (event.userId) users.add(event.userId);
    if (event.ipAddress) ips.add(event.ipAddress);
  }

  return {
    totalEvents: events.length,
    byEndpoint,
    uniqueUsers: users.size,
    uniqueIps: ips.size,
  };
}

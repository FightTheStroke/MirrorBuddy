// ============================================================================
// REDIS CLIENT - Singleton Upstash Redis client (serverless-safe)
// ============================================================================

import { Redis } from '@upstash/redis';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'redis' });

// ============================================================================
// CONFIGURATION - accepts both UPSTASH_REDIS_REST_* and KV_REST_API_* (Vercel)
// ============================================================================

/** Resolve Redis URL from either naming convention */
export function getRedisUrl(): string | undefined {
  return process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
}

/** Resolve Redis token from either naming convention */
export function getRedisToken(): string | undefined {
  return process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
}

export function isRedisConfigured(): boolean {
  return !!(getRedisUrl() && getRedisToken());
}

// ============================================================================
// SINGLETON REDIS CLIENT
// ============================================================================

let redisInstance: Redis | null = null;

/**
 * Get the singleton Upstash Redis client
 * Serverless-safe: only creates instance once, safe for Next.js hot reload
 */
export function getRedisClient(): Redis {
  const url = getRedisUrl();
  const token = getRedisToken();

  if (!url || !token) {
    throw new Error(
      'Redis not configured: set UPSTASH_REDIS_REST_URL/TOKEN or KV_REST_API_URL/TOKEN',
    );
  }

  if (!redisInstance) {
    redisInstance = new Redis({ url, token });
    log.info('Redis client initialized');
  }

  return redisInstance;
}

/**
 * Check if Redis is configured and available
 */
export function isRedisAvailable(): boolean {
  return isRedisConfigured();
}

/**
 * Direct access to Redis client (convenience export)
 * Only use this when Redis is guaranteed to be configured
 */
export const redis = new Proxy({} as Redis, {
  get(_target, prop) {
    const client = getRedisClient();
    return client[prop as keyof Redis];
  },
});

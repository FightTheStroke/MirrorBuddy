// ============================================================================
// REDIS CLIENT - Singleton Upstash Redis client (serverless-safe)
// ============================================================================

import { Redis } from "@upstash/redis";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "redis" });

// ============================================================================
// CONFIGURATION
// ============================================================================

function isRedisConfigured(): boolean {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
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
  if (!isRedisConfigured()) {
    throw new Error(
      "Redis not configured: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN required",
    );
  }

  if (!redisInstance) {
    redisInstance = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    log.info("Redis client initialized");
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

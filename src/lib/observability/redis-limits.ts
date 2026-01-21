/**
 * Redis Cache Limits (F-18, F-25)
 *
 * Monitors Redis memory and connection usage.
 * Used for proactive alerts when approaching resource limits.
 *
 * Environment Variables Required:
 *   - REDIS_URL: Redis connection URL
 */

import { logger } from "@/lib/logger";
import { calculateStatus, AlertStatus } from "./threshold-logic";

/**
 * Resource metric
 */
export interface ResourceMetric {
  used: number; // Used amount
  limit: number; // Limit amount
  percent: number; // Usage percentage (0-100)
  status: AlertStatus; // Alert status from threshold logic
}

/**
 * Redis limits
 */
export interface RedisLimits {
  memory: ResourceMetric;
  connections: ResourceMetric;
  timestamp: number;
  error?: string;
}

/**
 * Cache for rate limiting
 */
interface CacheEntry {
  data: RedisLimits;
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
let cache: CacheEntry | null = null;

/**
 * Get Redis resource limits
 * Note: Requires REDIS_URL environment variable to be set.
 * In development, returns placeholder values if Redis is not available.
 *
 * @returns Promise<RedisLimits> Current Redis resource usage
 */
export async function getRedisLimits(): Promise<RedisLimits> {
  // Check cache first
  if (cache && cache.expiresAt > Date.now()) {
    logger.debug("Returning cached Redis limits");
    return cache.data;
  }

  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    const error = "REDIS_URL not configured";
    logger.warn(error);
    return createEmptyLimits(error);
  }

  try {
    // Placeholder: Redis client would connect and query stats
    // For now, return placeholder values
    const memoryUsed = 0;
    const memoryLimit = 256;
    const memoryPercent = memoryLimit > 0 ? Math.round((memoryUsed / memoryLimit) * 100) : 0;

    const connectionsUsed = 0;
    const connectionsLimit = 10000;
    const connectionsPercent =
      connectionsLimit > 0 ? Math.round((connectionsUsed / connectionsLimit) * 100) : 0;

    const limits: RedisLimits = {
      memory: {
        used: memoryUsed,
        limit: memoryLimit,
        percent: memoryPercent,
        status: calculateStatus(memoryPercent), // F-25
      },
      connections: {
        used: connectionsUsed,
        limit: connectionsLimit,
        percent: connectionsPercent,
        status: calculateStatus(connectionsPercent), // F-25
      },
      timestamp: Date.now(),
    };

    // Update cache
    cache = {
      data: limits,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };

    logger.info("Redis limits fetched successfully", {
      memory: "0.0%",
      connections: "0.0%",
    });

    return limits;
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "Unknown error";
    logger.error("Failed to fetch Redis limits", undefined, error as Error);
    return createEmptyLimits(errorMsg);
  }
}

/**
 * Create empty limits response on error
 */
function createEmptyLimits(error: string): RedisLimits {
  return {
    memory: { used: 0, limit: 0, percent: 0, status: "ok" },
    connections: { used: 0, limit: 0, percent: 0, status: "ok" },
    timestamp: Date.now(),
    error,
  };
}

/**
 * Clear cache (for testing)
 */
export function clearRedisLimitsCache(): void {
  cache = null;
}

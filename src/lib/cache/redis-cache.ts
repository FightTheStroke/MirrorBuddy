/**
 * @file redis-cache.ts
 * @brief Redis-based cache layer for hot paths
 * Reduces database load for frequently accessed, rarely changing data
 * Created for F-10: Performance Optimization
 */

import { getRedisClient, isRedisAvailable } from "@/lib/redis";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "cache" });

interface CacheOptions {
  ttlSeconds: number;
  prefix?: string;
}

const DEFAULT_TTL = 300; // 5 minutes

function buildKey(prefix: string, id: string): string {
  return `cache:${prefix}:${id}`;
}

export async function cacheGet<T>(
  prefix: string,
  id: string,
): Promise<T | null> {
  if (!isRedisAvailable()) return null;

  try {
    const redis = getRedisClient();
    const key = buildKey(prefix, id);
    const data = await redis.get<T>(key);
    if (data !== null) {
      log.debug("Cache HIT", { prefix, id });
    }
    return data;
  } catch (error) {
    log.warn("Cache get failed, falling through", { prefix, id, error });
    return null;
  }
}

export async function cacheSet<T>(
  prefix: string,
  id: string,
  value: T,
  options?: CacheOptions,
): Promise<void> {
  if (!isRedisAvailable()) return;

  try {
    const redis = getRedisClient();
    const key = buildKey(prefix, id);
    const ttl = options?.ttlSeconds ?? DEFAULT_TTL;
    await redis.set(key, JSON.stringify(value), { ex: ttl });
    log.debug("Cache SET", { prefix, id, ttl });
  } catch (error) {
    log.warn("Cache set failed", { prefix, id, error });
  }
}

export async function cacheInvalidate(
  prefix: string,
  id: string,
): Promise<void> {
  if (!isRedisAvailable()) return;

  try {
    const redis = getRedisClient();
    const key = buildKey(prefix, id);
    await redis.del(key);
    log.debug("Cache INVALIDATE", { prefix, id });
  } catch (error) {
    log.warn("Cache invalidate failed", { prefix, id, error });
  }
}

export async function cacheGetOrFetch<T>(
  prefix: string,
  id: string,
  fetcher: () => Promise<T>,
  options?: CacheOptions,
): Promise<T> {
  const cached = await cacheGet<T>(prefix, id);
  if (cached !== null) return cached;

  const value = await fetcher();
  await cacheSet(prefix, id, value, options);
  return value;
}

export const CACHE_PREFIXES = {
  MAESTRO_PROFILE: "maestro",
  TIER_LIMITS: "tier",
  SCHOOL_CONFIG: "school",
} as const;

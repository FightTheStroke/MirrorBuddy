/**
 * CONVERGIO EDUCATION - Simple In-Memory Cache
 *
 * Lightweight caching for frequently accessed data without external dependencies.
 * Suitable for MVP/single-instance deployments.
 *
 * For multi-instance production, replace with Redis-based solution.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

// In-memory cache store
const cache = new Map<string, CacheEntry<unknown>>();

// Cleanup old entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let cleanupTimer: NodeJS.Timeout | null = null;

function startCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
      if (entry.expiresAt < now) {
        cache.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);
}

export interface CacheOptions {
  /** Time-to-live in milliseconds */
  ttl: number;
}

/**
 * Get a value from cache
 */
export function get<T>(key: string): T | undefined {
  startCleanup();

  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return undefined;

  // Check if expired
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return undefined;
  }

  return entry.data;
}

/**
 * Set a value in cache with TTL
 */
export function set<T>(key: string, value: T, options: CacheOptions): void {
  startCleanup();

  const expiresAt = Date.now() + options.ttl;
  cache.set(key, { data: value, expiresAt });
}

/**
 * Delete a value from cache
 */
export function del(key: string): void {
  cache.delete(key);
}

/**
 * Clear all cache entries
 */
export function clear(): void {
  cache.clear();
}

/**
 * Get or compute a value (cache-aside pattern)
 * If value exists in cache, return it. Otherwise, compute it and cache it.
 */
export async function getOrCompute<T>(
  key: string,
  compute: () => T | Promise<T>,
  options: CacheOptions
): Promise<T> {
  const cached = get<T>(key);
  if (cached !== undefined) {
    return cached;
  }

  const value = await compute();
  set(key, value, options);
  return value;
}

// ============================================================================
// PRE-CONFIGURED CACHE TTLs
// ============================================================================

/**
 * Cache TTLs for different data types
 */
export const CACHE_TTL = {
  /** Maestri list: 1 hour (static data) */
  MAESTRI: 60 * 60 * 1000,
  /** User settings: 5 minutes (changes occasionally) */
  SETTINGS: 5 * 60 * 1000,
  /** Session data: 1 minute (changes frequently) */
  SESSION: 1 * 60 * 1000,
} as const;

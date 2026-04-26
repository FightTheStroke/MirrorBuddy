/**
 * Admin Counts Redis Pub/Sub Service
 *
 * Publishes admin KPI counts to Redis pub/sub for real-time dashboard updates.
 * Supports multiple concurrent admin sessions (F-23).
 * Memory leak prevention through proper listener cleanup (F-24).
 *
 * Architecture:
 * - In production: Uses Upstash Redis pub/sub for horizontal scaling
 * - In development: Falls back to in-memory broadcasts
 * - Graceful degradation: Non-fatal if Redis is unavailable
 */

import { Redis } from '@upstash/redis';
import { logger } from '@/lib/logger';
import { isRedisConfigured as checkRedisConfig, getRedisUrl, getRedisToken } from '@/lib/redis';

const log = logger.child({ module: 'admin-counts-pubsub' });

// ============================================================================
// TYPES
// ============================================================================

export interface AdminCounts {
  pendingInvites: number;
  totalUsers: number;
  activeUsers24h: number;
  systemAlerts: number;
  timestamp: string;
}

export interface AdminCountsMessage {
  type: 'admin:counts';
  data: AdminCounts;
  publishedAt: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const REDIS_CHANNEL = 'mirrorbuddy:admin:counts';
const IN_MEMORY_SUBSCRIBERS = new Set<(msg: AdminCountsMessage) => void>();

// ============================================================================
// REDIS INITIALIZATION
// ============================================================================

let redisInstance: Redis | null = null;
let isInitializing = false;

/**
 * Get or initialize Redis instance
 * Handles lazy initialization with single instance pattern
 */
function getRedisInstance(): Redis | null {
  if (!checkRedisConfig()) {
    return null;
  }

  if (redisInstance) {
    return redisInstance;
  }

  if (!isInitializing) {
    try {
      isInitializing = true;
      redisInstance = new Redis({
        url: getRedisUrl()!,
        token: getRedisToken()!,
      });
      log.info('Redis admin counts service initialized');
    } catch (error) {
      log.error('Failed to initialize Redis for admin counts', { error });
      isInitializing = false;
      return null;
    }
  }

  return redisInstance;
}

// ============================================================================
// PUB/SUB OPERATIONS
// ============================================================================

/**
 * Publish admin counts to Redis pub/sub channel
 * Gracefully degrades if Redis is unavailable
 *
 * F-23: Supports N concurrent admin sessions via pub/sub
 * F-24: Memory safe - no persistent listeners, one-shot publish
 */
export async function publishAdminCounts(counts: AdminCounts): Promise<void> {
  const message: AdminCountsMessage = {
    type: 'admin:counts',
    data: counts,
    publishedAt: new Date().toISOString(),
  };

  // Try Redis first
  const redis = getRedisInstance();
  if (redis) {
    try {
      await redis.publish(REDIS_CHANNEL, JSON.stringify(message));
      log.debug('Admin counts published to Redis', {
        channel: REDIS_CHANNEL,
        counts: {
          pendingInvites: counts.pendingInvites,
          totalUsers: counts.totalUsers,
          activeUsers24h: counts.activeUsers24h,
          systemAlerts: counts.systemAlerts,
        },
      });
      return;
    } catch (error) {
      log.warn('Failed to publish to Redis, falling back to in-memory', {
        error: String(error),
      });
    }
  }

  // Fallback: In-memory broadcast for development or Redis fallback
  try {
    IN_MEMORY_SUBSCRIBERS.forEach((callback) => {
      try {
        callback(message);
      } catch (error) {
        log.error('Error in admin counts subscriber callback', { error });
      }
    });

    if (IN_MEMORY_SUBSCRIBERS.size > 0) {
      log.debug('Admin counts published in-memory', {
        subscriberCount: IN_MEMORY_SUBSCRIBERS.size,
      });
    }
  } catch (error) {
    log.error('Failed to publish admin counts in-memory', { error });
  }
}

/**
 * Subscribe to admin counts updates
 * For development/testing or in-memory fallback mode
 *
 * Returns unsubscribe function for cleanup (F-24: Memory leak prevention)
 */
export function subscribeToAdminCounts(
  callback: (message: AdminCountsMessage) => void,
): () => void {
  IN_MEMORY_SUBSCRIBERS.add(callback);

  // Return unsubscribe function
  return () => {
    IN_MEMORY_SUBSCRIBERS.delete(callback);
  };
}

/**
 * Get current subscriber count
 * Useful for monitoring and debugging
 */
export function getAdminCountsSubscriberCount(): number {
  return IN_MEMORY_SUBSCRIBERS.size;
}

/**
 * Clear all subscribers
 * Mainly for testing/cleanup
 */
export function clearAdminCountsSubscribers(): void {
  IN_MEMORY_SUBSCRIBERS.clear();
  log.debug('Admin counts subscribers cleared');
}

/**
 * Health check for admin counts pub/sub service
 */
export async function getAdminCountsPubSubHealth(): Promise<{
  redis: boolean;
  inMemory: number;
}> {
  const redis = getRedisInstance();
  return {
    redis: !!redis,
    inMemory: IN_MEMORY_SUBSCRIBERS.size,
  };
}

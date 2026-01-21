// ============================================================================
// ADMIN COUNTS STORAGE
// Persist and retrieve admin counts from Redis
// ============================================================================

import { redis, isRedisAvailable } from "./index";
import { logger } from "@/lib/logger";
import { AdminCounts, CHANNEL, STORAGE_KEY } from "./admin-counts-types";

const log = logger.child({ module: "admin-counts-storage" });

/**
 * Publish admin counts to all connected instances
 * Also persists to Redis for initial SSE data
 *
 * @param counts - The admin counts to broadcast
 */
export async function publishAdminCounts(counts: AdminCounts): Promise<void> {
  if (!isRedisAvailable()) {
    log.warn("Redis not available, skipping admin counts publish");
    return;
  }

  try {
    // 1. Persist in Redis (for initial SSE data)
    await redis.set(STORAGE_KEY, JSON.stringify(counts));

    // 2. Publish to channel (for live updates to all instances)
    await redis.publish(CHANNEL, JSON.stringify(counts));

    log.debug("Admin counts published", {
      pendingInvites: counts.pendingInvites,
      totalUsers: counts.totalUsers,
      activeUsers24h: counts.activeUsers24h,
      systemAlerts: counts.systemAlerts,
    });
  } catch (error) {
    log.error("Failed to publish admin counts", { error });
    throw error;
  }
}

/**
 * Get the latest persisted admin counts from Redis
 * Used for initial SSE connection to send cached data immediately
 *
 * @returns Latest admin counts or null if not available
 */
export async function getLatestAdminCounts(): Promise<AdminCounts | null> {
  if (!isRedisAvailable()) {
    log.warn("Redis not available, cannot get latest admin counts");
    return null;
  }

  try {
    const data = await redis.get<string>(STORAGE_KEY);
    if (!data) {
      return null;
    }

    const counts =
      typeof data === "string" ? JSON.parse(data) : (data as AdminCounts);
    return counts;
  } catch (error) {
    log.error("Failed to get latest admin counts", { error });
    return null;
  }
}

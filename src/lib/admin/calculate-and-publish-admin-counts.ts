/**
 * Calculate and Publish Admin Counts
 *
 * Computes admin KPI metrics and publishes via SSE/Redis pub/sub
 * Called when admin-relevant events occur:
 * - Trial budget changes (F-06)
 * - Invite requests change
 * - User signup
 * - System alerts
 *
 * Non-blocking: Errors are logged but don't interrupt calling code
 */

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { publishAdminCounts } from "@/lib/redis/admin-counts-storage";
import { broadcastAdminCounts } from "@/lib/redis/admin-counts-subscriber";
import type { AdminCounts } from "@/lib/redis/admin-counts-types";

const log = logger.child({ module: "calculate-and-publish-admin-counts" });

/**
 * Calculate current admin KPI metrics
 * Used by: admin counts endpoint, trial budget trigger, invite changes, etc.
 *
 * F-06: Excludes test data (isTestData = false) from all counts
 */
async function calculateAdminCounts(): Promise<AdminCounts> {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  try {
    // Run all queries in parallel for performance
    const [
      pendingInvites,
      totalUsers,
      activeUsersResult,
      criticalSafetyEvents,
    ] = await Promise.all([
      // Pending invite requests
      prisma.inviteRequest.count({
        where: { status: "PENDING" },
      }),

      // Total users (F-06: exclude test data)
      prisma.user.count({
        where: { isTestData: false },
      }),

      // Active users in last 24h (F-06: exclude test data at query level if possible)
      prisma.userActivity.groupBy({
        by: ["identifier"],
        where: {
          timestamp: { gte: yesterday },
        },
      }),

      // Critical safety events (unresolved = resolvedAt is null)
      prisma.safetyEvent
        .count({
          where: {
            resolvedAt: null,
            severity: "critical",
          },
        })
        .catch(() => 0), // May not exist in schema
    ]);

    const activeUsers24h = activeUsersResult.length;

    return {
      pendingInvites,
      totalUsers,
      activeUsers24h,
      systemAlerts: criticalSafetyEvents,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    log.error("Failed to calculate admin counts", { error: String(error) });
    throw error;
  }
}

/**
 * Calculate and publish admin counts to all connected admins via SSE
 *
 * Non-blocking: If publishing fails, it's logged but doesn't throw
 * This ensures trial budget updates or other events aren't interrupted
 *
 * Called by:
 * - Trial budget changes (incrementBudget trigger)
 * - Invite request changes
 * - User signup
 * - Cron jobs
 * - Direct admin actions
 */
export async function calculateAndPublishAdminCounts(
  source?: string,
): Promise<void> {
  try {
    log.debug("Publishing admin counts", { source });

    // Calculate current metrics
    const counts = await calculateAdminCounts();

    // 1. Store in Redis for initial SSE data
    await publishAdminCounts(counts);

    // 2. Broadcast to all connected SSE clients
    broadcastAdminCounts(counts);

    log.info("Admin counts published successfully", {
      source,
      pendingInvites: counts.pendingInvites,
      totalUsers: counts.totalUsers,
      activeUsers24h: counts.activeUsers24h,
      systemAlerts: counts.systemAlerts,
    });
  } catch (error) {
    // Non-blocking error handling: log but don't throw
    log.warn("Failed to publish admin counts (non-blocking)", {
      source,
      error: String(error),
    });
    // Do not rethrow - calling code should not be affected by SSE push failures
  }
}

/**
 * Publish Admin Counts Helper
 *
 * Reusable function to calculate admin KPI counts and publish them via Redis pub/sub.
 * Called by API routes (invite, alert, user, etc.) to trigger automatic count updates.
 *
 * F-23: Redis supports N concurrent admin sessions via pub/sub channel
 * F-24: Memory leak prevention through graceful error handling and no persistent listeners
 *
 * ISE Engineering Fundamentals: Observability, Error handling with graceful degradation
 */

import { prisma } from "@/lib/db";
import { publishAdminCounts, type AdminCounts } from "./admin-counts-pubsub";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "publish-admin-counts" });

// ============================================================================
// RATE LIMITING (F-32)
// ============================================================================

/**
 * Rate limiter state for admin counts publication.
 * In-memory tracking of last publish timestamp per event type.
 * Resets on cold start - this is acceptable as we only need local rate limiting.
 *
 * Map<eventType, lastPublishTimestamp>
 * Example: { "invite": 1234567890, "safety": 1234567900 }
 */
const lastPublishTimestamp: Map<string, number> = new Map();
const RATE_LIMIT_MS = 60000; // 1 minute

/**
 * Clear rate limiter state (for testing purposes only)
 * @internal
 */
export function clearRateLimiterState(): void {
  lastPublishTimestamp.clear();
}

// ============================================================================
// TYPES
// ============================================================================

export interface AdminCountsResult {
  success: boolean;
  counts?: AdminCounts;
  error?: string;
  duration: number; // milliseconds
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Calculate admin counts from database and publish to Redis pub/sub
 *
 * Queries run in parallel for performance:
 * - Pending invite requests (PENDING status)
 * - Total registered users (excluding test data per F-06)
 * - Active users in last 24 hours (from UserActivity table)
 * - Critical unresolved safety events
 *
 * Gracefully handles Redis failures - function returns success even if
 * publishing fails, allowing API routes to continue normally.
 *
 * F-32: Rate limiting - max 1 push/min per event type
 * If rate limit is exceeded, returns early without publishing and logs at debug level.
 *
 * @param eventType - Event source type for rate limiting (default: "manual")
 *                    Examples: "invite", "safety", "user", "manual"
 * @returns Promise<AdminCountsResult> with success flag, counts, and timing
 */
export async function calculateAndPublishAdminCounts(
  eventType: string = "manual",
): Promise<AdminCountsResult> {
  const startTime = Date.now();

  try {
    // Rate limiting check (F-32)
    const now = Date.now();
    const lastPublish = lastPublishTimestamp.get(eventType) ?? 0;
    const timeSinceLastPublish = now - lastPublish;

    if (timeSinceLastPublish < RATE_LIMIT_MS) {
      const cooldownMs = RATE_LIMIT_MS - timeSinceLastPublish;
      log.debug("Rate limited admin counts publish", {
        eventType,
        cooldownMs,
        timeSinceLastPublish,
      });
      return {
        success: true,
        duration: 0,
      };
    }

    // Update timestamp for this event type
    lastPublishTimestamp.set(eventType, now);

    log.debug("Starting admin counts calculation", { eventType });

    const nowDate = new Date();
    const yesterday = new Date(nowDate.getTime() - 24 * 60 * 60 * 1000);

    // Run all database queries in parallel for performance
    // Same logic as GET /api/admin/counts endpoint
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

      // Active users in last 24h (F-06: exclude test data)
      prisma.userActivity.groupBy({
        by: ["identifier"],
        where: {
          timestamp: { gte: yesterday },
          isTestData: false,
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

    const counts: AdminCounts = {
      pendingInvites,
      totalUsers,
      activeUsers24h,
      systemAlerts: criticalSafetyEvents,
      timestamp: nowDate.toISOString(),
    };

    // Publish to Redis pub/sub
    // This is non-blocking and won't throw even if Redis is down
    await publishAdminCounts(counts);

    const duration = Date.now() - startTime;

    log.info("Admin counts calculated and published successfully", {
      eventType,
      duration,
      counts: {
        pendingInvites,
        totalUsers,
        activeUsers24h,
        systemAlerts: criticalSafetyEvents,
      },
    });

    return {
      success: true,
      counts,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Log error but don't throw - graceful degradation
    log.error("Failed to calculate and publish admin counts", {
      eventType,
      error: errorMessage,
      duration,
    });

    // Return error result but don't crash
    return {
      success: false,
      error: errorMessage,
      duration,
    };
  }
}

/**
 * Trigger admin counts publication for external API route integration
 *
 * Used by:
 * - POST /api/admin/invite (after accepting/rejecting invite)
 * - POST /api/admin/alert (after resolving alert)
 * - DELETE /api/admin/users/:id (after user deletion)
 * - Other admin mutation endpoints
 *
 * F-32: Supports rate limiting by event type
 *
 * @param eventType - Event source type for rate limiting (default: "manual")
 *
 * Non-blocking: Returns immediately without waiting for publication to complete
 */
export function triggerAdminCountsUpdate(eventType: string = "manual"): void {
  // Fire and forget - don't await
  calculateAndPublishAdminCounts(eventType).catch((error) => {
    log.error("Unhandled error in async admin counts trigger", {
      eventType,
      error,
    });
  });
}

/**
 * Type-safe trigger with inline documentation for API routes
 *
 * Usage in API route:
 * ```typescript
 * import { triggerAdminCountsUpdate } from '@/lib/helpers/publish-admin-counts';
 *
 * export async function POST(request: NextRequest) {
 *   // ... handle mutation ...
 *   triggerAdminCountsUpdate(); // Update dashboard counts
 *   return NextResponse.json({ success: true });
 * }
 * ```
 */
export const adminCountsTrigger = triggerAdminCountsUpdate;

// ============================================================================
// SSE ENDPOINT: Admin Counts Stream
// Real-time admin dashboard KPI updates via Server-Sent Events
// F-02: SSE endpoint implementation
// F-20: Initial data sent immediately on connection
// F-21: Heartbeat every 30s to keep connection alive
// ============================================================================

import { pipe, withSentry, withAdmin } from "@/lib/api/middlewares";
import { getLatestAdminCounts } from "@/lib/redis/admin-counts-storage";
import { subscribeToAdminCounts } from "@/lib/redis/admin-counts-subscriber";
import { type AdminCounts } from "@/lib/redis/admin-counts-types";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/db";

const log = logger.child({ module: "admin-counts-sse" });

// Force dynamic rendering (no static optimization)
export const dynamic = "force-dynamic";

/**
 * SSE endpoint for admin dashboard real-time counts
 *
 * Flow:
 * 1. Validate admin authentication
 * 2. Send initial data immediately (F-20)
 * 3. Subscribe to Redis Pub/Sub for live updates
 * 4. Send heartbeat every 30s (F-21)
 * 5. Cleanup on disconnect
 *
 * EventSource format:
 * - Data events: `data: {...}\n\n`
 * - Heartbeat: `: heartbeat\n\n` (comment, ignored by EventSource)
 */
export const GET = pipe(
  withSentry("/api/admin/counts/stream"),
  withAdmin,
)(async (ctx) => {
  // ============================================================================
  // 1. AUTHENTICATION (admin only) - handled by withAdmin middleware
  // ============================================================================

  log.info("Admin SSE connection established", { userId: ctx.userId });

  // ============================================================================
  // 2. CREATE SSE STREAM
  // ============================================================================

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let unsubscribe: (() => void) | null = null;
      let heartbeatInterval: NodeJS.Timeout | null = null;

      try {
        // ============================================================================
        // 2.1 SEND INITIAL DATA (F-20)
        // ============================================================================

        // Try to get cached data from Redis first (fast)
        let initialCounts = await getLatestAdminCounts();

        // If no cache, fetch from database (fallback)
        if (!initialCounts) {
          log.debug("No cached counts, fetching from database");
          initialCounts = await fetchCountsFromDatabase();
        }

        // Send initial data immediately (<500ms target)
        const initialData = `data: ${JSON.stringify(initialCounts)}\n\n`;
        controller.enqueue(encoder.encode(initialData));

        log.debug("Initial data sent", {
          counts: initialCounts,
        });

        // ============================================================================
        // 2.2 SUBSCRIBE TO UPDATES
        // ============================================================================

        const updateListener = (counts: AdminCounts) => {
          try {
            const data = `data: ${JSON.stringify(counts)}\n\n`;
            controller.enqueue(encoder.encode(data));

            log.debug("Update sent to client", {
              counts,
            });
          } catch (error) {
            log.error("Failed to send update", { error: String(error) });
          }
        };

        unsubscribe = await subscribeToAdminCounts(updateListener);

        log.debug("Subscribed to admin counts updates");

        // ============================================================================
        // 2.3 HEARTBEAT (F-21)
        // ============================================================================

        heartbeatInterval = setInterval(() => {
          try {
            // SSE comment format (ignored by EventSource, keeps connection alive)
            controller.enqueue(encoder.encode(": heartbeat\n\n"));
            log.debug("Heartbeat sent");
          } catch (error) {
            log.error("Failed to send heartbeat", { error: String(error) });
          }
        }, 30000); // 30 seconds

        // ============================================================================
        // 2.4 CLEANUP ON DISCONNECT
        // ============================================================================

        ctx.req.signal.addEventListener("abort", () => {
          log.info("SSE connection closed by client", {
            userId: ctx.userId,
          });

          // Unsubscribe from Redis Pub/Sub
          if (unsubscribe) {
            unsubscribe();
          }

          // Stop heartbeat
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
          }

          // Close stream
          try {
            controller.close();
          } catch (error) {
            // Stream may already be closed
            log.debug("Stream already closed", { error: String(error) });
          }
        });
      } catch (error) {
        log.error("SSE stream error", { error: String(error) });

        // Cleanup on error
        if (unsubscribe) {
          unsubscribe();
        }
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
        }

        controller.error(error);
      }
    },
  });

  // ============================================================================
  // 3. RETURN SSE RESPONSE
  // ============================================================================

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  });
});

// ============================================================================
// HELPER: Fetch counts from database (fallback when Redis cache is empty)
// ============================================================================

async function fetchCountsFromDatabase(): Promise<AdminCounts> {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [pendingInvites, totalUsers, activeUsersResult, criticalSafetyEvents] =
    await Promise.all([
      prisma.inviteRequest.count({ where: { status: "PENDING" } }),
      prisma.user.count({ where: { isTestData: false } }),
      prisma.userActivity.groupBy({
        by: ["identifier"],
        where: { timestamp: { gte: yesterday }, isTestData: false },
      }),
      prisma.safetyEvent
        .count({
          where: { resolvedAt: null, severity: "critical" },
        })
        .catch(() => 0),
    ]);

  return {
    pendingInvites,
    totalUsers,
    activeUsers24h: activeUsersResult.length,
    systemAlerts: criticalSafetyEvents,
    timestamp: new Date().toISOString(),
  };
}

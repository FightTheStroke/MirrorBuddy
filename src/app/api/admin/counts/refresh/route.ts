/**
 * Admin Counts Refresh API
 *
 * Endpoint for manual on-demand refresh of admin KPI counts.
 * Calculates fresh counts from database and publishes via Redis pub/sub
 * for real-time dashboard updates.
 *
 * F-05c: Endpoint `/api/admin/counts/refresh` per refresh manuale
 * F-23: Supports N concurrent admin sessions via pub/sub
 * F-32: Rate limiting (max 1 push/min per event type)
 */

import { NextResponse } from "next/server";
import { pipe, withSentry, withCSRF, withAdmin } from "@/lib/api/middlewares";
import {
  calculateAndPublishAdminCounts,
  type AdminCountsResult,
} from "@/lib/helpers/publish-admin-counts";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "admin-counts-refresh" });

export const POST = pipe(
  withSentry("/api/admin/counts/refresh"),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  log.info("Admin counts refresh requested", { userId: ctx.userId });

  // Calculate fresh counts and publish to Redis pub/sub
  // F-05c: Endpoint performs manual on-demand refresh
  // F-32: Rate limiting handled in calculateAndPublishAdminCounts
  const result: AdminCountsResult =
    await calculateAndPublishAdminCounts("manual");

  if (!result.success || !result.counts) {
    log.warn("Admin counts refresh failed", {
      error: result.error,
      duration: result.duration,
    });
    return NextResponse.json(
      { error: result.error || "Failed to refresh counts" },
      { status: 500 },
    );
  }

  log.info("Admin counts refreshed successfully", {
    userId: ctx.userId,
    duration: result.duration,
    counts: {
      pendingInvites: result.counts.pendingInvites,
      totalUsers: result.counts.totalUsers,
      activeUsers24h: result.counts.activeUsers24h,
      systemAlerts: result.counts.systemAlerts,
    },
  });

  // Return fresh counts along with metadata
  return NextResponse.json({
    success: true,
    counts: result.counts,
    duration: result.duration,
    refreshedAt: new Date().toISOString(),
  });
});

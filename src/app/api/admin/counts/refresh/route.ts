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
import { validateAdminAuth } from "@/lib/auth/session-auth";
import {
  calculateAndPublishAdminCounts,
  type AdminCountsResult,
} from "@/lib/helpers/publish-admin-counts";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "admin-counts-refresh" });

export async function POST() {
  const auth = await validateAdminAuth();

  if (!auth.authenticated || !auth.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    log.info("Admin counts refresh requested", { userId: auth.userId });

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
      userId: auth.userId,
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
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error("Admin counts refresh error", {
      userId: auth.userId,
      error: errorMessage,
    });

    return NextResponse.json(
      { error: "Failed to refresh counts" },
      { status: 500 },
    );
  }
}

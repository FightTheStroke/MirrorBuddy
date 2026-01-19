/**
 * Admin Counts API
 *
 * Returns KPI counts for the admin dashboard:
 * - pendingInvites: Number of pending beta requests
 * - totalUsers: Total registered users
 * - activeUsers24h: Users active in the last 24 hours
 * - systemAlerts: Number of critical system alerts
 */

import { NextResponse } from "next/server";
import { validateAdminAuth } from "@/lib/auth/session-auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const auth = await validateAdminAuth();

  if (!auth.authenticated || !auth.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

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

      // Total users
      prisma.user.count(),

      // Active users in last 24h (distinct user identifiers from UserActivity)
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

    return NextResponse.json({
      pendingInvites,
      totalUsers,
      activeUsers24h,
      systemAlerts: criticalSafetyEvents,
    });
  } catch (error) {
    console.error("Failed to fetch admin counts:", error);
    return NextResponse.json(
      { error: "Failed to fetch counts" },
      { status: 500 },
    );
  }
}

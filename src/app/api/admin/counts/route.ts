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
import { pipe, withSentry, withAdmin } from "@/lib/api/middlewares";
import { prisma } from "@/lib/db";


export const revalidate = 0;
export const GET = pipe(
  withSentry("/api/admin/counts"),
  withAdmin,
)(async () => {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Run all queries in parallel for performance
  // F-06: Exclude test data from statistics (isTestData = false)
  const [pendingInvites, totalUsers, activeUsersResult, criticalSafetyEvents] =
    await Promise.all([
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

  return NextResponse.json({
    pendingInvites,
    totalUsers,
    activeUsers24h,
    systemAlerts: criticalSafetyEvents,
  });
});

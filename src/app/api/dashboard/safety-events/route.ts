// ============================================================================
// API ROUTE: Safety Events
// GET: Safety monitoring statistics for dashboard
// POST: Resolve a safety event
// SECURITY: Requires authentication
// ============================================================================

import { NextResponse } from "next/server";
import {
  getSafetyEventsFromDb,
  getSafetyStatsFromDb,
  resolveSafetyEvent,
} from "@/lib/safety";
import { pipe, withSentry, withAdmin, withCSRF } from "@/lib/api/middlewares";
import { triggerAdminCountsUpdate } from "@/lib/helpers/publish-admin-counts";

export const GET = pipe(
  withSentry("/api/dashboard/safety-events"),
  withAdmin,
)(async (ctx) => {
  const { searchParams } = new URL(ctx.req.url);
  const days = parseInt(searchParams.get("days") ?? "7", 10);
  const severityParam = searchParams.get("severity");
  const severity =
    severityParam &&
    ["info", "warning", "alert", "critical"].includes(severityParam)
      ? (severityParam as "info" | "warning" | "alert" | "critical")
      : undefined;
  const unresolvedOnly = searchParams.get("unresolved") === "true";
  const limit = parseInt(searchParams.get("limit") ?? "100", 10);

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get events and stats
  const [eventsResult, stats] = await Promise.all([
    getSafetyEventsFromDb({
      startDate,
      endDate,
      severity,
      unresolvedOnly,
      limit,
    }),
    getSafetyStatsFromDb(startDate, endDate),
  ]);

  // Daily breakdown
  const dailyEvents: Record<string, number> = {};
  for (const event of eventsResult.events) {
    const day = event.timestamp.toISOString().split("T")[0];
    dailyEvents[day] = (dailyEvents[day] || 0) + 1;
  }

  return NextResponse.json({
    period: { days, startDate: startDate.toISOString() },
    summary: {
      totalEvents: stats.totalEvents,
      unresolvedCount: stats.unresolvedCount,
      criticalCount: stats.criticalCount,
    },
    bySeverity: stats.bySeverity,
    byType: stats.byType,
    dailyEvents,
    recentEvents: eventsResult.events.slice(0, 20).map((e) => ({
      id: e.id,
      type: e.type,
      severity: e.severity,
      timestamp: e.timestamp,
      resolved: !!e.resolvedAt,
    })),
  });
});

export const POST = pipe(
  withSentry("/api/dashboard/safety-events"),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  const body = await ctx.req.json();
  const { eventId, resolvedBy, resolution } = body;

  if (!eventId || !resolvedBy || !resolution) {
    return NextResponse.json(
      { error: "Missing required fields: eventId, resolvedBy, resolution" },
      { status: 400 },
    );
  }

  await resolveSafetyEvent(eventId, resolvedBy, resolution);

  // Trigger admin counts push (F-32: non-blocking, rate-limited per event type)
  triggerAdminCountsUpdate("safety");

  return NextResponse.json({ success: true });
});

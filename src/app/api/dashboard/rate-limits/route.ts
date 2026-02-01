// ============================================================================
// API ROUTE: Rate Limit Events
// GET: Rate limiting statistics for dashboard
// SECURITY: Requires authentication
// ============================================================================

import { NextResponse } from "next/server";
import { getRateLimitEvents, getRateLimitStats } from "@/lib/rate-limit";
import { pipe, withSentry, withAdmin } from "@/lib/api/middlewares";

export const GET = pipe(
  withSentry("/api/dashboard/rate-limits"),
  withAdmin,
)(async (ctx) => {
  const { searchParams } = new URL(ctx.req.url);
  const days = parseInt(searchParams.get("days") ?? "7", 10);
  const endpoint = searchParams.get("endpoint") ?? undefined;
  const limit = parseInt(searchParams.get("limit") ?? "100", 10);

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get events and stats
  const [eventsResult, stats] = await Promise.all([
    getRateLimitEvents({
      startDate,
      endDate,
      endpoint,
      limit,
    }),
    getRateLimitStats(startDate, endDate),
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
      uniqueUsers: stats.uniqueUsers,
      uniqueIps: stats.uniqueIps,
    },
    byEndpoint: stats.byEndpoint,
    dailyEvents,
    recentEvents: eventsResult.events.slice(0, 20).map((e) => ({
      id: e.id,
      endpoint: e.endpoint,
      limit: e.limit,
      window: e.window,
      timestamp: e.timestamp,
    })),
  });
});

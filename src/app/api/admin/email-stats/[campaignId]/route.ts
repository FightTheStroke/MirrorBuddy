/**
 * GET /api/admin/email-stats/[campaignId]
 *
 * Admin endpoint for individual campaign statistics and open timeline.
 * Requires admin authentication.
 *
 * Reference: ADR 0113 (Composable API Handler Pattern)
 */

import { NextResponse } from "next/server";
import {
  pipe,
  withSentry,
  withAdmin,
  type MiddlewareContext,
} from "@/lib/api/middlewares";
import { getCampaignStats, getOpenTimeline } from "@/lib/email/stats-service";

/**
 * GET /api/admin/email-stats/[campaignId]
 * Returns campaign statistics and hourly open timeline
 */
export const GET = pipe(
  withSentry("/api/admin/email-stats/[campaignId]"),
  withAdmin,
)(async (ctx: MiddlewareContext) => {
  try {
    const { campaignId } = await ctx.params;

    // Validate campaignId parameter
    if (!campaignId) {
      return NextResponse.json(
        { error: "Campaign ID is required" },
        { status: 400 },
      );
    }

    // Fetch campaign stats and timeline in parallel
    const [stats, timeline] = await Promise.all([
      getCampaignStats(campaignId),
      getOpenTimeline(campaignId),
    ]);

    return NextResponse.json({
      stats,
      timeline,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: `Failed to fetch campaign stats: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 },
    );
  }
});

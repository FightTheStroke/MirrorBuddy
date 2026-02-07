/**
 * GET /api/admin/email-stats
 *
 * Admin endpoint for global email statistics and recent campaign stats.
 * Requires admin authentication.
 *
 * Reference: ADR 0113 (Composable API Handler Pattern)
 */

import { NextResponse } from "next/server";
import { pipe, withSentry, withAdmin } from "@/lib/api/middlewares";
import {
  getGlobalStats,
  getRecentCampaignStats,
} from "@/lib/email/stats-service";

/**
 * GET /api/admin/email-stats
 * Returns global email statistics and recent campaign stats
 */
export const GET = pipe(
  withSentry("/api/admin/email-stats"),
  withAdmin,
)(async () => {
  try {
    // Fetch global stats and recent campaigns in parallel
    const [global, recent] = await Promise.all([
      getGlobalStats(),
      getRecentCampaignStats(10),
    ]);

    return NextResponse.json({
      global,
      recent,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: `Failed to fetch email stats: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 },
    );
  }
});

// ============================================================================
// CRON JOB - HIERARCHICAL SUMMARY GENERATION
// Generates weekly/monthly summaries for all active users
// Part of Total Memory System (ADR 0082-0090)
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { runHierarchicalSummarization } from "@/lib/cron/cron-hierarchical-summary";
import { logger } from "@/lib/logger";

/**
 * POST /api/cron/hierarchical-summary
 * Protected by CRON_SECRET for scheduled execution
 *
 * Schedule: Daily at 03:00 UTC
 * - Weekly summaries: Generated for past 7 days if not already exists
 * - Monthly summaries: Generated on 1st of month if not already exists
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      logger.error("CRON_SECRET not configured");
      return NextResponse.json(
        { error: "Cron job not configured" },
        { status: 500 },
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      logger.warn("Unauthorized cron job attempt", {
        path: "/api/cron/hierarchical-summary",
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.info("Hierarchical summary cron job started");

    // Run the summarization process
    await runHierarchicalSummarization();

    logger.info("Hierarchical summary cron job completed");

    return NextResponse.json({
      success: true,
      message: "Hierarchical summaries generated",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Hierarchical summary cron job failed", {
      error: String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: "Cron job execution failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

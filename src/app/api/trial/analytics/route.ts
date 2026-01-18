/**
 * MIRRORBUDDY - Trial Analytics API
 *
 * Returns trial funnel metrics for dashboard/admin.
 * Requires admin authentication.
 *
 * Plan 052: Trial mode observability
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAdmin } from "@/lib/auth/middleware";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "api/trial/analytics" });

interface TrialFunnelMetrics {
  period: string;
  trialStarts: number;
  trialChats: number;
  limitHits: number;
  betaCtaShown: number;
  betaCtaClicked: number;
  conversionRate: number;
  avgChatsPerTrial: number;
}

async function getTrialAnalytics(): Promise<Response> {
  try {
    // Get trial sessions created in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const trialSessions = await prisma.trialSession.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        id: true,
        chatsUsed: true,
        docsUsed: true,
        createdAt: true,
        lastActivityAt: true,
      },
    });

    const totalTrials = trialSessions.length;
    const totalChats = trialSessions.reduce(
      (sum: number, s: { chatsUsed: number }) => sum + s.chatsUsed,
      0,
    );
    const limitHits = trialSessions.filter(
      (s: { chatsUsed: number }) => s.chatsUsed >= 10,
    ).length;

    // Calculate conversion (users who reached limit = potential converts)
    const conversionRate =
      totalTrials > 0 ? Math.round((limitHits / totalTrials) * 100) : 0;

    // Count beta CTA clicks from telemetry (action: beta_request_click)
    const betaCtaClicks = await prisma.telemetryEvent.count({
      where: {
        action: "beta_request_click",
        timestamp: { gte: thirtyDaysAgo },
      },
    });

    const metrics: TrialFunnelMetrics = {
      period: "last_30_days",
      trialStarts: totalTrials,
      trialChats: totalChats,
      limitHits,
      betaCtaShown: limitHits, // Shown when limit reached
      betaCtaClicked: betaCtaClicks,
      conversionRate,
      avgChatsPerTrial: totalTrials > 0 ? totalChats / totalTrials : 0,
    };

    // Daily breakdown for charts
    const dailyBreakdown = getDailyBreakdown(trialSessions);

    log.info("Trial analytics fetched", { totalTrials, totalChats });

    return NextResponse.json({
      metrics,
      dailyBreakdown,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    log.error("Failed to fetch trial analytics", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 },
    );
  }
}

function getDailyBreakdown(
  sessions: Array<{ createdAt: Date; chatsUsed: number }>,
): Array<{ date: string; trials: number; chats: number }> {
  const breakdown: Record<string, { trials: number; chats: number }> = {};

  for (const session of sessions) {
    const date = session.createdAt.toISOString().split("T")[0];
    if (!breakdown[date]) {
      breakdown[date] = { trials: 0, chats: 0 };
    }
    breakdown[date].trials++;
    breakdown[date].chats += session.chatsUsed;
  }

  return Object.entries(breakdown)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Admin-only endpoint
export const GET = withAdmin(getTrialAnalytics);

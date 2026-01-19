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
  trialVoiceMinutes: number;
  trialToolCalls: number;
  limitHits: {
    chat: number;
    voice: number;
    tool: number;
    total: number;
  };
  betaCtaShown: number;
  betaCtaClicked: number;
  conversionRate: number;
  avgChatsPerTrial: number;
  avgVoiceMinutesPerTrial: number;
  avgToolsPerTrial: number;
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
        voiceSecondsUsed: true,
        toolsUsed: true,
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
    const totalVoiceSeconds = trialSessions.reduce(
      (sum: number, s: { voiceSecondsUsed: number }) =>
        sum + s.voiceSecondsUsed,
      0,
    );
    const totalToolCalls = trialSessions.reduce(
      (sum: number, s: { toolsUsed: number }) => sum + s.toolsUsed,
      0,
    );

    // Limit hits by type
    const chatLimitHits = trialSessions.filter(
      (s: { chatsUsed: number }) => s.chatsUsed >= 10,
    ).length;
    const voiceLimitHits = trialSessions.filter(
      (s: { voiceSecondsUsed: number }) => s.voiceSecondsUsed >= 300,
    ).length;
    const toolLimitHits = trialSessions.filter(
      (s: { toolsUsed: number }) => s.toolsUsed >= 10,
    ).length;
    const totalLimitHits = trialSessions.filter(
      (s: { chatsUsed: number; voiceSecondsUsed: number; toolsUsed: number }) =>
        s.chatsUsed >= 10 || s.voiceSecondsUsed >= 300 || s.toolsUsed >= 10,
    ).length;

    // Calculate conversion (users who reached any limit = potential converts)
    const conversionRate =
      totalTrials > 0 ? Math.round((totalLimitHits / totalTrials) * 100) : 0;

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
      trialVoiceMinutes: Math.round(totalVoiceSeconds / 60),
      trialToolCalls: totalToolCalls,
      limitHits: {
        chat: chatLimitHits,
        voice: voiceLimitHits,
        tool: toolLimitHits,
        total: totalLimitHits,
      },
      betaCtaShown: totalLimitHits, // Shown when any limit reached
      betaCtaClicked: betaCtaClicks,
      conversionRate,
      avgChatsPerTrial:
        totalTrials > 0 ? Math.round((totalChats / totalTrials) * 10) / 10 : 0,
      avgVoiceMinutesPerTrial:
        totalTrials > 0
          ? Math.round((totalVoiceSeconds / 60 / totalTrials) * 10) / 10
          : 0,
      avgToolsPerTrial:
        totalTrials > 0
          ? Math.round((totalToolCalls / totalTrials) * 10) / 10
          : 0,
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

interface SessionData {
  createdAt: Date;
  chatsUsed: number;
  voiceSecondsUsed: number;
  toolsUsed: number;
}

interface DailyData {
  trials: number;
  chats: number;
  voiceMinutes: number;
  tools: number;
}

function getDailyBreakdown(
  sessions: SessionData[],
): Array<{ date: string } & DailyData> {
  const breakdown: Record<string, DailyData> = {};

  for (const session of sessions) {
    const date = session.createdAt.toISOString().split("T")[0];
    if (!breakdown[date]) {
      breakdown[date] = { trials: 0, chats: 0, voiceMinutes: 0, tools: 0 };
    }
    breakdown[date].trials++;
    breakdown[date].chats += session.chatsUsed;
    breakdown[date].voiceMinutes += Math.round(session.voiceSecondsUsed / 60);
    breakdown[date].tools += session.toolsUsed;
  }

  return Object.entries(breakdown)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Admin-only endpoint
export const GET = withAdmin(getTrialAnalytics);

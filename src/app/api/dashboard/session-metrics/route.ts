// ============================================================================
// API ROUTE: Session Metrics Analytics
// GET: Session cost, safety, and behavioral metrics for dashboard
// SECURITY: Requires authentication
// DATA: All metrics from REAL API responses, not estimates
// ============================================================================

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { validateAuth } from "@/lib/auth/session-auth";
import {
  getCostStats,
  PRICING,
  THRESHOLDS,
} from "@/lib/metrics/cost-tracking-service";

export async function GET(request: Request) {
  try {
    const auth = await validateAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") ?? "7", 10);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get aggregate session metrics
    const aggregates = await prisma.sessionMetrics.aggregate({
      where: { createdAt: { gte: startDate } },
      _sum: {
        turnCount: true,
        tokensIn: true,
        tokensOut: true,
        voiceMinutes: true,
        costEur: true,
        refusalCount: true,
        refusalCorrect: true,
        stuckLoopCount: true,
        jailbreakAttempts: true,
      },
      _avg: {
        avgTurnLatencyMs: true,
        costEur: true,
        turnCount: true,
      },
      _count: true,
    });

    // Get outcome distribution
    const outcomes = await prisma.sessionMetrics.groupBy({
      by: ["outcome"],
      where: { createdAt: { gte: startDate } },
      _count: true,
    });

    // Get severity distribution
    const severities = await prisma.sessionMetrics.groupBy({
      by: ["incidentSeverity"],
      where: {
        createdAt: { gte: startDate },
        incidentSeverity: { not: null },
      },
      _count: true,
    });

    // Get daily metrics
    const dailyMetrics = await prisma.$queryRaw<
      Array<{
        date: string;
        sessions: number;
        totalCost: number;
        totalTokens: number;
      }>
    >`
      SELECT
        DATE(created_at) as date,
        COUNT(*)::int as sessions,
        COALESCE(SUM(cost_eur), 0)::float as "totalCost",
        COALESCE(SUM(tokens_in + tokens_out), 0)::int as "totalTokens"
      FROM session_metrics
      WHERE created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    // Get cost stats with P95
    const costStats = await getCostStats(startDate, new Date());

    // Build outcome distribution map
    const outcomeDistribution: Record<string, number> = {};
    for (const o of outcomes) {
      outcomeDistribution[o.outcome] = o._count;
    }

    // Build severity distribution map
    const severityDistribution: Record<string, number> = {};
    for (const s of severities) {
      if (s.incidentSeverity) {
        severityDistribution[s.incidentSeverity] = s._count;
      }
    }

    // Build daily breakdown
    const dailyBreakdown: Record<
      string,
      { sessions: number; cost: number; tokens: number }
    > = {};
    for (const d of dailyMetrics) {
      const day =
        typeof d.date === "string"
          ? d.date.split("T")[0]
          : new Date(d.date).toISOString().split("T")[0];
      dailyBreakdown[day] = {
        sessions: d.sessions,
        cost: Math.round(d.totalCost * 1000) / 1000,
        tokens: d.totalTokens,
      };
    }

    // Calculate refusal accuracy
    const totalRefusals = aggregates._sum.refusalCount || 0;
    const correctRefusals = aggregates._sum.refusalCorrect || 0;
    const refusalAccuracy =
      totalRefusals > 0
        ? Math.round((correctRefusals / totalRefusals) * 100)
        : 100;

    return NextResponse.json({
      period: { days, startDate: startDate.toISOString() },
      summary: {
        totalSessions: aggregates._count,
        totalTurns: aggregates._sum.turnCount || 0,
        avgTurnsPerSession: Math.round(aggregates._avg.turnCount || 0),
        avgLatencyMs: Math.round(aggregates._avg.avgTurnLatencyMs || 0),
      },
      tokens: {
        totalIn: aggregates._sum.tokensIn || 0,
        totalOut: aggregates._sum.tokensOut || 0,
        total:
          (aggregates._sum.tokensIn || 0) + (aggregates._sum.tokensOut || 0),
      },
      cost: {
        totalEur: Math.round((aggregates._sum.costEur || 0) * 100) / 100,
        avgPerSession: Math.round((aggregates._avg.costEur || 0) * 1000) / 1000,
        p95PerSession: costStats.p95Cost,
        voiceMinutes: Math.round((aggregates._sum.voiceMinutes || 0) * 10) / 10,
        thresholds: {
          textWarn: THRESHOLDS.SESSION_TEXT_WARN,
          textLimit: THRESHOLDS.SESSION_TEXT_LIMIT,
          voiceWarn: THRESHOLDS.SESSION_VOICE_WARN,
          voiceLimit: THRESHOLDS.SESSION_VOICE_LIMIT,
        },
        pricing: {
          textPer1kTokens: PRICING.TEXT_PER_1K_TOKENS,
          voicePerMin: PRICING.VOICE_REALTIME_PER_MIN,
        },
      },
      safety: {
        totalRefusals,
        correctRefusals,
        refusalAccuracy,
        jailbreakAttempts: aggregates._sum.jailbreakAttempts || 0,
        stuckLoops: aggregates._sum.stuckLoopCount || 0,
        severityDistribution,
      },
      outcomes: outcomeDistribution,
      dailyBreakdown,
    });
  } catch (error) {
    logger.error("Dashboard session-metrics error", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to fetch session metrics" },
      { status: 500 },
    );
  }
}

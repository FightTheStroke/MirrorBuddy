// ============================================================================
// API ROUTE: Session Metrics Analytics
// GET: Session cost, safety, and behavioral metrics for dashboard
// SECURITY: Requires authentication
// DATA: All metrics from REAL API responses, not estimates
// ============================================================================

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { pipe, withSentry, withAuth } from "@/lib/api/middlewares";
import {
  getCostStats,
  PRICING,
  THRESHOLDS,
} from "@/lib/metrics/cost-tracking-service";

export const GET = pipe(
  withSentry("/api/dashboard/session-metrics"),
  withAuth,
)(async (ctx) => {
  const { searchParams } = new URL(ctx.req.url);
  const days = parseInt(searchParams.get("days") ?? "7", 10);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // F-06: Exclude test data from statistics
  // Get aggregate session metrics (only real data)
  const aggregates = await prisma.sessionMetrics.aggregate({
    where: { createdAt: { gte: startDate }, isTestData: false },
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

  // Get outcome distribution (F-06: exclude test data)
  const outcomes = await prisma.sessionMetrics.groupBy({
    by: ["outcome"],
    where: { createdAt: { gte: startDate }, isTestData: false },
    _count: true,
  });

  // Get severity distribution (F-06: exclude test data)
  const severities = await prisma.sessionMetrics.groupBy({
    by: ["incidentSeverity"],
    where: {
      createdAt: { gte: startDate },
      incidentSeverity: { not: null },
      isTestData: false,
    },
    _count: true,
  });

  // Get daily metrics using Prisma groupBy instead of raw SQL for portability
  // F-06: exclude test data
  const dailyGrouped = await prisma.sessionMetrics.groupBy({
    by: ["createdAt"],
    where: { createdAt: { gte: startDate }, isTestData: false },
    _count: true,
    _sum: { costEur: true, tokensIn: true, tokensOut: true },
  });

  // Aggregate by date
  const dailyMetricsMap = new Map<
    string,
    { sessions: number; totalCost: number; totalTokens: number }
  >();
  for (const row of dailyGrouped) {
    const dateKey = row.createdAt.toISOString().split("T")[0];
    const existing = dailyMetricsMap.get(dateKey) || {
      sessions: 0,
      totalCost: 0,
      totalTokens: 0,
    };
    dailyMetricsMap.set(dateKey, {
      sessions: existing.sessions + row._count,
      totalCost: existing.totalCost + (row._sum.costEur || 0),
      totalTokens:
        existing.totalTokens +
        (row._sum.tokensIn || 0) +
        (row._sum.tokensOut || 0),
    });
  }
  const dailyMetrics = Array.from(dailyMetricsMap.entries()).map(
    ([date, data]) => ({
      date,
      sessions: data.sessions,
      totalCost: data.totalCost,
      totalTokens: data.totalTokens,
    }),
  );

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
      total: (aggregates._sum.tokensIn || 0) + (aggregates._sum.tokensOut || 0),
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
});

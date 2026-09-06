// ============================================================================
// API ROUTE: Session Metrics Analytics
// GET: Session cost, safety, and behavioral metrics for dashboard
// SECURITY: Requires admin read access (ADMIN or ADMIN_READONLY)
// Recorded optional telemetry; cost uses pricing estimates, not a billing ledger.
// ============================================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { pipe, withSentry, withAdminReadOnly } from '@/lib/api/middlewares';
import { getCostStats, PRICING, THRESHOLDS } from '@/lib/metrics/cost-tracking-service';
import { analyticsContext, withMetricTruth } from '@/lib/admin/analytics-metric-truth';

export const revalidate = 0;
export const GET = pipe(
  withSentry('/api/dashboard/session-metrics'),
  withAdminReadOnly,
)(async (ctx) => {
  const { searchParams } = new URL(ctx.req.url);
  const days = Number(searchParams.get('days') ?? '7');
  if (!Number.isInteger(days) || days < 1 || days > 365) {
    return NextResponse.json({ error: 'Invalid days' }, { status: 400 });
  }
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days);

  // F-06: Exclude test data from statistics
  // Get aggregate session metrics (only real data)
  const aggregates = await prisma.sessionMetrics.aggregate({
    where: { createdAt: { gte: startDate, lte: endDate }, isTestData: false },
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
    by: ['outcome'],
    where: { createdAt: { gte: startDate, lte: endDate }, isTestData: false },
    _count: true,
  });

  // Get severity distribution (F-06: exclude test data)
  const severities = await prisma.sessionMetrics.groupBy({
    by: ['incidentSeverity'],
    where: {
      createdAt: { gte: startDate, lte: endDate },
      incidentSeverity: { not: null },
      isTestData: false,
    },
    _count: true,
  });

  // Get daily metrics using Prisma groupBy instead of raw SQL for portability
  // F-06: exclude test data
  const dailyGrouped = await prisma.sessionMetrics.groupBy({
    by: ['createdAt'],
    where: { createdAt: { gte: startDate, lte: endDate }, isTestData: false },
    _count: true,
    _sum: { costEur: true, tokensIn: true, tokensOut: true },
  });

  // Aggregate by date
  const dailyMetricsMap = new Map<
    string,
    { sessions: number; totalCost: number | null; totalTokens: number }
  >();
  for (const row of dailyGrouped) {
    const dateKey = row.createdAt.toISOString().split('T')[0];
    const existing = dailyMetricsMap.get(dateKey) || {
      sessions: 0,
      totalCost: 0,
      totalTokens: 0,
    };
    dailyMetricsMap.set(dateKey, {
      sessions: existing.sessions + row._count,
      totalCost:
        existing.totalCost === null || row._sum.costEur == null
          ? null
          : existing.totalCost + row._sum.costEur,
      totalTokens: existing.totalTokens + (row._sum.tokensIn || 0) + (row._sum.tokensOut || 0),
    });
  }
  const dailyMetrics = Array.from(dailyMetricsMap.entries()).map(([date, data]) => ({
    date,
    sessions: data.sessions,
    totalCost: data.totalCost,
    totalTokens: data.totalTokens,
  }));

  // Get cost stats with P95
  const costStats = await getCostStats(startDate, endDate, true);

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
  const dailyBreakdown: Record<string, { sessions: number; cost: number | null; tokens: number }> =
    {};
  for (const d of dailyMetrics) {
    const day =
      typeof d.date === 'string'
        ? d.date.split('T')[0]
        : new Date(d.date).toISOString().split('T')[0];
    dailyBreakdown[day] = {
      sessions: d.sessions,
      cost: d.totalCost === null ? null : Math.round(d.totalCost * 1000) / 1000,
      tokens: d.totalTokens,
    };
  }

  // Calculate refusal accuracy
  const sum = (value: number | null) => (aggregates._count === 0 ? 0 : value);
  const rounded = (value: number | null, factor: number) =>
    value === null ? null : Math.round(value * factor) / factor;
  const totalRefusals = sum(aggregates._sum.refusalCount);
  const correctRefusals = sum(aggregates._sum.refusalCorrect);
  const refusalAccuracy =
    totalRefusals !== null && totalRefusals > 0 && correctRefusals !== null
      ? Math.round((correctRefusals / totalRefusals) * 100)
      : null;
  const tokensIn = sum(aggregates._sum.tokensIn);
  const tokensOut = sum(aggregates._sum.tokensOut);

  const payload = {
    period: { days, startDate: startDate.toISOString() },
    summary: {
      totalSessions: aggregates._count,
      totalTurns: sum(aggregates._sum.turnCount),
      avgTurnsPerSession:
        aggregates._avg.turnCount == null ? null : Math.round(aggregates._avg.turnCount),
      avgLatencyMs:
        aggregates._avg.avgTurnLatencyMs == null
          ? null
          : Math.round(aggregates._avg.avgTurnLatencyMs),
    },
    tokens: {
      totalIn: tokensIn,
      totalOut: tokensOut,
      total: tokensIn === null || tokensOut === null ? null : tokensIn + tokensOut,
    },
    cost: {
      totalEur: rounded(sum(aggregates._sum.costEur), 100),
      avgPerSession:
        aggregates._avg.costEur == null ? null : Math.round(aggregates._avg.costEur * 1000) / 1000,
      p95PerSession:
        aggregates._count === 0 || costStats.sessionCount === 0 ? null : costStats.p95Cost,
      voiceMinutes: rounded(sum(aggregates._sum.voiceMinutes), 10),
      voiceCostEur: rounded(
        aggregates._sum.voiceMinutes === null
          ? aggregates._count === 0
            ? 0
            : null
          : aggregates._sum.voiceMinutes * PRICING.VOICE_REALTIME_PER_MIN,
        100,
      ),
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
      jailbreakAttempts: sum(aggregates._sum.jailbreakAttempts),
      stuckLoops: sum(aggregates._sum.stuckLoopCount),
      severityDistribution,
    },
    outcomes: outcomeDistribution,
    dailyBreakdown,
  };
  const costContext = { estimate: 'tokenPricing' as const };
  return NextResponse.json(
    withMetricTruth(
      payload,
      analyticsContext('SessionMetrics (isTestData=false)', startDate, endDate),
      {
        ...Object.fromEntries(
          Object.keys(dailyBreakdown).map((date) => [`dailyBreakdown.${date}.cost`, costContext]),
        ),
        'cost.totalEur': costContext,
        'cost.voiceCostEur': costContext,
        'cost.avgPerSession': {
          ...costContext,
          reason: aggregates._count === 0 ? 'zeroDenominator' : null,
        },
        'cost.p95PerSession': {
          ...costContext,
          reason:
            aggregates._count === 0 || costStats.sessionCount === 0 ? 'zeroDenominator' : null,
        },
        'safety.refusalAccuracy': { reason: totalRefusals === 0 ? 'zeroDenominator' : null },
      },
    ),
  );
});

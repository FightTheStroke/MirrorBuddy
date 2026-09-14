// ============================================================================
// API ROUTE: Token Usage Analytics
// GET: AI token usage statistics for dashboard
// DATA: Uses SessionMetrics table (real token counts from API responses)
// SECURITY: Requires admin authentication
// ============================================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { pipe, withSentry, withAdmin } from '@/lib/api/middlewares';
import { analyticsContext, withMetricTruth } from '@/lib/admin/analytics-metric-truth';

export const revalidate = 0;
export const GET = pipe(
  withSentry('/api/dashboard/token-usage'),
  withAdmin,
)(async (ctx) => {
  const { searchParams } = new URL(ctx.req.url);
  const days = Number(searchParams.get('days') ?? '7');
  if (!Number.isInteger(days) || days < 1 || days > 365) {
    return NextResponse.json({ error: 'Invalid days' }, { status: 400 });
  }
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days);

  // F-06: Exclude test data from token usage statistics
  // Query SessionMetrics which stores real token counts from API responses
  const aggregates = await prisma.sessionMetrics.aggregate({
    where: { createdAt: { gte: startDate, lte: endDate }, isTestData: false },
    _sum: { tokensIn: true, tokensOut: true, costEur: true },
    _count: true,
  });

  const totalTokensIn = aggregates._count === 0 ? 0 : aggregates._sum.tokensIn;
  const totalTokensOut = aggregates._count === 0 ? 0 : aggregates._sum.tokensOut;
  const totalTokens =
    totalTokensIn === null || totalTokensOut === null ? null : totalTokensIn + totalTokensOut;
  const totalCalls = aggregates._count;
  const totalCostEur = aggregates._count === 0 ? 0 : aggregates._sum.costEur;

  // Daily breakdown from SessionMetrics
  const dailyGrouped = await prisma.sessionMetrics.groupBy({
    by: ['createdAt'],
    where: { createdAt: { gte: startDate, lte: endDate }, isTestData: false },
    _sum: { tokensIn: true, tokensOut: true, costEur: true },
    _count: true,
  });

  const dailyUsage: Record<string, number> = {};
  const dailyCost: Record<string, number | null> = {};
  for (const row of dailyGrouped) {
    const day = row.createdAt.toISOString().split('T')[0];
    const tokens = (row._sum.tokensIn || 0) + (row._sum.tokensOut || 0);
    dailyUsage[day] = (dailyUsage[day] || 0) + tokens;
    dailyCost[day] =
      dailyCost[day] === null || row._sum.costEur == null
        ? null
        : (dailyCost[day] ?? 0) + row._sum.costEur;
  }

  return NextResponse.json(
    withMetricTruth(
      {
        period: { days, startDate: startDate.toISOString() },
        summary: {
          totalTokens,
          totalTokensIn,
          totalTokensOut,
          totalCalls,
          avgTokensPerCall:
            totalCalls > 0 && totalTokens !== null ? Math.round(totalTokens / totalCalls) : null,
          totalCostEur: totalCostEur === null ? null : Math.round(totalCostEur * 100) / 100,
        },
        dailyUsage,
        dailyCost,
      },
      analyticsContext('SessionMetrics (isTestData=false)', startDate, endDate),
      {
        ...Object.fromEntries(
          Object.keys(dailyCost).map((date) => [
            `dailyCost.${date}`,
            { estimate: 'tokenPricing' as const },
          ]),
        ),
        'summary.totalCostEur': { estimate: 'tokenPricing' },
        'summary.avgTokensPerCall': { reason: totalCalls === 0 ? 'zeroDenominator' : null },
      },
    ),
  );
});

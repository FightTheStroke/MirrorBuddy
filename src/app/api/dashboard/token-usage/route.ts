// ============================================================================
// API ROUTE: Token Usage Analytics
// GET: AI token usage statistics for dashboard
// DATA: Uses SessionMetrics table (real token counts from API responses)
// SECURITY: Requires admin authentication
// ============================================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { pipe, withSentry, withAdmin } from '@/lib/api/middlewares';

export const GET = pipe(
  withSentry('/api/dashboard/token-usage'),
  withAdmin,
)(async (ctx) => {
  const { searchParams } = new URL(ctx.req.url);
  const days = parseInt(searchParams.get('days') ?? '7', 10);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // F-06: Exclude test data from token usage statistics
  // Query SessionMetrics which stores real token counts from API responses
  const aggregates = await prisma.sessionMetrics.aggregate({
    where: { createdAt: { gte: startDate }, isTestData: false },
    _sum: { tokensIn: true, tokensOut: true, costEur: true },
    _count: true,
  });

  const totalTokensIn = aggregates._sum.tokensIn || 0;
  const totalTokensOut = aggregates._sum.tokensOut || 0;
  const totalTokens = totalTokensIn + totalTokensOut;
  const totalCalls = aggregates._count;
  const totalCostEur = aggregates._sum.costEur || 0;

  // Daily breakdown from SessionMetrics
  const dailyGrouped = await prisma.sessionMetrics.groupBy({
    by: ['createdAt'],
    where: { createdAt: { gte: startDate }, isTestData: false },
    _sum: { tokensIn: true, tokensOut: true, costEur: true },
    _count: true,
  });

  const dailyUsage: Record<string, number> = {};
  const dailyCost: Record<string, number> = {};
  for (const row of dailyGrouped) {
    const day = row.createdAt.toISOString().split('T')[0];
    const tokens = (row._sum.tokensIn || 0) + (row._sum.tokensOut || 0);
    dailyUsage[day] = (dailyUsage[day] || 0) + tokens;
    dailyCost[day] = (dailyCost[day] || 0) + (row._sum.costEur || 0);
  }

  return NextResponse.json({
    period: { days, startDate: startDate.toISOString() },
    summary: {
      totalTokens,
      totalTokensIn,
      totalTokensOut,
      totalCalls,
      avgTokensPerCall: totalCalls > 0 ? Math.round(totalTokens / totalCalls) : 0,
      totalCostEur: Math.round(totalCostEur * 100) / 100,
    },
    dailyUsage,
    dailyCost,
  });
});

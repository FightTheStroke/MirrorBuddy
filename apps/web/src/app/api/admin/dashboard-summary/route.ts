import { NextResponse } from 'next/server';
import { pipe, withSentry, withAdminReadOnly } from '@/lib/api/middlewares';
import { prisma } from '@/lib/db';
import { aggregateHealth } from '@/lib/admin/health-aggregator';
import { getBusinessKPIs } from '@/lib/admin/business-kpi-service';
import { metricTruth, snapshotContext } from '@/lib/admin/metric-truth';
import { readMetric } from '@/lib/admin/metric-truth-reader';
import type { DashboardSummary } from '@/lib/admin/dashboard-summary-types';

const CACHE_TTL_MS = 30_000;
const COST_WINDOW_MS = 7 * 86_400_000;
let cache: { data: DashboardSummary; timestamp: number } | null = null;

export function clearDashboardSummaryCache(): void {
  cache = null;
}

export const revalidate = 0;
export const GET = pipe(
  withSentry('/api/admin/dashboard-summary'),
  withAdminReadOnly,
)(async () => {
  const now = Date.now();
  if (cache && now - cache.timestamp < CACHE_TTL_MS) return NextResponse.json(cache.data);
  const computedAt = new Date(now).toISOString();
  const startDate = new Date(now - COST_WINDOW_MS);
  const [health, safety, cost, business] = await Promise.all([
    aggregateHealth(),
    readMetric(
      () => prisma.safetyEvent.count({ where: { resolvedAt: null } }),
      snapshotContext('SafetyEvent (unresolved)', computedAt),
    ),
    readMetric(
      async () => {
        const result = await prisma.sessionMetrics.aggregate({
          where: { createdAt: { gte: startDate, lte: new Date(now) }, isTestData: false },
          _sum: { costEur: true },
          _count: true,
        });
        return result?._count === 0 ? 0 : result?._sum.costEur;
      },
      {
        source: 'SessionMetrics.costEur',
        window: { start: startDate.toISOString(), end: computedAt },
        computedAt,
        population: 'recordedTelemetry',
        estimate: 'tokenPricing',
      },
    ),
    getBusinessKPIs(),
  ]);
  const healthContext = snapshotContext('Service health checks', health.checkedAt.toISOString());
  const dailyCost = { ...cost, value: cost.value === null ? null : cost.value / 7 };
  const summary: DashboardSummary = {
    health: {
      overallStatus: health.overallStatus,
      servicesDownCount: health.services.filter((service) => service.status === 'down').length,
    },
    safety: { unresolvedCount: safety.value },
    cost: { totalEur: cost.value },
    business: {
      mrr: business.revenue.mrr,
      trialConversionRate: business.users.trialConversionRate,
      churnRate: business.users.churnRate,
    },
    metrics: {
      health: metricTruth(health.overallStatus, healthContext),
      servicesDown: metricTruth(
        health.services.filter((service) => service.status === 'down').length,
        healthContext,
      ),
      safety,
      cost,
      dailyCost,
      mrr: business.metrics.mrr,
      trialConversionRate: business.metrics.trialConversionRate,
      churnRate: business.metrics.churnRate,
    },
    generatedAt: computedAt,
  };
  cache = { data: summary, timestamp: now };
  return NextResponse.json(summary);
});

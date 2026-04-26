import { NextResponse } from 'next/server';
import { pipe, withSentry, withAdminReadOnly } from '@/lib/api/middlewares';
import { prisma } from '@/lib/db';
import { aggregateHealth } from '@/lib/admin/health-aggregator';
import { getBusinessKPIs } from '@/lib/admin/business-kpi-service';
import type { DashboardSummary } from '@/lib/admin/dashboard-summary-types';

const CACHE_TTL_MS = 30_000;
const COST_WINDOW_DAYS = 7;

type SessionCostAggregateResult = {
  _sum: { totalEur: number | null };
};

type SessionCostDelegate = {
  aggregate: (args: {
    where: { createdAt: { gte: Date } };
    _sum: { totalEur: true };
  }) => Promise<SessionCostAggregateResult>;
};

type SessionMetricsDelegate = {
  aggregate: (args: {
    where: { createdAt: { gte: Date } };
    _sum: { costEur: true };
  }) => Promise<{ _sum: { costEur: number | null } }>;
};

interface CachedDashboardSummary {
  data: DashboardSummary;
  timestamp: number;
}

let cache: CachedDashboardSummary | null = null;

async function getSessionCostTotalEur(): Promise<number> {
  const startDate = new Date(Date.now() - COST_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const prismaWithCostModels = prisma as unknown as {
    sessionCost?: SessionCostDelegate;
    sessionMetrics?: SessionMetricsDelegate;
  };

  if (prismaWithCostModels.sessionCost) {
    const result = await prismaWithCostModels.sessionCost.aggregate({
      where: { createdAt: { gte: startDate } },
      _sum: { totalEur: true },
    });
    return result._sum.totalEur ?? 0;
  }

  if (prismaWithCostModels.sessionMetrics) {
    const fallback = await prismaWithCostModels.sessionMetrics.aggregate({
      where: { createdAt: { gte: startDate } },
      _sum: { costEur: true },
    });
    return fallback._sum.costEur ?? 0;
  }

  throw new Error('No session cost model is available on Prisma client');
}

function buildSummary(data: {
  health: Awaited<ReturnType<typeof aggregateHealth>>;
  unresolvedSafetyCount: number;
  sessionCostTotalEur: number;
  businessKPIs: Awaited<ReturnType<typeof getBusinessKPIs>>;
}): DashboardSummary {
  return {
    health: {
      overallStatus: data.health.overallStatus,
      servicesDownCount: data.health.services.filter((service) => service.status === 'down').length,
    },
    safety: {
      unresolvedCount: data.unresolvedSafetyCount,
    },
    cost: {
      totalEur: Math.round(data.sessionCostTotalEur * 100) / 100,
    },
    business: {
      mrr: data.businessKPIs.revenue.mrr,
      trialConversionRate: data.businessKPIs.users.trialConversionRate,
      churnRate: data.businessKPIs.users.churnRate,
    },
    generatedAt: new Date().toISOString(),
  };
}

export function clearDashboardSummaryCache(): void {
  cache = null;
}

export const revalidate = 0;
export const GET = pipe(
  withSentry('/api/admin/dashboard-summary'),
  withAdminReadOnly,
)(async () => {
  const now = Date.now();
  if (cache && now - cache.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cache.data);
  }

  const [health, unresolvedSafetyCount, sessionCostTotalEur, businessKPIs] = await Promise.all([
    aggregateHealth(),
    prisma.safetyEvent.count({ where: { resolvedAt: null } }),
    getSessionCostTotalEur(),
    getBusinessKPIs(),
  ]);

  const summary = buildSummary({
    health,
    unresolvedSafetyCount,
    sessionCostTotalEur,
    businessKPIs,
  });
  cache = { data: summary, timestamp: now };

  return NextResponse.json(summary);
});

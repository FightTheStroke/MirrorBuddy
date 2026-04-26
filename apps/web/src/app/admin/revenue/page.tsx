// Mark as dynamic to avoid static generation issues
export const dynamic = 'force-dynamic';

import { validateAdminAuth } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { RevenueDashboardUI } from './revenue-dashboard-ui';

export const metadata = {
  title: 'Revenue Dashboard | Admin',
};

interface RevenueMetrics {
  mrr: number;
  arr: number;
  activeSubscriptions: number;
  proSubscriptions: number;
  baseSubscriptions: number;
  trialUsers: number;
  churnRate: number;
  avgLTV: number;
  revenueByCountry: { country: string; revenue: number }[];
  monthlyTrend: { month: string; mrr: number; subscribers: number }[];
  recentActivity: {
    type: 'upgrade' | 'downgrade' | 'new' | 'churn';
    userId: string;
    date: Date;
    from?: string;
    to?: string;
  }[];
}

async function getRevenueMetrics(): Promise<RevenueMetrics> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Active subscriptions by tier
  const [proCount, baseCount, trialCount, totalActive] = await Promise.all([
    prisma.userSubscription.count({
      where: { status: 'ACTIVE', tier: { code: 'pro' } },
    }),
    prisma.userSubscription.count({
      where: { status: 'ACTIVE', tier: { code: 'base' } },
    }),
    prisma.userSubscription.count({
      where: { status: 'TRIAL' },
    }),
    prisma.userSubscription.count({
      where: { status: 'ACTIVE' },
    }),
  ]);

  // Get Pro tier price
  const proTier = await prisma.tierDefinition.findFirst({
    where: { code: 'pro' },
    select: { monthlyPriceEur: true },
  });
  const proPrice = proTier?.monthlyPriceEur ? Number(proTier.monthlyPriceEur) : 9.99;

  const mrr = proCount * proPrice;
  const arr = mrr * 12;

  // Churn: cancelled in last 30 days / active at start of period
  const cancelledLast30Days = await prisma.userSubscription.count({
    where: {
      status: 'CANCELLED',
      updatedAt: { gte: thirtyDaysAgo },
    },
  });

  const activeAtPeriodStart = totalActive + cancelledLast30Days;
  const churnRate =
    activeAtPeriodStart > 0
      ? Math.round((cancelledLast30Days / activeAtPeriodStart) * 100 * 10) / 10
      : 0;

  // LTV = ARPU / Churn Rate (simplified)
  const arpu = totalActive > 0 ? mrr / totalActive : 0;
  const avgLTV = churnRate > 0 ? Math.round((arpu / (churnRate / 100)) * 100) / 100 : arpu * 12;

  // Revenue by country from actual subscription + user language data
  const revenueByLocale = await prisma.$queryRaw<Array<{ language: string; revenue: number }>>`
    SELECT COALESCE(s.language, 'it') as language,
           COALESCE(SUM(CAST(td."monthlyPriceEur" AS DECIMAL)), 0) as revenue
    FROM "UserSubscription" us
    JOIN "TierDefinition" td ON us."tierId" = td.id
    LEFT JOIN "Settings" s ON us."userId" = s."userId"
    WHERE us.status = 'ACTIVE'
    GROUP BY COALESCE(s.language, 'it')
    ORDER BY revenue DESC
  `;

  const localeToCountry: Record<string, string> = {
    it: 'IT',
    en: 'GB',
    fr: 'FR',
    de: 'DE',
    es: 'ES',
  };
  const revenueByCountry = revenueByLocale.map((r) => ({
    country: localeToCountry[r.language] || 'Other',
    revenue: Number(r.revenue),
  }));

  // Monthly trend (last 6 months)
  const monthlyTrend: { month: string; mrr: number; subscribers: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const monthLabel = monthDate.toLocaleDateString('en', {
      month: 'short',
      year: '2-digit',
    });

    const subsAtMonth = await prisma.userSubscription.count({
      where: {
        status: 'ACTIVE',
        tier: { code: 'pro' },
        startedAt: { lte: monthEnd },
      },
    });

    monthlyTrend.push({
      month: monthLabel,
      mrr: subsAtMonth * proPrice,
      subscribers: subsAtMonth,
    });
  }

  // Recent activity (upgrades/downgrades)
  const recentLogs = await prisma.tierAuditLog.findMany({
    where: {
      action: {
        in: ['TIER_CHANGE', 'SUBSCRIPTION_CREATE', 'SUBSCRIPTION_DELETE'],
      },
      createdAt: { gte: thirtyDaysAgo },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  const recentActivity = recentLogs.map((log) => {
    const changes = log.changes as Record<string, unknown>;
    return {
      type: (log.action === 'SUBSCRIPTION_DELETE'
        ? 'churn'
        : log.action === 'SUBSCRIPTION_CREATE'
          ? 'new'
          : changes?.to === 'pro'
            ? 'upgrade'
            : 'downgrade') as 'upgrade' | 'downgrade' | 'new' | 'churn',
      userId: log.userId || 'unknown',
      date: log.createdAt,
      from: changes?.from as string | undefined,
      to: changes?.to as string | undefined,
    };
  });

  return {
    mrr,
    arr,
    activeSubscriptions: totalActive,
    proSubscriptions: proCount,
    baseSubscriptions: baseCount,
    trialUsers: trialCount,
    churnRate,
    avgLTV,
    revenueByCountry,
    monthlyTrend,
    recentActivity,
  };
}

export default async function RevenueDashboardPage() {
  const auth = await validateAdminAuth();
  if (!auth.authenticated || !auth.isAdmin) {
    redirect('/login');
  }

  const metrics = await getRevenueMetrics();

  return <RevenueDashboardUI metrics={metrics} />;
}

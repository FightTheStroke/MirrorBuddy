'use client';

import { useTranslations } from 'next-intl';
import {
  UserPlus,
  Users,
  Activity,
  AlertTriangle,
  Bug,
  DollarSign,
  TrendingUp,
  Percent,
} from 'lucide-react';
import { KpiCard } from '@/components/admin/kpi-card';
import { Skeleton } from '@/components/ui/skeleton';
import type { DashboardSummary } from '@/lib/admin/dashboard-summary-types';

interface AdminCounts {
  pendingInvites: number;
  totalUsers: number;
  activeUsers24h: number;
  systemAlerts: number;
}

interface DashboardKpiGridProps {
  counts: AdminCounts;
  sentryErrorCount: number;
  summary: DashboardSummary | null;
}

const SENTRY_ISSUES_URL = 'https://fightthestroke.sentry.io/issues/?query=is%3Aunresolved';

export function DashboardKpiGrid({ counts, sentryErrorCount, summary }: DashboardKpiGridProps) {
  const t = useTranslations('admin.dashboard');

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
      <KpiCard
        title={t('betaRequests')}
        value={counts.pendingInvites}
        subValue={t('pendingApproval')}
        icon={UserPlus}
        href="/admin/invites"
        badge={counts.pendingInvites}
        badgeColor="amber"
        color="purple"
      />
      <KpiCard
        title={t('totalUsers')}
        value={counts.totalUsers}
        subValue={t('registeredUsers')}
        icon={Users}
        href="/admin/users"
        color="blue"
      />
      <KpiCard
        title={t('activeUsers')}
        value={counts.activeUsers24h}
        subValue={t('last24h')}
        icon={Activity}
        href="/admin/analytics"
        color="green"
      />
      <KpiCard
        title={t('systemAlerts')}
        value={counts.systemAlerts}
        subValue={t('unresolvedCritical')}
        icon={AlertTriangle}
        badge={counts.systemAlerts}
        badgeColor={counts.systemAlerts ? 'red' : 'green'}
        color={counts.systemAlerts ? 'red' : 'green'}
      />
      <KpiCard
        title={t('sentryErrors')}
        value={sentryErrorCount}
        subValue={t('unresolved')}
        icon={Bug}
        href={SENTRY_ISSUES_URL}
        badge={sentryErrorCount}
        badgeColor={sentryErrorCount > 0 ? 'red' : 'green'}
        color={sentryErrorCount > 0 ? 'orange' : 'green'}
        external
      />
      {summary ? (
        <>
          <KpiCard
            title={t('kpi.mrr')}
            value={`€${summary.business.mrr.toFixed(0)}`}
            icon={TrendingUp}
            href="/admin/revenue"
            color="green"
          />
          <KpiCard
            title={t('kpi.dailyCost')}
            value={`€${(summary.cost.totalEur / 7).toFixed(2)}`}
            subValue={t('dailyAvgEur')}
            icon={DollarSign}
            href="/admin/analytics"
            color={summary.cost.totalEur / 7 > 3 ? 'amber' : 'green'}
          />
          <KpiCard
            title={t('kpi.trialConversion')}
            value={`${(summary.business.trialConversionRate * 100).toFixed(1)}%`}
            icon={Percent}
            href="/admin/tiers/conversion-funnel"
            color="blue"
          />
        </>
      ) : (
        <>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[104px] rounded-xl" />
          ))}
        </>
      )}
    </div>
  );
}

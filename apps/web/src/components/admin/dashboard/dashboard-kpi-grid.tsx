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
import { metricTruth, snapshotContext, type MetricTruth } from '@/lib/admin/metric-truth';
import type { AdminCounts } from '@/lib/admin/admin-counts-service';
import type { DashboardSummary } from '@/lib/admin/dashboard-summary-types';

interface DashboardKpiGridProps {
  counts: AdminCounts;
  sentryMetric?: MetricTruth | null;
  summary: DashboardSummary | null;
}

export function DashboardKpiGrid({ counts, sentryMetric, summary }: DashboardKpiGridProps) {
  const t = useTranslations('admin.dashboard');
  const missing = (source: string) => metricTruth<number>(null, snapshotContext(source, null));
  const activity =
    counts.metrics?.activeUsers24h ??
    metricTruth<number>(null, {
      ...snapshotContext('UserActivity', counts.timestamp || null),
      reason: 'retentionWindow',
    });
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
      <KpiCard
        title={t('betaRequests')}
        value=""
        metric={counts.metrics?.pendingInvites ?? missing('InviteRequest')}
        subValue={t('pendingApproval')}
        icon={UserPlus}
        href="/admin/invites"
        color="purple"
      />
      <KpiCard
        title={t('totalUsers')}
        value=""
        metric={counts.metrics?.totalUsers ?? missing('User')}
        subValue={t('registeredUsers')}
        icon={Users}
        href="/admin/users"
        color="blue"
      />
      <KpiCard
        title={t('activeUsers')}
        value=""
        metric={activity}
        subValue={t('last24h')}
        icon={Activity}
        href="/admin/analytics"
        color="green"
      />
      <KpiCard
        title={t('systemAlerts')}
        value=""
        metric={counts.metrics?.systemAlerts ?? missing('SafetyEvent')}
        subValue={t('unresolvedCritical')}
        icon={AlertTriangle}
        color="amber"
      />
      <KpiCard
        title={t('sentryErrors')}
        value=""
        metric={sentryMetric ?? missing('Sentry issues')}
        subValue={t('unresolved')}
        icon={Bug}
        color="orange"
        external
        href="https://fightthestroke.sentry.io/issues/?query=is%3Aunresolved"
      />
      <KpiCard
        title={t('kpi.mrr')}
        value=""
        metric={summary?.metrics?.mrr ?? missing('UserSubscription')}
        format={(value) => `€${value.toFixed(0)}`}
        icon={TrendingUp}
        href="/admin/revenue"
        color="green"
      />
      <KpiCard
        title={t('kpi.dailyCost')}
        value=""
        metric={summary?.metrics?.dailyCost ?? missing('SessionMetrics')}
        format={(value) => `€${value.toFixed(2)}`}
        subValue={t('dailyAvgEur')}
        icon={DollarSign}
        href="/admin/analytics"
        color="amber"
      />
      <KpiCard
        title={t('kpi.trialConversion')}
        value=""
        metric={summary?.metrics?.trialConversionRate ?? missing('UserSubscription')}
        format={(value) => `${value.toFixed(1)}%`}
        icon={Percent}
        href="/admin/tiers/conversion-funnel"
        color="blue"
      />
    </div>
  );
}

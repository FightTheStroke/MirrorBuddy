import { prisma } from '@/lib/db';
import { metricTruth, snapshotContext, type MetricTruth } from './metric-truth';
import { readMetric } from './metric-truth-reader';

export interface AdminCountMetrics {
  pendingInvites: MetricTruth;
  totalUsers: MetricTruth;
  activeUsers24h: MetricTruth;
  systemAlerts: MetricTruth;
}

export interface AdminCounts {
  pendingInvites: number | null;
  totalUsers: number | null;
  activeUsers24h: number | null;
  systemAlerts: number | null;
  timestamp: string;
  metrics?: AdminCountMetrics;
}

export async function getAdminCounts(): Promise<AdminCounts & { metrics: AdminCountMetrics }> {
  const computedAt = new Date().toISOString();
  const [pendingInvites, totalUsers, systemAlerts] = await Promise.all([
    readMetric(
      () => prisma.inviteRequest.count({ where: { status: 'PENDING' } }),
      snapshotContext('InviteRequest', computedAt),
    ),
    readMetric(
      () => prisma.user.count({ where: { isTestData: false } }),
      snapshotContext('User (isTestData=false)', computedAt),
    ),
    readMetric(
      () =>
        prisma.safetyEvent.count({
          where: { resolvedAt: null, severity: 'critical' },
        }),
      snapshotContext('SafetyEvent (unresolved critical)', computedAt),
    ),
  ]);
  const activeUsers24h = metricTruth<number>(null, {
    source: 'UserActivity',
    computedAt,
    window: { start: new Date(Date.parse(computedAt) - 86_400_000).toISOString(), end: computedAt },
    reason: 'retentionWindow',
    population: 'recordedTelemetry',
  });
  return {
    pendingInvites: pendingInvites.value,
    totalUsers: totalUsers.value,
    activeUsers24h: null,
    systemAlerts: systemAlerts.value,
    timestamp: computedAt,
    metrics: { pendingInvites, totalUsers, activeUsers24h, systemAlerts },
  };
}

import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import type { CollectorContext } from './collector-utils';

const log = logger.child({ module: 'cron-metrics-push' });

export async function collectChurnMetrics({
  samples,
  instanceLabels,
  now,
}: CollectorContext): Promise<void> {
  const churnCutoff = new Date(now - 14 * 24 * 60 * 60 * 1000);
  const latestStages = await prisma.$queryRaw<
    Array<{ stage: string; last_activity: Date; is_churned: boolean }>
  >`
    WITH latest AS (
      SELECT DISTINCT ON (COALESCE("visitorId", "userId"))
        COALESCE("visitorId", "userId") as user_key,
        stage,
        "createdAt" as last_activity
      FROM "FunnelEvent"
      WHERE "isTestData" = false
      ORDER BY COALESCE("visitorId", "userId"), "createdAt" DESC
    )
    SELECT
      stage,
      last_activity,
      (last_activity < ${churnCutoff} AND stage NOT IN ('ACTIVE', 'FIRST_LOGIN')) as is_churned
    FROM latest
  `;
  const totalUsers = latestStages.length;
  const churnedUsers = latestStages.filter((user) => user.is_churned).length;
  samples.push(
    {
      name: 'mirrorbuddy_funnel_total_users',
      labels: instanceLabels,
      value: totalUsers,
      timestamp: now,
    },
    {
      name: 'mirrorbuddy_funnel_churned_users',
      labels: instanceLabels,
      value: churnedUsers,
      timestamp: now,
    },
    {
      name: 'mirrorbuddy_funnel_churn_rate',
      labels: instanceLabels,
      value: totalUsers > 0 ? churnedUsers / totalUsers : 0,
      timestamp: now,
    },
  );
  const churnByStage = new Map<string, { total: number; churned: number }>();
  for (const user of latestStages) {
    const data = churnByStage.get(user.stage) ?? { total: 0, churned: 0 };
    data.total++;
    if (user.is_churned) data.churned++;
    churnByStage.set(user.stage, data);
  }
  for (const [stage, data] of churnByStage) {
    samples.push({
      name: 'mirrorbuddy_funnel_stage_churn_rate',
      labels: { ...instanceLabels, stage },
      value: data.total > 0 ? data.churned / data.total : 0,
      timestamp: now,
    });
  }
  log.debug('Collected churn metrics', { totalUsers, churnedUsers });
}

import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import type { CollectorContext } from './collector-utils';

const ACTIVITY_WINDOW_MS = 5 * 60 * 1000;
const log = logger.child({ module: 'cron-metrics-push' });

function countValue(value: unknown): number {
  if ((typeof value !== 'number' && typeof value !== 'bigint') || !Number.isFinite(Number(value))) {
    throw new Error('Invalid activity count');
  }
  return Number(value);
}

export async function collectActivityMetrics({
  samples,
  instanceLabels,
  now,
}: CollectorContext): Promise<void> {
  const windowStart = new Date(now - ACTIVITY_WINDOW_MS);
  const uniqueByType = await prisma.$queryRaw<Array<{ userType: string; count: bigint }>>`
    SELECT "userType", COUNT(DISTINCT identifier) as count
    FROM "UserActivity"
    WHERE timestamp >= ${windowStart}
      AND "isTestData" = false
    GROUP BY "userType"
  `;
  const counts: Record<string, number> = { logged: 0, trial: 0, anonymous: 0 };
  for (const row of uniqueByType) {
    counts[row.userType] = countValue(row.count);
  }
  const total = counts.logged + counts.trial + counts.anonymous;
  for (const [userType, value] of Object.entries({
    total,
    logged: counts.logged,
    trial: counts.trial,
    anonymous: counts.anonymous,
  })) {
    samples.push({
      name: 'mirrorbuddy_realtime_active_users',
      labels: { ...instanceLabels, user_type: userType },
      value,
      timestamp: now,
    });
  }
  samples.push(
    {
      name: 'mirrorbuddy_trial_sessions_active',
      labels: instanceLabels,
      value: counts.trial,
      timestamp: now,
    },
    {
      name: 'mirrorbuddy_trial_to_total_ratio',
      labels: instanceLabels,
      value: total > 0 ? counts.trial / total : 0,
      timestamp: now,
    },
  );
  const routeCounts = await prisma.$queryRaw<Array<{ route: string; count: bigint }>>`
    SELECT route, COUNT(DISTINCT identifier) as count
    FROM "UserActivity"
    WHERE timestamp >= ${windowStart}
      AND "isTestData" = false
    GROUP BY route
    ORDER BY count DESC
    LIMIT 10
  `;
  for (const row of routeCounts) {
    samples.push({
      name: 'mirrorbuddy_realtime_active_users_by_route',
      labels: { ...instanceLabels, route: row.route },
      value: countValue(row.count),
      timestamp: now,
    });
  }
  log.debug('Collected realtime active users from database', {
    total,
    logged: counts.logged,
    trial: counts.trial,
  });
  const cleanupCutoff = new Date(now - ACTIVITY_WINDOW_MS * 2);
  await prisma.userActivity.deleteMany({
    where: { timestamp: { lt: cleanupCutoff } },
  });
}

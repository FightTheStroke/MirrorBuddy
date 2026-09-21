import { prisma } from '@/lib/db';
import type { MetricSample } from './http-metrics-collector';

export async function collectTierMetrics(
  instanceLabels: Record<string, string>,
  timestamp: number,
): Promise<MetricSample[]> {
  const samples: MetricSample[] = [];

  const usersByTier = await prisma.userSubscription.groupBy({
    by: ['tierId'],
    _count: {
      id: true,
    },
  });

  const tierMap = new Map<string, string>();
  const tiers = await prisma.tierDefinition.findMany({
    select: { id: true, code: true },
  });
  for (const tier of tiers) {
    tierMap.set(tier.id, tier.code);
  }

  // Query: Active users by tier (users with conversations in last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  for (const tierGroup of usersByTier) {
    const tierCode = tierMap.get(tierGroup.tierId) || 'unknown';
    const totalUsers = tierGroup._count.id;

    samples.push({
      name: 'mirrorbuddy_users_by_tier',
      labels: {
        ...instanceLabels,
        tier: tierCode,
      },
      value: totalUsers,
      timestamp,
    });

    // Count active users (users with conversations in last 7 days)
    const activeCount = await prisma.userSubscription.count({
      where: {
        tierId: tierGroup.tierId,
        user: {
          conversations: {
            some: {
              updatedAt: {
                gte: sevenDaysAgo,
              },
            },
          },
        },
      },
    });

    samples.push({
      name: 'mirrorbuddy_active_users_by_tier',
      labels: {
        ...instanceLabels,
        tier: tierCode,
      },
      value: activeCount,
      timestamp,
    });

    // Add total active count (for easier querying) - reuse activeCount from 7d query
    samples.push({
      name: 'mirrorbuddy_total_active_by_tier',
      labels: {
        ...instanceLabels,
        tier: tierCode,
      },
      value: activeCount,
      timestamp,
    });

    // WAU metric (same as activeCount - users active in last 7 days)
    samples.push({
      name: 'mirrorbuddy_wau_by_tier',
      labels: {
        ...instanceLabels,
        tier: tierCode,
      },
      value: activeCount,
      timestamp,
    });

    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const mauCount = await prisma.userSubscription.count({
      where: {
        tierId: tierGroup.tierId,
        user: {
          conversations: {
            some: {
              updatedAt: {
                gte: thirtyDaysAgo,
              },
            },
          },
        },
      },
    });

    samples.push({
      name: 'mirrorbuddy_mau_by_tier',
      labels: {
        ...instanceLabels,
        tier: tierCode,
      },
      value: mauCount,
      timestamp,
    });

    const dauCount = await prisma.userSubscription.count({
      where: {
        tierId: tierGroup.tierId,
        user: {
          conversations: {
            some: {
              updatedAt: {
                gte: oneDayAgo,
              },
            },
          },
        },
      },
    });

    samples.push({
      name: 'mirrorbuddy_dau_by_tier',
      labels: {
        ...instanceLabels,
        tier: tierCode,
      },
      value: dauCount,
      timestamp,
    });

    // Count churned users (inactive for 30+ days - no conversation activity in 30+ days)
    const churnedCount = await prisma.userSubscription.count({
      where: {
        tierId: tierGroup.tierId,
        user: {
          OR: [
            {
              conversations: {
                none: {},
              },
            },
            {
              // Users whose last conversation was 30+ days ago
              conversations: {
                every: {
                  updatedAt: {
                    lt: thirtyDaysAgo,
                  },
                },
              },
            },
          ],
        },
      },
    });

    samples.push({
      name: 'mirrorbuddy_churned_users_by_tier',
      labels: {
        ...instanceLabels,
        tier: tierCode,
      },
      value: churnedCount,
      timestamp,
    });

    const churnRate = totalUsers > 0 ? churnedCount / totalUsers : 0;

    samples.push({
      name: 'mirrorbuddy_churn_rate_by_tier',
      labels: {
        ...instanceLabels,
        tier: tierCode,
      },
      value: churnRate,
      timestamp,
    });
  }

  // Parse changes JSON to determine direction based on tier sortOrder
  const tierChanges = await prisma.tierAuditLog.findMany({
    where: { action: 'TIER_CHANGE' },
    select: { changes: true },
  });

  const tiersWithSortOrder = await prisma.tierDefinition.findMany({
    select: { id: true, sortOrder: true },
  });
  const sortOrderMap = new Map<string, number>();
  for (const tier of tiersWithSortOrder) {
    sortOrderMap.set(tier.id, tier.sortOrder);
  }

  let upgradeCount = 0;
  let downgradeCount = 0;

  for (const log of tierChanges) {
    const changes = log.changes as {
      from: { tierId: string } | null;
      to: { tierId: string };
    } | null;

    if (!changes?.from || !changes?.to) {
      // New subscription (from is null) - not an upgrade/downgrade
      continue;
    }

    const fromSortOrder = sortOrderMap.get(changes.from.tierId) ?? 0;
    const toSortOrder = sortOrderMap.get(changes.to.tierId) ?? 0;

    if (toSortOrder > fromSortOrder) {
      upgradeCount++;
    } else if (toSortOrder < fromSortOrder) {
      downgradeCount++;
    }
    // Equal sortOrder = lateral move, not counted
  }

  samples.push({
    name: 'mirrorbuddy_tier_upgrades_total',
    labels: instanceLabels,
    value: upgradeCount,
    timestamp,
  });

  samples.push({
    name: 'mirrorbuddy_tier_downgrades_total',
    labels: instanceLabels,
    value: downgradeCount,
    timestamp,
  });

  return samples;
}

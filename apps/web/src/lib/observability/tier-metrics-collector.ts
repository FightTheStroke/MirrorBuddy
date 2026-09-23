import { prisma } from '@/lib/db';
import type { MetricSample } from './http-metrics-collector';
import { countTierActivity, type TierActivity } from './tier-activity-query';

const NO_ACTIVITY: TierActivity = { dau: 0, wau: 0, mau: 0, churned: 0 };

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

  const activityByTier = await countTierActivity();

  for (const tierGroup of usersByTier) {
    const tierCode = tierMap.get(tierGroup.tierId) || 'unknown';
    const totalUsers = tierGroup._count.id;
    const {
      wau: activeCount,
      mau: mauCount,
      dau: dauCount,
      churned: churnedCount,
    } = activityByTier.get(tierGroup.tierId) ?? NO_ACTIVITY;

    samples.push({
      name: 'mirrorbuddy_users_by_tier',
      labels: {
        ...instanceLabels,
        tier: tierCode,
      },
      value: totalUsers,
      timestamp,
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

    // Add total active count (for easier querying) - same 7-day figure
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

    samples.push({
      name: 'mirrorbuddy_mau_by_tier',
      labels: {
        ...instanceLabels,
        tier: tierCode,
      },
      value: mauCount,
      timestamp,
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

    // Churned: no conversation activity in the last 30 days (tier-activity-query.ts)
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

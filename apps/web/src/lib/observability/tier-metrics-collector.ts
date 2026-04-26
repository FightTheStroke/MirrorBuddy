/**
 * Tier Metrics Collector
 * Collects subscription tier metrics for Prometheus/Grafana
 */

import { prisma } from "@/lib/db";
import type { MetricSample } from "./funnel-metrics-collectors";

/**
 * Collect tier subscription metrics
 */
export async function collectTierMetrics(
  instanceLabels: Record<string, string>,
  timestamp: number,
): Promise<MetricSample[]> {
  const samples: MetricSample[] = [];

  // Query: Total users by tier
  const usersByTier = await prisma.userSubscription.groupBy({
    by: ["tierId"],
    _count: {
      id: true,
    },
  });

  // Fetch tier definitions to get tier codes
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

  // For each tier, count active users
  for (const tierGroup of usersByTier) {
    const tierCode = tierMap.get(tierGroup.tierId) || "unknown";
    const totalUsers = tierGroup._count.id;

    // Add total users metric
    samples.push({
      name: "mirrorbuddy_users_by_tier",
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

    // Add active users metric
    samples.push({
      name: "mirrorbuddy_active_users_by_tier",
      labels: {
        ...instanceLabels,
        tier: tierCode,
      },
      value: activeCount,
      timestamp,
    });

    // Add total active count (for easier querying) - reuse activeCount from 7d query
    samples.push({
      name: "mirrorbuddy_total_active_by_tier",
      labels: {
        ...instanceLabels,
        tier: tierCode,
      },
      value: activeCount,
      timestamp,
    });

    // WAU metric (same as activeCount - users active in last 7 days)
    samples.push({
      name: "mirrorbuddy_wau_by_tier",
      labels: {
        ...instanceLabels,
        tier: tierCode,
      },
      value: activeCount,
      timestamp,
    });

    // Calculate engagement time windows for MAU and DAU
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Count MAU (Monthly Active Users - users with conversations in last 30 days)
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

    // Add MAU metric
    samples.push({
      name: "mirrorbuddy_mau_by_tier",
      labels: {
        ...instanceLabels,
        tier: tierCode,
      },
      value: mauCount,
      timestamp,
    });

    // Count DAU (Daily Active Users - users with conversations in last 24 hours)
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

    // Add DAU metric
    samples.push({
      name: "mirrorbuddy_dau_by_tier",
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
              // Users with no conversations at all
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

    // Add churned users metric
    samples.push({
      name: "mirrorbuddy_churned_users_by_tier",
      labels: {
        ...instanceLabels,
        tier: tierCode,
      },
      value: churnedCount,
      timestamp,
    });

    // Calculate churn rate (churned / total)
    const churnRate = totalUsers > 0 ? churnedCount / totalUsers : 0;

    // Add churn rate metric
    samples.push({
      name: "mirrorbuddy_churn_rate_by_tier",
      labels: {
        ...instanceLabels,
        tier: tierCode,
      },
      value: churnRate,
      timestamp,
    });
  }

  // Query: Tier changes and classify as upgrades/downgrades
  // Parse changes JSON to determine direction based on tier sortOrder
  const tierChanges = await prisma.tierAuditLog.findMany({
    where: { action: "TIER_CHANGE" },
    select: { changes: true },
  });

  // Build sortOrder map from tier definitions
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
    name: "mirrorbuddy_tier_upgrades_total",
    labels: instanceLabels,
    value: upgradeCount,
    timestamp,
  });

  samples.push({
    name: "mirrorbuddy_tier_downgrades_total",
    labels: instanceLabels,
    value: downgradeCount,
    timestamp,
  });

  return samples;
}

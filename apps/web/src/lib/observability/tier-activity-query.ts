/**
 * Activity per tier in one grouped query.
 *
 * The tier collector used to run four `UserSubscription.count` queries per
 * tier; Sentry flagged the repetition as an N+1 on /api/cron/metrics-push.
 * Definitions are unchanged:
 * - dau / wau / mau: subscriptions whose user has a conversation updated in
 *   the last 1 / 7 / 30 days (latest conversation update >= cut-off);
 * - churned: subscriptions whose user has no conversation updated in the last
 *   30 days, including users with no conversation at all.
 */
import { prisma } from '@/lib/db';

export interface TierActivity {
  dau: number;
  wau: number;
  mau: number;
  churned: number;
}

interface TierActivityRow {
  tierId: string | null;
  dau: bigint | number | null;
  wau: bigint | number | null;
  mau: bigint | number | null;
  churned: bigint | number | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function toCount(value: bigint | number | null | undefined): number {
  return value == null ? 0 : Number(value);
}

export async function countTierActivity(
  now: Date = new Date(),
): Promise<Map<string, TierActivity>> {
  const oneDayAgo = new Date(now.getTime() - DAY_MS);
  const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_MS);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS);

  const rows = await prisma.$queryRaw<TierActivityRow[]>`
    SELECT s."tierId" AS "tierId",
      COUNT(*) FILTER (WHERE a.last_update >= ${oneDayAgo}) AS dau,
      COUNT(*) FILTER (WHERE a.last_update >= ${sevenDaysAgo}) AS wau,
      COUNT(*) FILTER (WHERE a.last_update >= ${thirtyDaysAgo}) AS mau,
      COUNT(*) FILTER (WHERE a.last_update IS NULL OR a.last_update < ${thirtyDaysAgo}) AS churned
    FROM "UserSubscription" s
    JOIN "User" u ON u.id = s."userId"
    LEFT JOIN (
      SELECT "userId", MAX("updatedAt") AS last_update
      FROM "Conversation"
      GROUP BY "userId"
    ) a ON a."userId" = s."userId"
    GROUP BY s."tierId"
  `;

  const activity = new Map<string, TierActivity>();
  for (const row of Array.isArray(rows) ? rows : []) {
    if (typeof row?.tierId !== 'string') continue;
    activity.set(row.tierId, {
      dau: toCount(row.dau),
      wau: toCount(row.wau),
      mau: toCount(row.mau),
      churned: toCount(row.churned),
    });
  }
  return activity;
}

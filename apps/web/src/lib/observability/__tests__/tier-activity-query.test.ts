/**
 * Regression for the metrics-push N+1 (#1159 follow-up, Sentry MIRRORBUDDY-3B
 * regressed 2026-09-23 16:30 UTC): the tier collector ran four
 * `UserSubscription.count` queries per tier (7-day, 30-day, 1-day activity and
 * churn), repeated for every tier. One grouped query now returns all four
 * figures for every tier, with the same definitions.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', async () => {
  const { createMockPrisma } = await import('@/test/mocks/prisma');
  return { prisma: createMockPrisma() };
});

import { prisma } from '@/lib/db';
import { countTierActivity } from '../tier-activity-query';
import { collectTierMetrics } from '../tier-metrics-collector';

const DAY = 24 * 60 * 60 * 1000;

describe('tier activity in one query', () => {
  beforeEach(() => vi.clearAllMocks());

  it('collects the activity of every tier with a single query', async () => {
    vi.mocked(prisma.userSubscription.groupBy).mockResolvedValueOnce(
      ['t1', 't2', 't3', 't4'].map((tierId) => ({ tierId, _count: { id: 2 } })) as never,
    );
    vi.mocked(prisma.tierDefinition.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.tierAuditLog.findMany).mockResolvedValueOnce([] as never);
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([] as never);

    await collectTierMetrics({ instance: 'test' }, 1);

    expect(prisma.userSubscription.count).not.toHaveBeenCalled();
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('binds the 1, 7 and 30 day cut-offs as parameters and converts counts', async () => {
    const now = new Date('2026-09-23T12:00:00.000Z');
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([
      { tierId: 'pro', wau: BigInt(3), mau: BigInt(5), dau: BigInt(1), churned: BigInt(2) },
      { tierId: null, wau: BigInt(9), mau: BigInt(9), dau: BigInt(9), churned: BigInt(9) },
    ] as never);

    const activity = await countTierActivity(now);

    const params = vi.mocked(prisma.$queryRaw).mock.calls[0].slice(1) as Date[];
    expect(params.map((d) => now.getTime() - d.getTime())).toEqual(
      expect.arrayContaining([DAY, 7 * DAY, 30 * DAY]),
    );
    expect(Object.fromEntries(activity)).toEqual({
      pro: { wau: 3, mau: 5, dau: 1, churned: 2 },
    });
  });

  it('propagates a database failure to the collector', async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(new Error('db down'));

    await expect(countTierActivity(new Date())).rejects.toThrow('db down');
  });
});

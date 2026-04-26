import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', async () => {
  const { createMockPrisma } = await import('@/test/mocks/prisma');
  return { prisma: createMockPrisma() };
});

import { prisma } from '@/lib/db';
import {
  listApproved,
  rewardContribution,
  submitContribution,
  updateContributionStatus,
} from '@/lib/community/community-service';

describe('community-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submitContribution creates a pending record', async () => {
    vi.mocked((prisma as any).communityContribution.create).mockResolvedValue({
      id: 'cont-1',
      userId: 'user-1',
      type: 'tip',
      title: 'Tip',
      content: 'Study daily',
      status: 'pending',
    });

    await submitContribution('user-1', {
      type: 'tip',
      title: 'Tip',
      content: 'Study daily',
    });

    expect((prisma as any).communityContribution.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        type: 'tip',
        title: 'Tip',
        content: 'Study daily',
        status: 'pending',
      },
    });
  });

  it('listApproved applies pagination and returns totals', async () => {
    const now = new Date('2026-02-26T00:00:00.000Z');
    vi.mocked((prisma as any).communityContribution.findMany).mockResolvedValue([
      {
        id: 'cont-1',
        userId: 'user-1',
        type: 'resource',
        title: 'Resource',
        content: 'Worksheet',
        status: 'approved',
        moderationNote: null,
        mirrorBucksReward: 10,
        createdAt: now,
        updatedAt: now,
        _count: { votes: 2 },
      },
    ]);
    vi.mocked((prisma as any).communityContribution.count).mockResolvedValue(1);

    const result = await listApproved({ type: 'resource' }, { limit: 5, offset: 10 });

    expect((prisma as any).communityContribution.findMany).toHaveBeenCalledWith({
      where: { status: 'approved', type: 'resource' },
      include: { _count: { select: { votes: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      skip: 10,
    });
    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.voteCount).toBe(2);
  });

  it('updateContributionStatus persists state transitions', async () => {
    vi.mocked((prisma as any).communityContribution.update).mockResolvedValue({
      id: 'cont-1',
      status: 'approved',
      moderationNote: 'Looks good',
    });

    await updateContributionStatus('cont-1', 'approved', 'Looks good');

    expect((prisma as any).communityContribution.update).toHaveBeenCalledWith({
      where: { id: 'cont-1' },
      data: { status: 'approved', moderationNote: 'Looks good' },
    });
  });

  it('rewardContribution creates a PointsTransaction for approved contribution', async () => {
    vi.mocked((prisma as any).communityContribution.findUnique).mockResolvedValue({
      id: 'cont-1',
      userId: 'user-1',
      status: 'approved',
      mirrorBucksReward: 25,
    });
    vi.mocked((prisma as any).progress.upsert).mockResolvedValue({
      id: 'progress-1',
      userId: 'user-1',
      xp: 125,
    });
    vi.mocked((prisma as any).userGamification.upsert).mockResolvedValue({
      id: 'gam-1',
      userId: 'user-1',
    });
    vi.mocked((prisma as any).pointsTransaction.create).mockResolvedValue({ id: 'tx-1' });

    const result = await rewardContribution('cont-1');

    expect((prisma as any).pointsTransaction.create).toHaveBeenCalledWith({
      data: {
        gamificationId: 'gam-1',
        points: 25,
        reason: 'community_contribution_reward',
        sourceId: 'cont-1',
        sourceType: 'CommunityContribution',
        multiplier: 1,
      },
    });
    expect(result).toEqual({
      contributionId: 'cont-1',
      userId: 'user-1',
      reward: 25,
      xp: 125,
    });
  });
});

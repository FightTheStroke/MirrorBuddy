import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', async () => {
  const { createMockPrisma } = await import('@/test/mocks/prisma');
  return { prisma: createMockPrisma() };
});

import { prisma } from '@/lib/db';
import {
  getContribution,
  listApproved,
  rewardContribution,
  submitContribution,
  updateContributionStatus,
} from './community-service';

describe('community-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submitContribution creates a pending contribution for the user', async () => {
    const createdAt = new Date('2026-02-26T10:00:00.000Z');
    vi.mocked((prisma as any).communityContribution.create).mockResolvedValue({
      id: 'cont-1',
      userId: 'user-1',
      type: 'tip',
      title: 'Helpful tip',
      content: 'Try spaced repetition every day',
      status: 'pending',
      moderationNote: null,
      mirrorBucksReward: 0,
      createdAt,
      updatedAt: createdAt,
    });

    const result = await submitContribution('user-1', {
      type: 'tip',
      title: 'Helpful tip',
      content: 'Try spaced repetition every day',
    });

    expect((prisma as any).communityContribution.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        type: 'tip',
        title: 'Helpful tip',
        content: 'Try spaced repetition every day',
        status: 'pending',
      },
    });
    expect(result.id).toBe('cont-1');
    expect(result.status).toBe('pending');
  });

  it('listApproved returns approved items with vote counts and pagination', async () => {
    const createdAt = new Date('2026-02-26T10:00:00.000Z');
    vi.mocked((prisma as any).communityContribution.findMany).mockResolvedValue([
      {
        id: 'cont-1',
        userId: 'user-1',
        type: 'resource',
        title: 'Resource',
        content: 'Use this worksheet',
        status: 'approved',
        moderationNote: null,
        mirrorBucksReward: 15,
        createdAt,
        updatedAt: createdAt,
        _count: { votes: 3 },
      },
    ]);
    vi.mocked((prisma as any).communityContribution.count).mockResolvedValue(1);

    const result = await listApproved({ type: 'resource' }, { limit: 5, offset: 10 });

    expect((prisma as any).communityContribution.findMany).toHaveBeenCalledWith({
      where: {
        status: 'approved',
        type: 'resource',
      },
      include: {
        _count: {
          select: { votes: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      skip: 10,
    });
    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({ id: 'cont-1', voteCount: 3 });
  });

  it('getContribution fetches a contribution by id', async () => {
    const createdAt = new Date('2026-02-26T10:00:00.000Z');
    vi.mocked((prisma as any).communityContribution.findUnique).mockResolvedValue({
      id: 'cont-1',
      userId: 'user-1',
      type: 'question',
      title: 'Question',
      content: 'How do I revise better?',
      status: 'pending',
      moderationNote: null,
      mirrorBucksReward: 0,
      createdAt,
      updatedAt: createdAt,
      _count: { votes: 0 },
    });

    const contribution = await getContribution('cont-1');

    expect((prisma as any).communityContribution.findUnique).toHaveBeenCalledWith({
      where: { id: 'cont-1' },
      include: {
        _count: {
          select: { votes: true },
        },
      },
    });
    expect(contribution?.id).toBe('cont-1');
  });

  it('updateContributionStatus updates moderation status and note', async () => {
    const createdAt = new Date('2026-02-26T10:00:00.000Z');
    vi.mocked((prisma as any).communityContribution.update).mockResolvedValue({
      id: 'cont-1',
      userId: 'user-1',
      type: 'feedback',
      title: 'Feedback',
      content: 'Great feature',
      status: 'approved',
      moderationNote: 'Thanks for sharing',
      mirrorBucksReward: 20,
      createdAt,
      updatedAt: createdAt,
    });

    const updated = await updateContributionStatus('cont-1', 'approved', 'Thanks for sharing');

    expect((prisma as any).communityContribution.update).toHaveBeenCalledWith({
      where: { id: 'cont-1' },
      data: {
        status: 'approved',
        moderationNote: 'Thanks for sharing',
      },
    });
    expect(updated.status).toBe('approved');
  });

  it('rewardContribution awards mirror bucks and records a points transaction', async () => {
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
    vi.mocked((prisma as any).pointsTransaction.create).mockResolvedValue({
      id: 'tx-1',
    });

    const result = await rewardContribution('cont-1');

    expect((prisma as any).progress.upsert).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      update: { xp: { increment: 25 } },
      create: { userId: 'user-1', xp: 25 },
    });
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

  it('rewardContribution skips non-approved contributions', async () => {
    vi.mocked((prisma as any).communityContribution.findUnique).mockResolvedValue({
      id: 'cont-2',
      userId: 'user-2',
      status: 'pending',
      mirrorBucksReward: 10,
    });

    const result = await rewardContribution('cont-2');

    expect(result).toBeNull();
    expect((prisma as any).progress.upsert).not.toHaveBeenCalled();
    expect((prisma as any).pointsTransaction.create).not.toHaveBeenCalled();
  });
});

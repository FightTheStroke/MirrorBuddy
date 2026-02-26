import type {
  CommunityContribution,
  CommunityContributionStatus,
  CommunityContributionType,
} from '@prisma/client';

import { prisma } from '@/lib/db';
import { getCurrentSeason } from '@/lib/gamification/gamification-helpers';

export interface SubmitContributionInput {
  type: CommunityContributionType;
  title: string;
  content: string;
}

export interface CommunityListFilters {
  type?: CommunityContributionType;
}

export interface CommunityListPagination {
  limit?: number;
  offset?: number;
}

export interface ContributionWithVoteCount extends CommunityContribution {
  voteCount: number;
}

export interface CommunityListResult {
  items: ContributionWithVoteCount[];
  total: number;
}

export interface RewardContributionResult {
  contributionId: string;
  userId: string;
  reward: number;
  xp: number;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function submitContribution(userId: string, data: SubmitContributionInput) {
  return prisma.communityContribution.create({
    data: {
      userId,
      type: data.type,
      title: data.title,
      content: data.content,
      status: 'pending',
    },
  });
}

export async function listApproved(
  filters: CommunityListFilters = {},
  pagination: CommunityListPagination = {},
): Promise<CommunityListResult> {
  const where = {
    status: 'approved' as const,
    ...(filters.type ? { type: filters.type } : {}),
  };

  const take = Math.max(1, Math.min(pagination.limit ?? DEFAULT_LIMIT, MAX_LIMIT));
  const skip = Math.max(0, pagination.offset ?? 0);

  const [items, total] = await Promise.all([
    prisma.communityContribution.findMany({
      where,
      include: {
        _count: {
          select: { votes: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    }),
    prisma.communityContribution.count({ where }),
  ]);

  return {
    items: items.map((item) => ({
      ...item,
      voteCount: item._count.votes,
    })),
    total,
  };
}

export async function getContribution(id: string): Promise<ContributionWithVoteCount | null> {
  const contribution = await prisma.communityContribution.findUnique({
    where: { id },
    include: {
      _count: {
        select: { votes: true },
      },
    },
  });

  if (!contribution) {
    return null;
  }

  return {
    ...contribution,
    voteCount: contribution._count.votes,
  };
}

export async function updateContributionStatus(
  id: string,
  status: CommunityContributionStatus,
  moderationNote?: string,
) {
  return prisma.communityContribution.update({
    where: { id },
    data: {
      status,
      moderationNote: moderationNote ?? null,
    },
  });
}

export async function rewardContribution(
  contributionId: string,
): Promise<RewardContributionResult | null> {
  const contribution = await prisma.communityContribution.findUnique({
    where: { id: contributionId },
    select: {
      id: true,
      userId: true,
      status: true,
      mirrorBucksReward: true,
    },
  });

  if (!contribution) {
    throw new Error(`Contribution not found: ${contributionId}`);
  }

  if (contribution.status !== 'approved' || contribution.mirrorBucksReward <= 0) {
    return null;
  }

  const reward = contribution.mirrorBucksReward;
  const progress = await prisma.progress.upsert({
    where: { userId: contribution.userId },
    update: { xp: { increment: reward } },
    create: { userId: contribution.userId, xp: reward },
  });

  const gamification = await prisma.userGamification.upsert({
    where: { userId: contribution.userId },
    update: {},
    create: {
      userId: contribution.userId,
      currentSeason: getCurrentSeason(),
      seasonStartDate: new Date(),
    },
  });

  await prisma.pointsTransaction.create({
    data: {
      gamificationId: gamification.id,
      points: reward,
      reason: 'community_contribution_reward',
      sourceId: contribution.id,
      sourceType: 'CommunityContribution',
      multiplier: 1,
    },
  });

  return {
    contributionId: contribution.id,
    userId: contribution.userId,
    reward,
    xp: progress.xp,
  };
}

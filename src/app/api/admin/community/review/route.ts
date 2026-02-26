import type { CommunityContributionStatus } from '@prisma/client';
import { NextResponse } from 'next/server';

import { pipe, withAdmin, withAdminReadOnly, withCSRF, withSentry } from '@/lib/api/middlewares';
import { rewardContribution, updateContributionStatus } from '@/lib/community/community-service';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

const PAGE_SIZE = 20;
const MUTABLE_STATUSES: readonly CommunityContributionStatus[] = ['approved', 'rejected', 'flagged'];

export const revalidate = 0;

export const GET = pipe(
  withSentry('/api/admin/community/review'),
  withAdminReadOnly,
)(async (ctx) => {
  const { searchParams } = new URL(ctx.req.url);
  const pageParam = searchParams.get('page') ?? '1';
  const parsedPage = parseInt(pageParam, 10);
  const page = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
  const skip = (page - 1) * PAGE_SIZE;

  const [items, total] = await Promise.all([
    prisma.communityContribution.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
      take: PAGE_SIZE,
      skip,
    }),
    prisma.communityContribution.count({ where: { status: 'pending' } }),
  ]);

  return NextResponse.json({
    items,
    pagination: {
      page,
      limit: PAGE_SIZE,
      total,
      totalPages: Math.ceil(total / PAGE_SIZE),
      hasNextPage: page * PAGE_SIZE < total,
      hasPrevPage: page > 1,
    },
  });
});

export const PATCH = pipe(
  withSentry('/api/admin/community/review'),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  const body = (await ctx.req.json()) as {
    id?: string;
    status?: CommunityContributionStatus;
    moderationNote?: string;
  };

  if (!body.id || !body.status || !MUTABLE_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  try {
    const contribution = await updateContributionStatus(body.id, body.status, body.moderationNote);
    const reward = body.status === 'approved' ? await rewardContribution(body.id) : null;

    return NextResponse.json({ contribution, reward });
  } catch (error) {
    logger.error('Admin community review PATCH error', {
      error: String(error),
      contributionId: body.id,
      status: body.status,
    });

    return NextResponse.json({ error: 'Failed to update contribution review status' }, { status: 500 });
  }
});

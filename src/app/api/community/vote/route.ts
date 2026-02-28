import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/db';
import { pipe, withAuth, withCSRF, withSentry } from '@/lib/api/middlewares';

const VoteRequestSchema = z.object({
  contributionId: z.string().trim().min(1, 'contributionId is required'),
});

type VoteTransactionResult =
  | { ok: true; voted: boolean; newVoteCount: number }
  | { ok: false; status: 404 | 409; error: string };

export const revalidate = 0;

export const POST = pipe(
  withSentry('/api/community/vote'),
  withCSRF,
  withAuth,
)(async (ctx) => {
  if (!ctx.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rawBody = await ctx.req.json().catch(() => null);
  const validation = VoteRequestSchema.safeParse(rawBody);

  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'Invalid request',
        details: validation.error.issues.map((issue) => issue.message),
      },
      { status: 400 },
    );
  }

  const { contributionId } = validation.data;
  const userId = ctx.userId;

  const result = await prisma.$transaction<VoteTransactionResult>(async (tx) => {
    const contribution = await tx.communityContribution.findUnique({
      where: { id: contributionId },
      select: { id: true, status: true },
    });

    if (!contribution) {
      return { ok: false, status: 404, error: 'Contribution not found' };
    }

    if (contribution.status !== 'approved') {
      return { ok: false, status: 409, error: 'Contribution is not approved' };
    }

    const voteWhere = {
      contributionId_userId: {
        contributionId,
        userId,
      },
    };

    const existingVote = await tx.contributionVote.findUnique({
      where: voteWhere,
      select: { id: true },
    });

    let voted: boolean;

    if (existingVote) {
      await tx.contributionVote.delete({ where: voteWhere });
      voted = false;
    } else {
      await tx.contributionVote.upsert({
        where: voteWhere,
        update: { value: 1 },
        create: {
          contributionId,
          userId,
          value: 1,
        },
      });
      voted = true;
    }

    const newVoteCount = await tx.contributionVote.count({
      where: { contributionId },
    });

    return { ok: true, voted, newVoteCount };
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    voted: result.voted,
    newVoteCount: result.newVoteCount,
  });
});

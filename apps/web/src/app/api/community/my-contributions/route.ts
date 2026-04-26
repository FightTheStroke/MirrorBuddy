import { NextResponse } from 'next/server';

import { pipe, withAuth, withSentry } from '@/lib/api/middlewares';
import { prisma } from '@/lib/db';

const PAGE_SIZE = 20;

export const revalidate = 0;

export const GET = pipe(
  withSentry('/api/community/my-contributions'),
  withAuth,
)(async (ctx) => {
  if (!ctx.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(ctx.req.url);
  const pageParam = searchParams.get('page') ?? '1';
  const parsedPage = Number.parseInt(pageParam, 10);
  const page = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
  const skip = (page - 1) * PAGE_SIZE;

  const where = { userId: ctx.userId };
  const [items, total] = await Promise.all([
    prisma.communityContribution.findMany({
      where,
      select: {
        id: true,
        title: true,
        content: true,
        type: true,
        status: true,
        moderationNote: true,
        createdAt: true,
        _count: {
          select: { votes: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE,
      skip,
    }),
    prisma.communityContribution.count({ where }),
  ]);

  const responseItems = items.map((item) => {
    const baseItem = {
      id: item.id,
      title: item.title,
      content: item.content,
      type: item.type,
      status: item.status,
      voteCount: item._count.votes,
      createdAt: item.createdAt,
    };

    if (item.status === 'rejected') {
      return {
        ...baseItem,
        moderationNote: item.moderationNote,
      };
    }

    return baseItem;
  });

  return NextResponse.json({
    items: responseItems,
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

import { NextResponse } from 'next/server';

import { pipe, withSentry } from '@/lib/api/middlewares';
import { listApproved } from '@/lib/community/community-service';
import { logger } from '@/lib/logger';

const PAGE_SIZE = 20;
type CommunityType = 'feedback' | 'tip' | 'resource' | 'question';

const COMMUNITY_TYPES: readonly CommunityType[] = [
  'feedback',
  'tip',
  'resource',
  'question',
];

export const revalidate = 0;

export const GET = pipe(withSentry('/api/community/list'))(async (ctx) => {
  const { searchParams } = new URL(ctx.req.url);
  const typeParam = searchParams.get('type');
  const pageParam = searchParams.get('page') ?? '1';

  if (typeParam && !COMMUNITY_TYPES.includes(typeParam as CommunityType)) {
    return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
  }

  const parsedPage = parseInt(pageParam, 10);
  const page = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
  const offset = (page - 1) * PAGE_SIZE;

  try {
    const { items, total } = await listApproved(
      typeParam ? { type: typeParam as CommunityType } : {},
      { limit: PAGE_SIZE, offset },
    );

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
  } catch (error) {
    logger.error('Community list GET error', { error: String(error) });
    return NextResponse.json({ error: 'Failed to list community contributions' }, { status: 500 });
  }
});

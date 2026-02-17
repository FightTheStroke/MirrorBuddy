/**
 * GET /api/admin/waitlist
 *
 * Returns a paginated list of waitlist entries with optional search and filters.
 *
 * Query params:
 *   page      - page number, 1-based (default: 1)
 *   pageSize  - entries per page (default: 25, max: 100)
 *   search    - filter by email (case-insensitive contains)
 *   verified  - "true" | "false" — filter by verification status
 */

import { NextResponse } from 'next/server';
import { pipe, withSentry, withAdmin } from '@/lib/api/middlewares';
import { prisma } from '@/lib/db';
export const revalidate = 0;

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

export const GET = pipe(
  withSentry('/api/admin/waitlist'),
  withAdmin,
)(async (ctx) => {
  const url = new URL(ctx.req.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(url.searchParams.get('pageSize') ?? String(DEFAULT_PAGE_SIZE), 10)),
  );
  const search = url.searchParams.get('search') ?? undefined;
  const verifiedParam = url.searchParams.get('verified');

  // Build where clause
  const where: Record<string, unknown> = {};

  if (search) {
    where.email = { contains: search, mode: 'insensitive' };
  }

  if (verifiedParam === 'true') {
    where.verifiedAt = { not: null };
  } else if (verifiedParam === 'false') {
    where.verifiedAt = null;
  }

  const [entries, total] = await Promise.all([
    prisma.waitlistEntry.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.waitlistEntry.count({ where }),
  ]);

  return NextResponse.json({
    entries,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  });
});

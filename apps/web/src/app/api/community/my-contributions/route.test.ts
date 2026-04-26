import * as fs from 'node:fs';
import * as path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', async () => {
  const { createMockPrisma } = await import('@/test/mocks/prisma');
  return { prisma: createMockPrisma() };
});

vi.mock('@/lib/auth/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth/server')>();
  return {
    ...actual,
    validateAuth: vi.fn().mockResolvedValue({
      authenticated: true,
      userId: 'user-1',
    }),
  };
});

import { prisma } from '@/lib/db';
import { validateAuth } from '@/lib/auth/server';
import { GET } from './route';

const ROUTE_PATH = path.resolve(__dirname, './route.ts');

function createRequest(page?: number): NextRequest {
  const suffix = page ? `?page=${page}` : '';
  return new NextRequest(`http://localhost/api/community/my-contributions${suffix}`);
}

describe('GET /api/community/my-contributions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAuth).mockResolvedValue({
      authenticated: true,
      userId: 'user-1',
    });
    vi.mocked(prisma.communityContribution.findMany).mockResolvedValue([]);
    vi.mocked(prisma.communityContribution.count).mockResolvedValue(0);
  });

  it('uses pipe(withSentry, withAuth)', () => {
    const source = fs.readFileSync(ROUTE_PATH, 'utf-8');
    expect(source).toContain('pipe(');
    expect(source).toContain("withSentry('/api/community/my-contributions')");
    expect(source).toContain('withAuth');
  });

  it('requires authentication', async () => {
    vi.mocked(validateAuth).mockResolvedValueOnce({
      authenticated: false,
      userId: null,
    });

    const response = await GET(createRequest() as never);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
    expect(prisma.communityContribution.findMany).not.toHaveBeenCalled();
  });

  it('returns only authenticated user contributions, sorted by createdAt desc, paginated 20/page', async () => {
    vi.mocked(prisma.communityContribution.findMany).mockResolvedValue([
      {
        id: 'contrib-rejected',
        userId: 'user-1',
        title: 'Rejected post',
        content: 'Needs changes',
        type: 'tip',
        status: 'rejected',
        moderationNote: 'Please add sources',
        createdAt: new Date('2026-02-01T10:00:00.000Z'),
        _count: { votes: 3 },
      },
      {
        id: 'contrib-approved',
        userId: 'user-1',
        title: 'Approved post',
        content: 'Great idea',
        type: 'resource',
        status: 'approved',
        moderationNote: 'Internal note that must stay hidden',
        createdAt: new Date('2026-01-31T10:00:00.000Z'),
        _count: { votes: 8 },
      },
      {
        id: 'contrib-pending',
        userId: 'user-1',
        title: 'Pending post',
        content: 'Awaiting review',
        type: 'feedback',
        status: 'pending',
        moderationNote: 'Internal pending note',
        createdAt: new Date('2026-01-30T10:00:00.000Z'),
        _count: { votes: 1 },
      },
    ] as never);
    vi.mocked(prisma.communityContribution.count).mockResolvedValue(41);

    const response = await GET(createRequest(2) as never);
    const data = await response.json();

    expect(prisma.communityContribution.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
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
      take: 20,
      skip: 20,
    });
    expect(prisma.communityContribution.count).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
    });

    expect(response.status).toBe(200);
    expect(data.pagination).toEqual({
      page: 2,
      limit: 20,
      total: 41,
      totalPages: 3,
      hasNextPage: true,
      hasPrevPage: true,
    });

    expect(data.items).toEqual([
      {
        id: 'contrib-rejected',
        title: 'Rejected post',
        content: 'Needs changes',
        type: 'tip',
        status: 'rejected',
        moderationNote: 'Please add sources',
        voteCount: 3,
        createdAt: '2026-02-01T10:00:00.000Z',
      },
      {
        id: 'contrib-approved',
        title: 'Approved post',
        content: 'Great idea',
        type: 'resource',
        status: 'approved',
        voteCount: 8,
        createdAt: '2026-01-31T10:00:00.000Z',
      },
      {
        id: 'contrib-pending',
        title: 'Pending post',
        content: 'Awaiting review',
        type: 'feedback',
        status: 'pending',
        voteCount: 1,
        createdAt: '2026-01-30T10:00:00.000Z',
      },
    ]);
    expect(data.items[1]).not.toHaveProperty('moderationNote');
    expect(data.items[2]).not.toHaveProperty('moderationNote');
  });
});

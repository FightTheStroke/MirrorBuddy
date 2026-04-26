import { beforeEach, describe, expect, it, vi } from 'vitest';

import { pipe, withAdmin, withAdminReadOnly, withCSRF, withSentry } from '@/lib/api/middlewares';
import { updateContributionStatus, rewardContribution } from '@/lib/community/community-service';
import { prisma } from '@/lib/db';
import { GET, PATCH } from './route';

vi.mock('@/lib/db', async () => {
  const { createMockPrisma } = await import('@/test/mocks/prisma');
  return { prisma: createMockPrisma() };
});

vi.mock('@/lib/community/community-service', () => ({
  updateContributionStatus: vi.fn(),
  rewardContribution: vi.fn(),
}));

vi.mock('@/lib/api/middlewares', () => ({
  pipe: vi.fn((..._fns: unknown[]) => (handler: (ctx: { req: Request }) => Promise<Response>) => {
    return async (req: Request) => handler({ req });
  }),
  withSentry: vi.fn((path: string) => `sentry:${path}`),
  withCSRF: 'csrf',
  withAdmin: 'admin',
  withAdminReadOnly: 'adminReadOnly',
}));

describe('/api/admin/community/review route', () => {
  beforeEach(() => {
    vi.mocked((prisma as any).communityContribution.findMany).mockReset();
    vi.mocked((prisma as any).communityContribution.count).mockReset();
    vi.mocked(updateContributionStatus).mockReset();
    vi.mocked(rewardContribution).mockReset();
  });

  it('composes GET and PATCH middleware chains correctly', () => {
    expect(withSentry).toHaveBeenCalledWith('/api/admin/community/review');
    expect(pipe).toHaveBeenNthCalledWith(1, 'sentry:/api/admin/community/review', withAdminReadOnly);
    expect(pipe).toHaveBeenNthCalledWith(2, 'sentry:/api/admin/community/review', withCSRF, withAdmin);
  });

  it('GET returns paginated pending contributions', async () => {
    vi.mocked((prisma as any).communityContribution.findMany).mockResolvedValue([
      {
        id: 'cont-1',
        userId: 'user-1',
        type: 'resource',
        title: 'Helpful link',
        content: 'https://example.com',
        status: 'pending',
        moderationNote: null,
        mirrorBucksReward: 20,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ]);
    vi.mocked((prisma as any).communityContribution.count).mockResolvedValue(21);

    const response = await GET(
      new Request('http://localhost/api/admin/community/review?page=2') as never,
    );

    expect((prisma as any).communityContribution.findMany).toHaveBeenCalledWith({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
      take: 20,
      skip: 20,
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      items: [
        {
          id: 'cont-1',
          userId: 'user-1',
          type: 'resource',
          title: 'Helpful link',
          content: 'https://example.com',
          status: 'pending',
          moderationNote: null,
          mirrorBucksReward: 20,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      pagination: {
        page: 2,
        limit: 20,
        total: 21,
        totalPages: 2,
        hasNextPage: false,
        hasPrevPage: true,
      },
    });
  });

  it('PATCH updates contribution status and rewards approved contributions', async () => {
    vi.mocked(updateContributionStatus).mockResolvedValue({
      id: 'cont-1',
      status: 'approved',
      moderationNote: 'Looks good',
    } as never);
    vi.mocked(rewardContribution).mockResolvedValue({
      contributionId: 'cont-1',
      userId: 'user-1',
      reward: 20,
      xp: 100,
    } as never);

    const response = await PATCH(
      new Request('http://localhost/api/admin/community/review', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: 'cont-1', status: 'approved', moderationNote: 'Looks good' }),
      }) as never,
    );

    expect(updateContributionStatus).toHaveBeenCalledWith('cont-1', 'approved', 'Looks good');
    expect(rewardContribution).toHaveBeenCalledWith('cont-1');
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      contribution: {
        id: 'cont-1',
        status: 'approved',
        moderationNote: 'Looks good',
      },
      reward: {
        contributionId: 'cont-1',
        userId: 'user-1',
        reward: 20,
        xp: 100,
      },
    });
  });
});

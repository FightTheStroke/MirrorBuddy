import { beforeEach, describe, expect, it, vi } from 'vitest';

import { pipe, withSentry } from '@/lib/api/middlewares';
import { listApproved } from '@/lib/community/community-service';
import { GET } from './route';

vi.mock('@/lib/api/middlewares', () => ({
  pipe: vi.fn((..._fns: unknown[]) => (handler: (ctx: { req: Request }) => Promise<Response>) => {
    return async (req: Request) => handler({ req });
  }),
  withSentry: vi.fn((path: string) => `sentry:${path}`),
}));

vi.mock('@/lib/community/community-service', () => ({
  listApproved: vi.fn(),
}));

describe('GET /api/community/list', () => {
  beforeEach(() => {
    vi.mocked(listApproved).mockReset();
  });

  it('composes with withSentry', () => {
    expect(withSentry).toHaveBeenCalledWith('/api/community/list');
    expect(pipe).toHaveBeenCalledWith('sentry:/api/community/list');
  });

  it('returns paginated approved contributions with vote counts', async () => {
    vi.mocked(listApproved).mockResolvedValue({
      items: [
        {
          id: 'contrib-1',
          userId: 'user-1',
          type: 'resource',
          title: 'Helpful link',
          content: 'https://example.com',
          status: 'approved',
          moderationNote: null,
          mirrorBucksReward: 0,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          voteCount: 7,
        },
      ],
      total: 45,
    } as never);

    const response = await GET(
      new Request('http://localhost/api/community/list?type=resource&page=3') as never,
    );

    expect(listApproved).toHaveBeenCalledWith(
      { type: 'resource' },
      { limit: 20, offset: 40 },
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      items: [
        {
          id: 'contrib-1',
          userId: 'user-1',
          type: 'resource',
          title: 'Helpful link',
          content: 'https://example.com',
          status: 'approved',
          moderationNote: null,
          mirrorBucksReward: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          voteCount: 7,
        },
      ],
      pagination: {
        page: 3,
        limit: 20,
        total: 45,
        totalPages: 3,
        hasNextPage: false,
        hasPrevPage: true,
      },
    });
  });

  it('returns 400 for invalid type', async () => {
    const response = await GET(
      new Request('http://localhost/api/community/list?type=invalid') as never,
    );

    expect(response.status).toBe(400);
    expect(listApproved).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      error: 'Invalid type parameter',
    });
  });
});

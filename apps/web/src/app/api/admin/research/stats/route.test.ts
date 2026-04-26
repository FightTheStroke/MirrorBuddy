import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';
import { prisma } from '@/lib/db';

vi.mock('@/lib/db', async () => {
  const { createMockPrisma } = await import('@/test/mocks/prisma');
  return { prisma: createMockPrisma() };
});

vi.mock('@/lib/api/middlewares', () => ({
  pipe:
    (..._fns: unknown[]) =>
    (handler: unknown) =>
      handler,
  withSentry: vi.fn(() => (ctx: unknown) => ctx),
  withAdminReadOnly: vi.fn(() => (ctx: unknown) => ctx),
}));

describe('GET /api/admin/research/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns ranked maestro stats from completed experiments', async () => {
    (prisma.researchExperiment.groupBy as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        maestroId: 'maestro-b',
        _avg: {
          scoreScaffolding: 7,
          scoreHinting: 8,
          scoreAdaptation: 7,
          scoreMisconceptionHandling: 6,
        },
        _count: { _all: 2 },
      },
      {
        maestroId: 'maestro-a',
        _avg: {
          scoreScaffolding: 9,
          scoreHinting: 8,
          scoreAdaptation: 8,
          scoreMisconceptionHandling: 9,
        },
        _count: { _all: 3 },
      },
    ]);

    const response = await GET(new Request('http://localhost/api/admin/research/stats') as never);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(prisma.researchExperiment.groupBy).toHaveBeenCalledWith({
      by: ['maestroId'],
      where: { status: 'completed' },
      _avg: {
        scoreScaffolding: true,
        scoreHinting: true,
        scoreAdaptation: true,
        scoreMisconceptionHandling: true,
      },
      _count: { _all: true },
    });
    expect(data).toEqual([
      {
        rank: 1,
        maestroId: 'maestro-a',
        experimentCount: 3,
        scaffolding: 9,
        hinting: 8,
        adaptation: 8,
        misconceptionHandling: 9,
        overall: 8.5,
      },
      {
        rank: 2,
        maestroId: 'maestro-b',
        experimentCount: 2,
        scaffolding: 7,
        hinting: 8,
        adaptation: 7,
        misconceptionHandling: 6,
        overall: 7,
      },
    ]);
  });

  it('returns empty array when there are no completed experiments', async () => {
    (prisma.researchExperiment.groupBy as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      [],
    );

    const response = await GET(new Request('http://localhost/api/admin/research/stats') as never);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual([]);
  });
});

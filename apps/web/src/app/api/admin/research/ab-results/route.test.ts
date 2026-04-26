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

describe('GET /api/admin/research/ab-results', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma as unknown as { aBExperiment: { findMany: ReturnType<typeof vi.fn> } }).aBExperiment = {
      findMany: vi.fn(),
    };
  });

  it('returns bucket-level session quality averages with comparison data', async () => {
    const abExperimentFindMany = (
      prisma as unknown as { aBExperiment: { findMany: ReturnType<typeof vi.fn> } }
    ).aBExperiment.findMany;
    abExperimentFindMany.mockResolvedValue([
      {
        id: 'ab-1',
        name: 'Model Prompt Test',
        status: 'active',
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: null,
        bucketConfigs: [{ bucketLabel: 'control' }, { bucketLabel: 'variant' }],
      },
    ]);
    (prisma.conversation.groupBy as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        abExperimentId: 'ab-1',
        abBucketLabel: 'control',
        _count: { _all: 3 },
      },
      {
        abExperimentId: 'ab-1',
        abBucketLabel: 'variant',
        _count: { _all: 2 },
      },
    ]);
    vi.mocked(prisma.conversation.findMany)
      .mockResolvedValueOnce([{ id: 'c-1' }, { id: 'c-2' }, { id: 'c-3' }] as never)
      .mockResolvedValueOnce([{ id: 'v-1' }, { id: 'v-2' }] as never);
    vi.mocked(prisma.sessionMetrics.aggregate)
      .mockResolvedValueOnce({
        _avg: {
          turnCount: 8,
          avgTurnLatencyMs: 1200,
          stuckLoopCount: 1,
          refusalCount: 0,
        },
      } as never)
      .mockResolvedValueOnce({
        _avg: {
          turnCount: 10,
          avgTurnLatencyMs: 900,
          stuckLoopCount: 0,
          refusalCount: 0,
        },
      } as never);
    (prisma.sessionMetrics.groupBy as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([
        { outcome: 'success', _count: { _all: 2 } },
        { outcome: 'stuck_loop', _count: { _all: 1 } },
      ] as never)
      .mockResolvedValueOnce([{ outcome: 'success', _count: { _all: 2 } }] as never);

    const response = await GET(
      new Request('http://localhost/api/admin/research/ab-results') as never,
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(prisma.conversation.findMany).toHaveBeenCalledTimes(2);
    expect(prisma.sessionMetrics.aggregate).toHaveBeenCalledTimes(2);
    expect(prisma.sessionMetrics.groupBy).toHaveBeenCalledTimes(2);
    expect(data[0]).toEqual({
      id: 'ab-1',
      name: 'Model Prompt Test',
      status: 'active',
      startDate: '2026-01-01T00:00:00.000Z',
      endDate: null,
      buckets: [
        {
          label: 'control',
          sampleSize: 3,
          avgTutorBenchScore: 66.7,
          avgTurnCount: 8,
          avgTurnLatencyMs: 1200,
          avgStuckLoopCount: 1,
          avgRefusalCount: 0,
          successRate: 66.7,
        },
        {
          label: 'variant',
          sampleSize: 2,
          avgTutorBenchScore: 100,
          avgTurnCount: 10,
          avgTurnLatencyMs: 900,
          avgStuckLoopCount: 0,
          avgRefusalCount: 0,
          successRate: 100,
        },
      ],
      comparison: {
        bestBucketLabel: 'variant',
        qualitySpread: 33.3,
        sampleSizeSpread: 1,
      },
    });
  });

  it('returns zeroed metrics when a bucket has no sessions', async () => {
    const abExperimentFindMany = (
      prisma as unknown as { aBExperiment: { findMany: ReturnType<typeof vi.fn> } }
    ).aBExperiment.findMany;
    abExperimentFindMany.mockResolvedValue([
      {
        id: 'ab-2',
        name: 'Empty Buckets',
        status: 'completed',
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: '2026-01-02T00:00:00.000Z',
        bucketConfigs: [{ bucketLabel: 'control' }],
      },
    ]);
    vi.mocked(prisma.conversation.groupBy).mockResolvedValue([]);
    vi.mocked(prisma.conversation.findMany).mockResolvedValue([] as never);

    const response = await GET(
      new Request('http://localhost/api/admin/research/ab-results') as never,
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(prisma.sessionMetrics.aggregate).not.toHaveBeenCalled();
    expect(prisma.sessionMetrics.groupBy).not.toHaveBeenCalled();
    expect(data[0]).toMatchObject({
      id: 'ab-2',
      buckets: [
        {
          label: 'control',
          sampleSize: 0,
          avgTutorBenchScore: 0,
          successRate: 0,
        },
      ],
      comparison: {
        bestBucketLabel: 'control',
        qualitySpread: 0,
        sampleSizeSpread: 0,
      },
    });
  });
});

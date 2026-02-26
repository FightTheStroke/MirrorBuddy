import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', async () => {
  const { createMockPrisma } = await import('@/test/mocks/prisma');
  return { prisma: createMockPrisma() };
});

import { prisma } from '@/lib/db';
import { detectRegression, getTrends, recordBenchmarkTrend } from './trend-service';

describe('trend-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('recordBenchmarkTrend stores all scored dimensions for a completed experiment', async () => {
    vi.mocked(prisma.researchExperiment.findUnique).mockResolvedValue({
      id: 'exp-1',
      status: 'completed',
      maestroId: 'maestro-math',
      syntheticProfileId: 'profile-a',
      completedAt: new Date('2026-02-20T10:00:00.000Z'),
      scoreScaffolding: 80,
      scoreHinting: 70,
      scoreAdaptation: 75,
      scoreMisconceptionHandling: 65,
    } as never);
    vi.mocked(prisma.$executeRaw).mockResolvedValue(1);

    const inserted = await recordBenchmarkTrend('exp-1');

    expect(inserted).toBe(4);
    expect(prisma.researchExperiment.findUnique).toHaveBeenCalledWith({
      where: { id: 'exp-1' },
      select: {
        id: true,
        status: true,
        maestroId: true,
        syntheticProfileId: true,
        completedAt: true,
        scoreScaffolding: true,
        scoreHinting: true,
        scoreAdaptation: true,
        scoreMisconceptionHandling: true,
      },
    });
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(4);
  });

  it('getTrends returns time-series rows for a maestro', async () => {
    const runDate = new Date('2026-02-24T10:00:00.000Z');
    vi.mocked(prisma.$queryRaw).mockResolvedValue([
      { dimension: 'scaffolding', score: 82.5, runDate },
      { dimension: 'hinting', score: 74, runDate },
    ]);

    const trends = await getTrends('maestro-math', 14);

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(trends).toEqual([
      { dimension: 'scaffolding', score: 82.5, runDate },
      { dimension: 'hinting', score: 74, runDate },
    ]);
  });

  it('detectRegression flags dimensions with drop above threshold', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([
      { dimension: 'scaffolding', score: 50, runDate: new Date('2026-02-25T10:00:00.000Z') },
      { dimension: 'scaffolding', score: 70, runDate: new Date('2026-02-24T10:00:00.000Z') },
      { dimension: 'scaffolding', score: 80, runDate: new Date('2026-02-23T10:00:00.000Z') },
      { dimension: 'hinting', score: 78, runDate: new Date('2026-02-25T10:00:00.000Z') },
      { dimension: 'hinting', score: 80, runDate: new Date('2026-02-24T10:00:00.000Z') },
      { dimension: 'hinting', score: 76, runDate: new Date('2026-02-23T10:00:00.000Z') },
    ]);

    const regressions = await detectRegression('maestro-math', 20);

    expect(regressions).toHaveLength(1);
    expect(regressions[0].dimension).toBe('scaffolding');
    expect(regressions[0].latestScore).toBe(50);
    expect(regressions[0].rollingAverage).toBe(75);
    expect(regressions[0].dropPercent).toBeCloseTo(33.33, 1);
  });
});

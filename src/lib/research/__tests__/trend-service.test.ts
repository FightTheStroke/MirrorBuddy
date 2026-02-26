import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', async () => {
  const { createMockPrisma } = await import('@/test/mocks/prisma');
  return { prisma: createMockPrisma() };
});

import { prisma } from '@/lib/db';
import { detectRegression, getTrends, recordBenchmarkTrend } from '../trend-service';

describe('trend-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('recordBenchmarkTrend stores the expected benchmark rows', async () => {
    const completedAt = new Date('2026-02-20T10:00:00.000Z');
    vi.mocked(prisma.researchExperiment.findUnique).mockResolvedValue({
      id: 'exp-1',
      status: 'completed',
      maestroId: 'maestro-math',
      syntheticProfileId: 'profile-a',
      completedAt,
      scoreScaffolding: 88,
      scoreHinting: 72,
      scoreAdaptation: null,
      scoreMisconceptionHandling: 65,
    } as never);
    vi.mocked(prisma.$executeRaw).mockResolvedValue(1);

    const inserted = await recordBenchmarkTrend('exp-1');

    expect(inserted).toBe(3);
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(3);
    expect(vi.mocked(prisma.$executeRaw).mock.calls[0].slice(1)).toEqual([
      'maestro-math',
      'profile-a',
      'scaffolding',
      88,
      completedAt,
      'exp-1',
    ]);
    expect(vi.mocked(prisma.$executeRaw).mock.calls[1].slice(1)).toEqual([
      'maestro-math',
      'profile-a',
      'hinting',
      72,
      completedAt,
      'exp-1',
    ]);
    expect(vi.mocked(prisma.$executeRaw).mock.calls[2].slice(1)).toEqual([
      'maestro-math',
      'profile-a',
      'misconceptionHandling',
      65,
      completedAt,
      'exp-1',
    ]);
  });

  it('getTrends returns a runDate sorted time series', async () => {
    const olderDate = new Date('2026-02-23T10:00:00.000Z');
    const newerDate = new Date('2026-02-24T10:00:00.000Z');
    vi.mocked(prisma.$queryRaw).mockResolvedValue([
      { dimension: 'scaffolding', score: 82, runDate: newerDate },
      { dimension: 'scaffolding', score: 79, runDate: olderDate },
    ]);

    const trends = await getTrends('maestro-math', 14);

    expect(trends).toEqual([
      { dimension: 'scaffolding', score: 79, runDate: olderDate },
      { dimension: 'scaffolding', score: 82, runDate: newerDate },
    ]);
  });

  it('detectRegression flags drops above threshold and ignores fluctuations', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([
      { dimension: 'scaffolding', score: 100, runDate: new Date('2026-02-22T10:00:00.000Z') },
      { dimension: 'scaffolding', score: 90, runDate: new Date('2026-02-23T10:00:00.000Z') },
      { dimension: 'scaffolding', score: 60, runDate: new Date('2026-02-24T10:00:00.000Z') },
      { dimension: 'hinting', score: 80, runDate: new Date('2026-02-22T10:00:00.000Z') },
      { dimension: 'hinting', score: 79, runDate: new Date('2026-02-23T10:00:00.000Z') },
      { dimension: 'hinting', score: 77, runDate: new Date('2026-02-24T10:00:00.000Z') },
      { dimension: 'adaptation', score: 50, runDate: new Date('2026-02-22T10:00:00.000Z') },
      { dimension: 'adaptation', score: 50, runDate: new Date('2026-02-23T10:00:00.000Z') },
      { dimension: 'adaptation', score: 40, runDate: new Date('2026-02-24T10:00:00.000Z') },
    ]);

    const regressions = await detectRegression('maestro-math', 20);

    expect(regressions).toHaveLength(1);
    expect(regressions[0].dimension).toBe('scaffolding');
    expect(regressions[0].latestScore).toBe(60);
    expect(regressions[0].rollingAverage).toBe(95);
    expect(regressions[0].dropPercent).toBeCloseTo(36.84, 2);
  });
});

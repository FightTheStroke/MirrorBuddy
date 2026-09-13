// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as sessionMetrics } from '../session-metrics/route';
import { GET as fsrsStats } from '../fsrs-stats/route';
import { GET as tokenUsage } from '../token-usage/route';

const db = vi.hoisted(() => ({
  sessionMetrics: { aggregate: vi.fn(), groupBy: vi.fn(), findMany: vi.fn() },
  telemetryEvent: { findMany: vi.fn() },
  flashcardProgress: { count: vi.fn(), groupBy: vi.fn() },
}));
vi.mock('@/lib/db', () => ({ prisma: db }));
vi.mock('@/lib/api/middlewares', () => ({
  pipe:
    (..._middleware: unknown[]) =>
    (handler: (context: { req: NextRequest }) => Promise<Response>) =>
    (req: NextRequest) =>
      handler({ req }),
  withSentry: vi.fn(),
  withAdmin: vi.fn(),
  withAdminReadOnly: vi.fn(),
}));

describe('actual dashboard analytics metric truth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.sessionMetrics.aggregate.mockResolvedValue({
      _count: 0,
      _sum: {
        turnCount: null,
        tokensIn: null,
        tokensOut: null,
        voiceMinutes: null,
        costEur: null,
        refusalCount: null,
        refusalCorrect: null,
        stuckLoopCount: null,
        jailbreakAttempts: null,
      },
      _avg: { avgTurnLatencyMs: null, costEur: null, turnCount: null },
    });
    db.sessionMetrics.groupBy.mockResolvedValue([]);
    db.sessionMetrics.findMany.mockResolvedValue([]);
    db.telemetryEvent.findMany.mockResolvedValue([]);
    db.flashcardProgress.count.mockResolvedValue(0);
    db.flashcardProgress.groupBy.mockResolvedValue([]);
  });

  it('distinguishes zero recorded sessions from zero-denominator safety accuracy', async () => {
    const response = await sessionMetrics(
      new NextRequest('http://localhost/api/dashboard/session-metrics?days=7'),
    );
    const data = await response.json();
    expect(data.summary.totalSessions).toBe(0);
    expect(data.safety.refusalAccuracy).toBeNull();
    expect(data.metrics['summary.totalSessions']).toMatchObject({
      value: 0,
      status: 'measured',
      population: 'recordedTelemetry',
      coverage: null,
    });
    expect(data.metrics['safety.refusalAccuracy']).toMatchObject({
      value: null,
      status: 'unavailable',
      unavailabilityReason: 'zeroDenominator',
    });
    expect(data.metrics['cost.totalEur']).toMatchObject({ value: 0, estimate: 'tokenPricing' });
    expect(db.sessionMetrics.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isTestData: false }),
      }),
    );
  });

  it('keeps flashcard snapshot provenance separate from historical telemetry coverage', async () => {
    const response = await fsrsStats(
      new NextRequest('http://localhost/api/dashboard/fsrs-stats?days=7'),
    );
    const data = await response.json();
    expect(data.summary.accuracy).toBeNull();
    expect(data.metrics['summary.totalCards']).toMatchObject({
      source: 'FlashcardProgress (isTestData=false)',
      population: 'records',
      window: { start: null },
    });
    expect(data.metrics['summary.totalReviews']).toMatchObject({
      status: 'measured',
      value: 0,
      population: 'recordedTelemetry',
      coverage: null,
    });
    expect(data.metrics['summary.totalReviews'].computedAt).toEqual(expect.any(String));
  });

  it('does not report unknown recorded token sums as zero', async () => {
    db.sessionMetrics.aggregate.mockResolvedValue({
      _count: 3,
      _sum: { tokensIn: null, tokensOut: null, costEur: null },
    });
    const response = await tokenUsage(
      new NextRequest('http://localhost/api/dashboard/token-usage'),
    );
    const data = await response.json();
    expect(data.metrics['summary.totalTokens'].value).toBeNull();
  });

  it('does not swallow a collection failure into successful empty data', async () => {
    db.sessionMetrics.aggregate.mockRejectedValue(new Error('synthetic query failed'));
    await expect(
      sessionMetrics(new NextRequest('http://localhost/api/dashboard/session-metrics')),
    ).rejects.toThrow('synthetic query failed');
  });

  it('does not use a missing refusal assessment as a 0% accuracy observation', async () => {
    db.sessionMetrics.aggregate.mockResolvedValue({
      _count: 1,
      _sum: { refusalCount: 4, refusalCorrect: null, tokensIn: 0, tokensOut: 0 },
      _avg: {},
    });
    const response = await sessionMetrics(
      new NextRequest('http://localhost/api/dashboard/session-metrics'),
    );
    const data = await response.json();
    expect(data.safety.refusalAccuracy).toBeNull();
    expect(data.metrics['safety.refusalAccuracy'].unavailabilityReason).toBe('missingData');
    expect(data.cost.p95PerSession).toBeNull();
    expect(data.metrics['cost.p95PerSession'].unavailabilityReason).toBe('zeroDenominator');
  });

  it.each(['0', '-3', 'not-a-number'])('rejects invalid measurement window %s', async (days) => {
    const response = await sessionMetrics(
      new NextRequest(`http://localhost/api/dashboard/session-metrics?days=${days}`),
    );
    expect(response.status).toBe(400);
    expect(db.sessionMetrics.aggregate).not.toHaveBeenCalled();
  });
});

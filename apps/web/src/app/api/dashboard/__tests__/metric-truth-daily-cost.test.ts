// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as sessions } from '../session-metrics/route';
import { GET as tokens } from '../token-usage/route';

const db = vi.hoisted(() => ({
  sessionMetrics: { aggregate: vi.fn(), groupBy: vi.fn(), findMany: vi.fn() },
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

describe.each([
  { name: 'sessions', handler: sessions, prefix: 'dailyBreakdown', suffix: '.cost' },
  { name: 'tokens', handler: tokens, prefix: 'dailyCost', suffix: '' },
])('actual $name daily cost truth', ({ handler, prefix, suffix }) => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.sessionMetrics.aggregate.mockResolvedValue({
      _count: 3,
      _sum: {
        turnCount: 0,
        tokensIn: 3,
        tokensOut: 0,
        voiceMinutes: 0,
        costEur: null,
        refusalCount: 0,
        refusalCorrect: 0,
        stuckLoopCount: 0,
        jailbreakAttempts: 0,
      },
      _avg: { avgTurnLatencyMs: 0, costEur: null, turnCount: 0 },
    });
    db.sessionMetrics.findMany.mockResolvedValue([{ costEur: 0 }]);
  });

  it.each([
    [null, 1],
    [1, null],
    [null, 0],
  ])(
    'does not erase an unknown daily sum when grouped costs are %s then %s',
    async (first, second) => {
      const rows = [first, second, 0].map((costEur, index) => ({
        createdAt: new Date(index === 2 ? '2026-09-04T12:00:00Z' : `2026-09-05T1${index}:00:00Z`),
        _count: 1,
        _sum: { costEur, tokensIn: 1, tokensOut: 0 },
      }));
      db.sessionMetrics.groupBy.mockImplementation(async ({ by }: { by: string[] }) =>
        by.includes('createdAt') ? rows : [],
      );
      const response = await handler(
        new NextRequest('http://localhost/api/dashboard/metrics?days=7'),
      );
      const data = await response.json();
      const unknownDay = data[prefix]['2026-09-05'];
      const zeroDay = data[prefix]['2026-09-04'];
      expect(suffix ? unknownDay.cost : unknownDay).toBeNull();
      expect(suffix ? zeroDay.cost : zeroDay).toBe(0);
      expect(data.metrics[`${prefix}.2026-09-05${suffix}`]).toMatchObject({
        value: null,
        status: 'unavailable',
        unavailabilityReason: 'missingData',
      });
      expect(data.metrics[`${prefix}.2026-09-04${suffix}`]).toMatchObject({
        value: 0,
        status: 'estimated',
        estimate: 'tokenPricing',
      });
    },
  );
});

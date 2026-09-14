// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Prisma } from '@prisma/client';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAdminCounts } from '../admin-counts-service';
import { getBusinessKPIs, clearCache } from '../business-kpi-service';
import { GET as sessions } from '@/app/api/dashboard/session-metrics/route';

const db = vi.hoisted(() => {
  const security = () => ({
    count: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    findFirstOrThrow: vi.fn(),
    aggregate: vi.fn(),
    groupBy: vi.fn(),
  });
  return {
    authSession: security(),
    sSOSession: security(),
    user: { count: vi.fn() },
    inviteRequest: { count: vi.fn() },
    safetyEvent: { count: vi.fn() },
    userSubscription: { count: vi.fn(), findMany: vi.fn() },
    settings: { groupBy: vi.fn() },
    conversation: { groupBy: vi.fn() },
    sessionMetrics: { aggregate: vi.fn(), groupBy: vi.fn(), findMany: vi.fn() },
  };
});
vi.mock('@/lib/db', () => ({ prisma: db }));
vi.mock('@/lib/api/middlewares', () => ({
  // This selects only the post-authorization route body, not the authentication phase.
  pipe:
    (..._middleware: unknown[]) =>
    (handler: (context: { req: NextRequest }) => Promise<Response>) =>
    (req: NextRequest) =>
      handler({ req }),
  withSentry: vi.fn(),
  withAdminReadOnly: vi.fn(),
}));

const securityModels = [
  'authSession',
  'sSOSession',
] as const satisfies readonly (keyof Prisma.TransactionClient)[];
const reads = [
  'count',
  'findUnique',
  'findMany',
  'findFirst',
  'findUniqueOrThrow',
  'findFirstOrThrow',
  'aggregate',
  'groupBy',
] as const satisfies readonly (keyof Prisma.TransactionClient['authSession'])[];

function beginMetricPhase() {
  for (const model of securityModels) for (const read of reads) db[model][read].mockClear();
}
function assertNoSecurityReads() {
  for (const model of securityModels)
    for (const read of reads) {
      expect(
        db[model][read],
        `${model}.${read} must not supply metric activity or coverage`,
      ).not.toHaveBeenCalled();
    }
}

beforeEach(() => {
  vi.resetAllMocks();
  clearCache();
  db.user.count.mockResolvedValue(7);
  db.inviteRequest.count.mockResolvedValue(0);
  db.safetyEvent.count.mockResolvedValue(0);
  db.userSubscription.count.mockResolvedValue(0);
  db.userSubscription.findMany.mockResolvedValue([]);
  db.settings.groupBy.mockResolvedValue([]);
  db.conversation.groupBy.mockResolvedValue([]);
  db.sessionMetrics.findMany.mockResolvedValue([{ costEur: 0 }]);
  db.sessionMetrics.groupBy.mockResolvedValue([]);
  db.sessionMetrics.aggregate.mockResolvedValue({
    _count: 2,
    _sum: {
      tokensIn: 100,
      tokensOut: 50,
      costEur: 0,
      voiceMinutes: 0,
      turnCount: 2,
      refusalCount: 0,
      refusalCorrect: 0,
      stuckLoopCount: 0,
      jailbreakAttempts: 0,
    },
    _avg: { costEur: 0, turnCount: 1, avgTurnLatencyMs: 0 },
  });
});

describe('post-authorization metric sources never use security sessions', () => {
  it('allows prior auth lookups but keeps aggregate population/coverage independent', async () => {
    await prisma.authSession.findUnique({ where: { handleHash: 'synthetic-auth-phase' } });
    expect(db.authSession.findUnique).toHaveBeenCalledOnce();
    beginMetricPhase();

    const counts = await getAdminCounts();
    const business = await getBusinessKPIs();
    const data = await (
      await sessions(new NextRequest('http://localhost/api/dashboard/session-metrics'))
    ).json();

    assertNoSecurityReads();
    expect(counts.activeUsers24h).toBeNull();
    expect(counts.metrics.activeUsers24h.coverage).toBeNull();
    expect(business.users.activeUsers).toBeNull();
    expect(data.metrics['summary.totalSessions']).toMatchObject({
      value: 2,
      population: 'recordedTelemetry',
      coverage: null,
    });
    expect(db.sessionMetrics.aggregate).toHaveBeenCalled();
    expect(db.sessionMetrics.findMany).toHaveBeenCalled();
    expect(db.conversation.groupBy).toHaveBeenCalled();
  });

  it.each(securityModels)(
    'negative control detects %s on the actual selected count path',
    async (model) => {
      beginMetricPhase();
      db.user.count.mockImplementationOnce(async () => {
        if (model === 'authSession') await prisma.authSession.count();
        else await prisma.sSOSession.count();
        return 7;
      });
      await getAdminCounts();
      expect(db[model].count).toHaveBeenCalledOnce();
      expect(() => assertNoSecurityReads()).toThrow();
    },
  );
});

// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, clearDashboardSummaryCache } from './route';
import { clearCache } from '@/lib/admin/business-kpi-service';
import { invalidateHealthCache } from '@/lib/admin/health-aggregator';

const db = vi.hoisted(() => ({
  safetyEvent: { count: vi.fn() },
  sessionMetrics: { aggregate: vi.fn() },
  user: { count: vi.fn() },
  userSubscription: { count: vi.fn(), findMany: vi.fn() },
  settings: { groupBy: vi.fn() },
  conversation: { groupBy: vi.fn() },
}));
vi.mock('@/lib/db', () => ({ prisma: db }));
vi.mock('@/lib/api/middlewares', () => ({
  pipe:
    (..._middleware: unknown[]) =>
    (handler: (context: { req: NextRequest }) => Promise<Response>) =>
    (req: NextRequest) =>
      handler({ req }),
  withSentry: vi.fn(),
  withAdminReadOnly: vi.fn(),
}));
vi.mock('@/lib/admin/health-checks', () => {
  const service = (name: string) =>
    vi.fn(async () => ({
      name,
      status: 'healthy',
      configured: true,
      lastChecked: new Date(),
    }));
  return {
    checkDatabase: service('Database'),
    checkRedis: service('Redis/KV'),
    checkAzureOpenAI: service('Azure OpenAI'),
    checkResend: service('Resend'),
    checkSentry: service('Sentry'),
    checkVercel: service('Vercel'),
  };
});

async function summary() {
  const response = await GET(new NextRequest('http://localhost/api/admin/dashboard-summary'));
  expect(response.status).toBe(200);
  return response.json();
}

describe('dashboard summary actual service integration, synthetic query boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearDashboardSummaryCache();
    clearCache();
    invalidateHealthCache();
    db.safetyEvent.count.mockResolvedValue(4);
    db.sessionMetrics.aggregate.mockResolvedValue({ _count: 2, _sum: { costEur: 14 } });
    db.user.count.mockResolvedValue(10);
    db.userSubscription.count.mockResolvedValue(2);
    db.userSubscription.findMany.mockResolvedValue([{ tier: { monthlyPriceEur: 9.99 } }]);
    db.settings.groupBy.mockResolvedValue([]);
    db.conversation.groupBy.mockResolvedValue([]);
  });
  afterEach(() => vi.useRealTimers());

  it('uses the real session model and exposes cost estimate and unknown telemetry coverage', async () => {
    const data = await summary();
    expect(data.cost.totalEur).toBe(14);
    expect(data.metrics.dailyCost).toMatchObject({
      value: 2,
      source: 'SessionMetrics.costEur',
      population: 'recordedTelemetry',
      status: 'estimated',
      estimate: 'tokenPricing',
      coverage: null,
    });
    expect(data.metrics.mrr.value).toBe(9.99);
    expect(data.business.trialConversionRate).toBeNull();
    expect(db.sessionMetrics.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isTestData: false }),
      }),
    );
  });

  it('preserves separate metric timestamps across cached summary responses', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-06T00:00:00Z'));
    const first = await summary();
    vi.setSystemTime(new Date('2026-09-06T00:00:10Z'));
    const second = await summary();
    expect(second).toEqual(first);
    expect(db.sessionMetrics.aggregate).toHaveBeenCalledTimes(1);
  });

  it('reports query failures as missing values, not estimated zero or healthy safety', async () => {
    db.safetyEvent.count.mockRejectedValue(new Error('synthetic unavailable'));
    db.sessionMetrics.aggregate.mockRejectedValue(new Error('synthetic unavailable'));
    const data = await summary();
    expect(data.safety.unresolvedCount).toBeNull();
    expect(data.cost.totalEur).toBeNull();
    expect(data.metrics.dailyCost).toMatchObject({ value: null, status: 'failed', estimate: null });
    expect(data.metrics.safety.status).toBe('failed');
    expect(data.metrics.mrr.value).toBe(9.99);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, clearDashboardSummaryCache } from './route';
import { prisma } from '@/lib/db';
import { aggregateHealth } from '@/lib/admin/health-aggregator';
import { getBusinessKPIs } from '@/lib/admin/business-kpi-service';

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

vi.mock('@/lib/admin/health-aggregator', () => ({
  aggregateHealth: vi.fn(),
}));

vi.mock('@/lib/admin/business-kpi-service', () => ({
  getBusinessKPIs: vi.fn(),
}));

type SessionCostMock = {
  sessionCost: {
    aggregate: ReturnType<typeof vi.fn>;
  };
};

describe('GET /api/admin/dashboard-summary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearDashboardSummaryCache();
    (prisma as unknown as SessionCostMock).sessionCost = {
      aggregate: vi.fn(),
    };
  });

  it('returns aggregated dashboard summary metrics', async () => {
    vi.mocked(aggregateHealth).mockResolvedValue({
      services: [
        { status: 'down', configured: true },
        { status: 'healthy', configured: true },
      ],
      overallStatus: 'degraded',
      checkedAt: new Date('2026-03-01T12:00:00Z'),
      configuredCount: 2,
      unconfiguredCount: 0,
    } as never);
    vi.mocked(prisma.safetyEvent.count).mockResolvedValue(4);
    (prisma as unknown as SessionCostMock).sessionCost.aggregate.mockResolvedValue({
      _sum: { totalEur: 15.678 },
    });
    vi.mocked(getBusinessKPIs).mockResolvedValue({
      revenue: { mrr: 99.99 },
      users: { trialConversionRate: 12.5, churnRate: 4.2 },
    } as never);

    const response = await GET(
      new Request('http://localhost/api/admin/dashboard-summary') as never,
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(aggregateHealth).toHaveBeenCalledTimes(1);
    expect(prisma.safetyEvent.count).toHaveBeenCalledWith({
      where: { resolvedAt: null },
    });
    expect((prisma as unknown as SessionCostMock).sessionCost.aggregate).toHaveBeenCalledWith({
      where: { createdAt: { gte: expect.any(Date) } },
      _sum: { totalEur: true },
    });
    expect(getBusinessKPIs).toHaveBeenCalledTimes(1);
    expect(data).toMatchObject({
      health: {
        overallStatus: 'degraded',
        servicesDownCount: 1,
      },
      safety: {
        unresolvedCount: 4,
      },
      cost: {
        totalEur: 15.68,
      },
      business: {
        mrr: 99.99,
        trialConversionRate: 12.5,
        churnRate: 4.2,
      },
    });
  });

  it('uses in-memory cache for 30 seconds', async () => {
    vi.mocked(aggregateHealth).mockResolvedValue({
      services: [],
      overallStatus: 'healthy',
      checkedAt: new Date('2026-03-01T12:00:00Z'),
      configuredCount: 0,
      unconfiguredCount: 0,
    } as never);
    vi.mocked(prisma.safetyEvent.count).mockResolvedValue(0);
    (prisma as unknown as SessionCostMock).sessionCost.aggregate.mockResolvedValue({
      _sum: { totalEur: 0 },
    });
    vi.mocked(getBusinessKPIs).mockResolvedValue({
      revenue: { mrr: 0 },
      users: { trialConversionRate: 0, churnRate: 0 },
    } as never);

    const first = await GET(new Request('http://localhost/api/admin/dashboard-summary') as never);
    const second = await GET(new Request('http://localhost/api/admin/dashboard-summary') as never);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(aggregateHealth).toHaveBeenCalledTimes(1);
    expect(prisma.safetyEvent.count).toHaveBeenCalledTimes(1);
    expect((prisma as unknown as SessionCostMock).sessionCost.aggregate).toHaveBeenCalledTimes(1);
    expect(getBusinessKPIs).toHaveBeenCalledTimes(1);
  });
});

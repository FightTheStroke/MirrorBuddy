import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getBusinessKPIs, clearCache } from '../business-kpi-service';

const db = vi.hoisted(() => ({
  userSubscription: { findMany: vi.fn(), count: vi.fn() },
  user: { count: vi.fn() },
  settings: { groupBy: vi.fn() },
  conversation: { groupBy: vi.fn() },
}));
vi.mock('@/lib/db', () => ({ prisma: db }));

describe('business metric truth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearCache();
    db.userSubscription.findMany.mockResolvedValue([{ tier: { monthlyPriceEur: 10 } }]);
    db.userSubscription.count.mockResolvedValue(0);
    db.user.count.mockResolvedValue(5);
    db.settings.groupBy.mockResolvedValue([]);
    db.conversation.groupBy.mockResolvedValue([]);
  });

  it('labels price-based revenue estimates and rejects unsupported cohorts/activity', async () => {
    const result = await getBusinessKPIs();
    expect(result.metrics.mrr).toMatchObject({
      value: 10,
      status: 'estimated',
      estimate: 'subscriptionPrice',
    });
    expect(result.users.activeUsers).toBeNull();
    expect(result.users.trialConversionRate).toBeNull();
    expect(result.users.churnRate).toBeNull();
    expect(result.metrics.trialConversionRate.unavailabilityReason).toBe('unsupportedCohort');
  });

  it('does not replace failed queries with estimated zero revenue', async () => {
    db.userSubscription.findMany.mockRejectedValue(new Error('synthetic failure'));
    const result = await getBusinessKPIs();
    expect(result.revenue.mrr).toBeNull();
    expect(result.metrics.mrr).toMatchObject({ status: 'failed', value: null, estimate: null });
    expect(result.users.totalUsers).toBe(5);
  });

  it('retains cached computation timestamps', async () => {
    const first = await getBusinessKPIs();
    const second = await getBusinessKPIs();
    expect(second.metrics.mrr.computedAt).toBe(first.metrics.mrr.computedAt);
    expect(db.userSubscription.findMany).toHaveBeenCalledTimes(1);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { collectActivityMetrics } from '../activity-metrics';
import { collectChurnMetrics } from '../churn-metrics';
import { collectFunnelMetrics } from '../funnel-metrics';
import { collectWaitlistMetrics } from '../waitlist-metrics';
import type { CollectorContext } from '../collector-utils';

const db = vi.hoisted(() => ({
  query: vi.fn(),
  cleanup: vi.fn(),
  funnel: vi.fn(),
  waitlist: vi.fn(),
}));
vi.mock('@/lib/db', () => ({
  prisma: {
    $queryRaw: db.query,
    userActivity: { deleteMany: db.cleanup },
    funnelEvent: { groupBy: db.funnel },
    waitlistEntry: { count: db.waitlist },
  },
}));
const context = (): CollectorContext => ({
  samples: [],
  now: 1700000000123,
  instanceLabels: { instance: 'mirrorbuddy', env: 'production' },
});
beforeEach(() => vi.resetAllMocks());

describe('extracted metric fidelity', () => {
  it('retains every activity family, labels, values, timestamp, query filters and cleanup', async () => {
    db.query
      .mockResolvedValueOnce([
        { userType: 'logged', count: BigInt(3) },
        { userType: 'trial', count: BigInt(2) },
        { userType: 'anonymous', count: BigInt(1) },
      ])
      .mockResolvedValueOnce([{ route: '/learn', count: BigInt(4) }]);
    db.cleanup.mockResolvedValue({ count: 1 });
    const data = context();
    await collectActivityMetrics(data);
    expect(data.samples).toEqual([
      ...Object.entries({ total: 6, logged: 3, trial: 2, anonymous: 1 }).map(([type, value]) => ({
        name: 'mirrorbuddy_realtime_active_users',
        labels: { ...data.instanceLabels, user_type: type },
        value,
        timestamp: data.now,
      })),
      {
        name: 'mirrorbuddy_trial_sessions_active',
        labels: data.instanceLabels,
        value: 2,
        timestamp: data.now,
      },
      {
        name: 'mirrorbuddy_trial_to_total_ratio',
        labels: data.instanceLabels,
        value: 1 / 3,
        timestamp: data.now,
      },
      {
        name: 'mirrorbuddy_realtime_active_users_by_route',
        labels: { ...data.instanceLabels, route: '/learn' },
        value: 4,
        timestamp: data.now,
      },
    ]);
    for (const call of db.query.mock.calls) {
      expect(call[0].join('')).toContain('"isTestData" = false');
      expect(call[1]).toEqual(new Date(data.now - 300000));
    }
    expect(db.cleanup).toHaveBeenCalledExactlyOnceWith({
      where: { timestamp: { lt: new Date(data.now - 600000) } },
    });
  });
  it('retains seven stage transitions and the overall conversion', async () => {
    db.funnel.mockResolvedValue([
      { stage: 'VISITOR', _count: { _all: 10 } },
      { stage: 'TRIAL_START', _count: { _all: 5 } },
      { stage: 'ACTIVE', _count: { _all: 2 } },
    ]);
    const data = context();
    await collectFunnelMetrics(data);
    expect(data.samples).toHaveLength(11);
    expect(
      data.samples.filter((sample) => sample.name === 'mirrorbuddy_funnel_conversion_rate'),
    ).toHaveLength(7);
    expect(data.samples).toContainEqual({
      name: 'mirrorbuddy_funnel_conversion_rate',
      labels: { ...data.instanceLabels, from_stage: 'VISITOR', to_stage: 'TRIAL_START' },
      value: 0.5,
      timestamp: data.now,
    });
    expect(data.samples.at(-1)).toMatchObject({
      name: 'mirrorbuddy_funnel_overall_conversion',
      value: 0.2,
    });
    expect(db.funnel).toHaveBeenCalledExactlyOnceWith({
      by: ['stage'],
      where: { createdAt: { gte: new Date(data.now - 30 * 86400000) }, isTestData: false },
      _count: { _all: true },
    });
  });
  it('retains all churn families including stage-level labels', async () => {
    db.query.mockResolvedValue([
      { stage: 'TRIAL_START', is_churned: true },
      { stage: 'TRIAL_START', is_churned: false },
      { stage: 'ACTIVE', is_churned: false },
    ]);
    const data = context();
    await collectChurnMetrics(data);
    expect(data.samples.map(({ name, value }) => [name, value])).toEqual([
      ['mirrorbuddy_funnel_total_users', 3],
      ['mirrorbuddy_funnel_churned_users', 1],
      ['mirrorbuddy_funnel_churn_rate', 1 / 3],
      ['mirrorbuddy_funnel_stage_churn_rate', 0.5],
      ['mirrorbuddy_funnel_stage_churn_rate', 0],
    ]);
    expect(data.samples[3].labels).toEqual({ ...data.instanceLabels, stage: 'TRIAL_START' });
    expect(data.samples.every((sample) => sample.timestamp === data.now)).toBe(true);
    expect(db.query.mock.calls[0][1]).toEqual(new Date(data.now - 14 * 86400000));
  });
  it.each([null, undefined])(
    'rejects missing waitlist totals (%s) without fabricated ratios',
    async (total) => {
      db.waitlist.mockResolvedValue(2).mockResolvedValueOnce(total);
      const data = context();
      await expect(collectWaitlistMetrics(data)).rejects.toThrow();
      expect(data.samples).toEqual([]);
    },
  );
  it.each([null, undefined])(
    'rejects missing activity counts (%s) instead of Number(null)=0',
    async (count) => {
      db.query.mockResolvedValueOnce([{ userType: 'logged', count }]).mockResolvedValueOnce([]);
      const data = context();
      await expect(collectActivityMetrics(data)).rejects.toThrow();
      expect(data.samples).toEqual([]);
    },
  );
});

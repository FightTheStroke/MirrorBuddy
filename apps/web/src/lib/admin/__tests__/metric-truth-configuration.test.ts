import { describe, expect, it } from 'vitest';
import { withMetricTruth } from '../analytics-metric-truth';

describe('metric truth configuration boundaries', () => {
  it('retains raw configuration without claiming it was measured from session records', () => {
    const payload = {
      period: { days: 7, startDate: '2026-09-01T00:00:00Z' },
      summary: { totalSessions: 0 },
      cost: {
        totalEur: 0,
        thresholds: { textWarn: 0.05, voiceLimit: 0.3 },
        pricing: { textPer1kTokens: 0.002, voicePerMin: 0.04 },
      },
    };
    const response = withMetricTruth(payload, {
      source: 'SessionMetrics',
      computedAt: '2026-09-08T00:00:00Z',
      window: { start: payload.period.startDate, end: '2026-09-08T00:00:00Z' },
    });
    expect(response.period).toEqual(payload.period);
    expect(response.cost).toEqual(payload.cost);
    expect(Object.keys(response.metrics ?? {}).sort()).toEqual([
      'cost.totalEur',
      'summary.totalSessions',
    ]);
    expect(response.metrics?.['summary.totalSessions']).toMatchObject({
      value: 0,
      status: 'measured',
    });
    expect(response.metrics?.['cost.totalEur'].window.start).toBe(payload.period.startDate);
  });
});

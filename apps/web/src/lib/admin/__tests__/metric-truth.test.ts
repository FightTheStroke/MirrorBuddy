import { describe, expect, it } from 'vitest';
import { metricTruth, metricStatus } from '../metric-truth';

const computedAt = '2026-09-06T00:00:00.000Z';
const window = { start: '2026-09-05T00:00:00.000Z', end: computedAt };
const context = { source: 'TelemetryEvent', window, computedAt };

describe('metric truth', () => {
  it('rejects DAU and longer windows from ten-minute activity retention', () => {
    for (const days of [1, 7, 30]) {
      const metric = metricTruth(42, {
        ...context,
        source: 'UserActivity',
        window: {
          start: new Date(Date.parse(computedAt) - days * 86_400_000).toISOString(),
          end: computedAt,
        },
      });
      expect(metric.value).toBeNull();
      expect(metric.status).toBe('unavailable');
      expect(metric.unavailabilityReason).toBe('retentionWindow');
    }
  });

  it('distinguishes explicit optional off, collection failure, zero and unknown', () => {
    expect(metricTruth(null, { ...context, reason: 'optionalDisabled' }).status).toBe('disabled');
    expect(metricTruth(null, { ...context, reason: 'collectionFailed' }).status).toBe('failed');
    expect(metricTruth(0, context)).toMatchObject({ value: 0, status: 'measured' });
    expect(metricTruth(undefined, context)).toMatchObject({
      value: null,
      status: 'unavailable',
      unavailabilityReason: 'missingData',
    });
  });

  it('keeps historical recorded population and unknown consent coverage honest', () => {
    const metric = metricTruth(0, { ...context, population: 'recordedTelemetry' });
    expect(metric.population).toBe('recordedTelemetry');
    expect(metric.coverage).toBeNull();
    expect(metric.value).toBe(0);
  });

  it('preserves known eligible subset coverage without extrapolation', () => {
    const metric = metricTruth(2, {
      ...context,
      population: 'eligibleOptIn',
      coverage: { observed: 2, total: 8 },
    });
    expect(metric.value).toBe(2);
    expect(metric.coverage).toEqual({ observed: 2, total: 8 });
  });

  it('marks old samples stale without changing their computation timestamp', () => {
    const metric = metricTruth(3, context);
    expect(metricStatus(metric, Date.parse(computedAt) + metric.freshnessThresholdMs + 1)).toBe(
      'stale',
    );
    expect(metric.computedAt).toBe(computedAt);
  });

  it('does not turn missing provenance or invalid numbers into current values', () => {
    expect(metricTruth(4, { ...context, computedAt: null }).value).toBeNull();
    expect(metricTruth(Number.NaN, context).value).toBeNull();
    expect(metricTruth(4, null).value).toBeNull();
    expect(metricTruth(4, undefined).value).toBeNull();
  });

  it('requires a real value for an estimate and preserves its provenance', () => {
    expect(metricTruth(3, { ...context, estimate: 'tokenPricing' })).toMatchObject({
      value: 3,
      status: 'estimated',
      estimate: 'tokenPricing',
    });
    expect(
      metricTruth(null, { ...context, estimate: 'tokenPricing', reason: 'collectionFailed' }),
    ).toMatchObject({ value: null, status: 'failed' });
  });
});

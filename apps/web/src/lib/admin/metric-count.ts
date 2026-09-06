import { metricTruth, type MetricTruth } from './metric-truth';

export function normalizeCountMetric(metric: MetricTruth | null | undefined): MetricTruth {
  const available =
    metric &&
    (metric.status === 'measured' || (metric.status === 'estimated' && metric.estimate)) &&
    metric.unavailabilityReason === null &&
    typeof metric.value === 'number' &&
    Number.isFinite(metric.value) &&
    metric.value >= 0 &&
    typeof metric.source === 'string' &&
    metric.source.trim() &&
    typeof metric.computedAt === 'string' &&
    metric.window &&
    (metric.window.start === null || typeof metric.window.start === 'string') &&
    typeof metric.window.end === 'string' &&
    Number.isFinite(metric.freshnessThresholdMs) &&
    metric.freshnessThresholdMs > 0;
  return metricTruth(available ? metric.value : null, {
    source: typeof metric?.source === 'string' ? metric.source.trim() : '',
    window: {
      start: typeof metric?.window?.start === 'string' ? metric.window.start : null,
      end: typeof metric?.window?.end === 'string' ? metric.window.end : null,
    },
    computedAt: typeof metric?.computedAt === 'string' ? metric.computedAt : null,
    reason: metric?.unavailabilityReason ?? (available ? null : 'missingData'),
    population: metric?.population,
    coverage: metric?.coverage,
    estimate: metric?.estimate,
  });
}

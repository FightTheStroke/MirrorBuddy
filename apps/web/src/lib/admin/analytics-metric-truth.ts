import { metricTruth, type MetricContext, type MetricTruth } from './metric-truth';

export interface AnalyticsMetricPayload {
  metrics?: Record<string, MetricTruth>;
  provenance?: MetricTruth;
}

const CONFIGURATION_PREFIXES = ['period', 'cost.thresholds', 'cost.pricing'];

/** Attach server-computed provenance to numeric leaves without changing existing API URLs/fields. */
export function withMetricTruth<T extends object>(
  payload: T,
  context: MetricContext,
  overrides: Record<string, Partial<MetricContext>> = {},
): T & AnalyticsMetricPayload {
  const metrics: Record<string, MetricTruth> = {};
  const visit = (value: unknown, path: string) => {
    if (CONFIGURATION_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}.`)))
      return;
    if (typeof value === 'number' || value === null) {
      metrics[path] = metricTruth(value, { ...context, ...overrides[path] });
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      for (const [key, child] of Object.entries(value)) visit(child, path ? `${path}.${key}` : key);
    }
  };
  visit(payload, '');
  return { ...payload, metrics, provenance: metricTruth(1, context) };
}

export function analyticsContext(
  source: string,
  start: Date,
  end: Date,
  optional = true,
): MetricContext {
  return {
    source,
    computedAt: end.toISOString(),
    window: { start: start.toISOString(), end: end.toISOString() },
    population: optional ? 'recordedTelemetry' : 'records',
  };
}

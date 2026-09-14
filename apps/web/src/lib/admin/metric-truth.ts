export type MetricReason =
  | 'retentionWindow'
  | 'optionalDisabled'
  | 'collectionFailed'
  | 'notPermitted'
  | 'missingData'
  | 'zeroDenominator'
  | 'notConfigured'
  | 'unsupportedCohort';
export type MetricPopulation = 'records' | 'recordedTelemetry' | 'eligibleOptIn';
export type MetricEstimate =
  | 'tokenPricing'
  | 'subscriptionPrice'
  | 'annualized'
  | 'languageProxy'
  | 'quotaAssumption';
export type MetricState = 'measured' | 'estimated' | 'unavailable' | 'disabled' | 'failed';

export interface MetricContext {
  source: string;
  window: { start: string | null; end: string | null };
  computedAt: string | null;
  population?: MetricPopulation;
  coverage?: { observed: number; total: number } | null;
  estimate?: MetricEstimate | null;
  reason?: MetricReason | null;
}

export interface MetricTruth<T = number> {
  value: T | null;
  status: MetricState;
  source: string;
  window: MetricContext['window'];
  computedAt: string | null;
  freshnessThresholdMs: number;
  unavailabilityReason: MetricReason | null;
  population: MetricPopulation;
  coverage: MetricContext['coverage'];
  estimate: MetricEstimate | null;
}

export const METRIC_FRESHNESS_MS = 120_000;
const ACTIVITY_RETENTION_MS = 600_000;

/** A null window start means a current snapshot of retained records, not all-time history. */
export function metricTruth<T>(
  value: T | null | undefined,
  input: MetricContext | null | undefined,
): MetricTruth<T> {
  const context = input ?? { source: '', computedAt: null, window: { start: null, end: null } };
  const { window, computedAt } = context;
  let reason = context.reason ?? null;
  if (
    context.source === 'UserActivity' &&
    (!window.start ||
      !window.end ||
      Date.parse(window.end) - Date.parse(window.start) > ACTIVITY_RETENTION_MS)
  )
    reason = 'retentionWindow';
  if (
    !reason &&
    (!context.source ||
      value == null ||
      (typeof value === 'number' && !Number.isFinite(value)) ||
      !computedAt ||
      !Number.isFinite(Date.parse(computedAt)) ||
      !window.end ||
      !Number.isFinite(Date.parse(window.end)) ||
      (window.start !== null &&
        (!Number.isFinite(Date.parse(window.start)) ||
          Date.parse(window.start) > Date.parse(window.end))))
  )
    reason = 'missingData';
  const coverage = context.coverage;
  return {
    value: reason ? null : (value ?? null),
    status:
      reason === 'optionalDisabled' || reason === 'notConfigured'
        ? 'disabled'
        : reason === 'collectionFailed'
          ? 'failed'
          : reason
            ? 'unavailable'
            : context.estimate
              ? 'estimated'
              : 'measured',
    source: context.source,
    window,
    computedAt,
    freshnessThresholdMs: METRIC_FRESHNESS_MS,
    unavailabilityReason: reason,
    population: context.population ?? 'records',
    coverage:
      coverage &&
      Number.isFinite(coverage.observed) &&
      Number.isFinite(coverage.total) &&
      coverage.total > 0 &&
      coverage.observed >= 0 &&
      coverage.observed <= coverage.total
        ? coverage
        : null,
    estimate: reason ? null : (context.estimate ?? null),
  };
}

export function metricStatus(
  metric: MetricTruth<unknown> | null | undefined,
  now = Date.now(),
): MetricState | 'stale' {
  if (!metric) return 'unavailable';
  if (metric.status !== 'measured' && metric.status !== 'estimated') return metric.status;
  if (!metric.computedAt || !Number.isFinite(Date.parse(metric.computedAt))) return 'unavailable';
  return now - Date.parse(metric.computedAt) > metric.freshnessThresholdMs
    ? 'stale'
    : metric.status;
}

export function snapshotContext(source: string, computedAt: string | null): MetricContext {
  return { source, computedAt, window: { start: null, end: computedAt } };
}

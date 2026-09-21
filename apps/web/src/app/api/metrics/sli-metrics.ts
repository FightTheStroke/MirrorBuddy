import { collectHttpMetrics } from '@/lib/observability/http-metrics-collector';
import type { MetricsSummary } from '@/lib/observability/metrics-store';

/**
 * Compatibility entry point for the metrics scrape route.
 * These are proxy diagnostics, NOT application latency/availability SLIs.
 * Window counts and percentiles cannot be treated as cumulative counters/histograms.
 */
export function generateSLIMetrics(summary: MetricsSummary | null | undefined) {
  return collectHttpMetrics({}, Date.now(), summary ?? null).map(({ name, labels, value }) => ({
    name,
    labels,
    value,
    type: 'gauge' as const,
    help: 'Per-worker 5-minute proxy observations, not application responses; durations in seconds, error rates 0-1, totals are window counts',
  }));
}

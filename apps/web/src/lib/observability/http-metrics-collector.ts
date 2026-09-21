/**
 * Five-minute, per-worker proxy gauges, not application HTTP response metrics.
 * Even *_total names are window counts, not cumulative Prometheus counters.
 * Worker identity prevents concurrent instances overwriting one another.
 */

import { randomUUID } from 'node:crypto';
import { metricsStore, type MetricsSummary } from './metrics-store';

const worker = randomUUID();

export interface MetricSample {
  name: string;
  labels: Record<string, string>;
  value: number;
  timestamp: number;
}

/**
 * Collect proxy execution/denial diagnostics before downstream handlers run.
 * Empty windows are unobserved, not evidence of zero traffic or zero errors.
 */
export function collectHttpMetrics(
  instanceLabels: Record<string, string>,
  timestamp: number,
  summary: MetricsSummary | null = metricsStore.getMetricsSummary(),
): MetricSample[] {
  const samples: MetricSample[] = [];
  if (!summary?.totalRequests) return samples;
  const labels = { ...instanceLabels, worker };

  // Route-level metrics
  for (const [rawRoute, metrics] of Object.entries(summary.routes)) {
    const route = rawRoute.replace(/[^a-zA-Z0-9/_-]/g, '_');
    const routeLabels = { ...labels, route };

    samples.push(
      {
        name: 'proxy_http_requests_total',
        labels: routeLabels,
        value: metrics.count,
        timestamp,
      },
      {
        name: 'proxy_http_request_duration_seconds_p50',
        labels: routeLabels,
        value: metrics.p50LatencyMs / 1000,
        timestamp,
      },
      {
        name: 'proxy_http_request_duration_seconds_p95',
        labels: routeLabels,
        value: metrics.p95LatencyMs / 1000,
        timestamp,
      },
      {
        name: 'proxy_http_request_duration_seconds_p99',
        labels: routeLabels,
        value: metrics.p99LatencyMs / 1000,
        timestamp,
      },
      {
        name: 'proxy_http_request_errors_total',
        labels: routeLabels,
        value: metrics.errorCount,
        timestamp,
      },
      {
        name: 'proxy_http_request_error_rate',
        labels: routeLabels,
        value: metrics.errorRate,
        timestamp,
      },
    );

    // Error breakdown by status
    for (const [status, count] of Object.entries(metrics.errors)) {
      samples.push({
        name: 'proxy_http_request_errors_by_status',
        labels: { ...routeLabels, status_code: status },
        value: count,
        timestamp,
      });
    }
  }

  // Overall metrics
  samples.push(
    {
      name: 'proxy_http_requests_total_all',
      labels,
      value: summary.totalRequests,
      timestamp,
    },
    {
      name: 'proxy_http_errors_total_all',
      labels,
      value: summary.totalErrors,
      timestamp,
    },
    {
      name: 'proxy_http_error_rate_all',
      labels,
      value: summary.overallErrorRate,
      timestamp,
    },
  );

  return samples;
}

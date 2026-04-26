/**
 * HTTP Metrics Collector
 * Collects route-level and overall HTTP metrics for Prometheus.
 */

import { metricsStore } from "./metrics-store";

export interface MetricSample {
  name: string;
  labels: Record<string, string>;
  value: number;
  timestamp: number;
}

/**
 * Collect HTTP route-level and overall metrics
 */
export function collectHttpMetrics(
  instanceLabels: Record<string, string>,
  timestamp: number,
): MetricSample[] {
  const samples: MetricSample[] = [];
  const summary = metricsStore.getMetricsSummary();

  // Route-level metrics
  for (const [rawRoute, metrics] of Object.entries(summary.routes)) {
    const route = rawRoute.replace(/[^a-zA-Z0-9/_-]/g, "_");
    const routeLabels = { ...instanceLabels, route };

    samples.push(
      {
        name: "http_requests_total",
        labels: routeLabels,
        value: metrics.count,
        timestamp,
      },
      {
        name: "http_request_duration_seconds_p50",
        labels: routeLabels,
        value: metrics.p50LatencyMs / 1000,
        timestamp,
      },
      {
        name: "http_request_duration_seconds_p95",
        labels: routeLabels,
        value: metrics.p95LatencyMs / 1000,
        timestamp,
      },
      {
        name: "http_request_duration_seconds_p99",
        labels: routeLabels,
        value: metrics.p99LatencyMs / 1000,
        timestamp,
      },
      {
        name: "http_request_errors_total",
        labels: routeLabels,
        value: metrics.errorCount,
        timestamp,
      },
      {
        name: "http_request_error_rate",
        labels: routeLabels,
        value: metrics.errorRate,
        timestamp,
      },
    );

    // Error breakdown by status
    for (const [status, count] of Object.entries(metrics.errors)) {
      samples.push({
        name: "http_request_errors_by_status",
        labels: { ...routeLabels, status_code: status },
        value: count,
        timestamp,
      });
    }
  }

  // Overall metrics
  samples.push(
    {
      name: "http_requests_total_all",
      labels: instanceLabels,
      value: summary.totalRequests,
      timestamp,
    },
    {
      name: "http_errors_total_all",
      labels: instanceLabels,
      value: summary.totalErrors,
      timestamp,
    },
    {
      name: "http_error_rate_all",
      labels: instanceLabels,
      value: summary.overallErrorRate,
      timestamp,
    },
  );

  return samples;
}

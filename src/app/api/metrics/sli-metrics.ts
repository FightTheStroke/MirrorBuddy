// ============================================================================
// SLI METRICS HELPER
// Converts metricsStore data to Prometheus format
// ============================================================================

import type { MetricsSummary } from '@/lib/observability/metrics-store';

interface MetricLine {
  name: string;
  type: 'counter' | 'gauge' | 'histogram';
  help: string;
  labels: Record<string, string>;
  value: number;
}

/**
 * Generate SLI metrics (F-02, F-03) from metricsStore summary
 * Returns Prometheus-compatible metric lines for:
 * - Latency percentiles (p50, p95, p99) per route
 * - Error rates per route
 * - Request counts per route
 */
export function generateSLIMetrics(summary: MetricsSummary): MetricLine[] {
  const metrics: MetricLine[] = [];

  // Per-route metrics
  for (const [route, routeMetrics] of Object.entries(summary.routes)) {
    // Latency percentiles (F-02)
    metrics.push(
      {
        name: 'http_request_duration_seconds',
        type: 'histogram',
        help: 'HTTP request latency in seconds',
        labels: { route, quantile: '0.5' },
        value: routeMetrics.p50LatencyMs / 1000,
      },
      {
        name: 'http_request_duration_seconds',
        type: 'histogram',
        help: 'HTTP request latency in seconds',
        labels: { route, quantile: '0.95' },
        value: routeMetrics.p95LatencyMs / 1000,
      },
      {
        name: 'http_request_duration_seconds',
        type: 'histogram',
        help: 'HTTP request latency in seconds',
        labels: { route, quantile: '0.99' },
        value: routeMetrics.p99LatencyMs / 1000,
      }
    );

    // Request count
    metrics.push({
      name: 'http_requests_total',
      type: 'counter',
      help: 'Total HTTP requests by route',
      labels: { route },
      value: routeMetrics.count,
    });

    // Error metrics (F-03)
    metrics.push(
      {
        name: 'http_request_errors_total',
        type: 'counter',
        help: 'Total HTTP errors by route',
        labels: { route },
        value: routeMetrics.errorCount,
      },
      {
        name: 'http_request_error_rate',
        type: 'gauge',
        help: 'HTTP error rate by route (0-1)',
        labels: { route },
        value: routeMetrics.errorRate,
      }
    );

    // Error breakdown by status code
    for (const [statusCode, count] of Object.entries(routeMetrics.errors)) {
      metrics.push({
        name: 'http_request_errors_by_status',
        type: 'counter',
        help: 'HTTP errors by route and status code',
        labels: { route, status_code: statusCode },
        value: count,
      });
    }
  }

  // Overall metrics
  metrics.push(
    {
      name: 'http_requests_total_all',
      type: 'counter',
      help: 'Total HTTP requests across all routes',
      labels: { window: '5m' },
      value: summary.totalRequests,
    },
    {
      name: 'http_errors_total_all',
      type: 'counter',
      help: 'Total HTTP errors across all routes',
      labels: { window: '5m' },
      value: summary.totalErrors,
    },
    {
      name: 'http_error_rate_all',
      type: 'gauge',
      help: 'Overall HTTP error rate (0-1)',
      labels: { window: '5m' },
      value: summary.overallErrorRate,
    }
  );

  return metrics;
}

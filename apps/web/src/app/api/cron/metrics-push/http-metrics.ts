import { metricsStore } from '@/lib/observability/metrics-store';
import { generateSLIMetrics } from '@/app/api/metrics/sli-metrics';
import type { CollectorContext } from './collector-utils';

export function collectHttpMetrics({ samples, instanceLabels, now }: CollectorContext): void {
  const summary = metricsStore.getMetricsSummary();
  const sliMetrics = generateSLIMetrics(summary);
  for (const metric of sliMetrics) {
    samples.push({
      name: metric.name,
      labels: { ...metric.labels, env: instanceLabels.env },
      value: metric.value,
      timestamp: now,
    });
  }
  for (const [route, metrics] of Object.entries(summary.routes)) {
    const routeLabels = { ...instanceLabels, route };
    samples.push(
      { name: 'http_requests_total', labels: routeLabels, value: metrics.count, timestamp: now },
      {
        name: 'http_request_duration_seconds',
        labels: { ...routeLabels, quantile: '0.95' },
        value: metrics.p95LatencyMs / 1000,
        timestamp: now,
      },
      {
        name: 'http_request_error_rate',
        labels: routeLabels,
        value: metrics.errorRate,
        timestamp: now,
      },
    );
  }
}

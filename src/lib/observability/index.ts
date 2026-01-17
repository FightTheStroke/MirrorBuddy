/**
 * Observability Module
 *
 * Exports metrics store and types for use across the application.
 */

export { metricsStore } from './metrics-store';
export type {
  LatencyDataPoint,
  ErrorDataPoint,
  RouteMetrics,
  MetricsSummary,
} from './metrics-store';

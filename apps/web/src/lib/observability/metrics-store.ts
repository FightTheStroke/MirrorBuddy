/**
 * In-Memory Metrics Store for Observability
 *
 * Stores latency and error metrics with a sliding 5-minute window.
 * For production, this would be replaced with a proper time-series database.
 *
 * Usage:
 *   metricsStore.recordLatency('/api/chat', 123.45);
 *   metricsStore.recordError('/api/chat', 500);
 *   const summary = metricsStore.getMetricsSummary();
 */

interface LatencyDataPoint {
  route: string;
  latencyMs: number;
  timestamp: number;
}

interface ErrorDataPoint {
  route: string;
  statusCode: number;
  timestamp: number;
}

interface RouteMetrics {
  count: number;
  totalLatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  errorCount: number;
  errorRate: number;
  errors: Record<number, number>; // status code -> count
}

interface MetricsSummary {
  totalRequests: number;
  totalErrors: number;
  overallErrorRate: number;
  routes: Record<string, RouteMetrics>;
  windowStartMs: number;
  windowEndMs: number;
}

const WINDOW_MS = 5 * 60 * 1000; // 5 minutes

class MetricsStore {
  private latencyData: LatencyDataPoint[] = [];
  private errorData: ErrorDataPoint[] = [];

  /**
   * Record latency for a route
   */
  recordLatency(route: string, latencyMs: number): void {
    const now = Date.now();
    this.latencyData.push({ route, latencyMs, timestamp: now });
    this.cleanup(now);
  }

  /**
   * Record error for a route
   */
  recordError(route: string, statusCode: number): void {
    const now = Date.now();
    this.errorData.push({ route, statusCode, timestamp: now });
    this.cleanup(now);
  }

  /**
   * Remove data points older than the sliding window
   */
  private cleanup(now: number): void {
    const cutoff = now - WINDOW_MS;
    this.latencyData = this.latencyData.filter((d) => d.timestamp >= cutoff);
    this.errorData = this.errorData.filter((d) => d.timestamp >= cutoff);
  }

  /**
   * Calculate percentile from sorted array
   */
  private percentile(sortedValues: number[], p: number): number {
    if (sortedValues.length === 0) return 0;
    const index = Math.ceil((p / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, index)] || 0;
  }

  /**
   * Get metrics summary for all routes
   */
  getMetricsSummary(): MetricsSummary {
    const now = Date.now();
    this.cleanup(now);

    const routes: Record<string, RouteMetrics> = {};
    const routeLatencies: Record<string, number[]> = {};

    // Group latencies by route
    for (const dp of this.latencyData) {
      if (!routeLatencies[dp.route]) {
        routeLatencies[dp.route] = [];
      }
      routeLatencies[dp.route].push(dp.latencyMs);
    }

    // Calculate latency metrics per route
    for (const [route, latencies] of Object.entries(routeLatencies)) {
      const sorted = [...latencies].sort((a, b) => a - b);
      const count = latencies.length;
      const totalLatencyMs = latencies.reduce((sum, l) => sum + l, 0);

      routes[route] = {
        count,
        totalLatencyMs,
        minLatencyMs: sorted[0] || 0,
        maxLatencyMs: sorted[sorted.length - 1] || 0,
        p50LatencyMs: this.percentile(sorted, 50),
        p95LatencyMs: this.percentile(sorted, 95),
        p99LatencyMs: this.percentile(sorted, 99),
        errorCount: 0,
        errorRate: 0,
        errors: {},
      };
    }

    // Add error metrics per route
    for (const dp of this.errorData) {
      if (!routes[dp.route]) {
        routes[dp.route] = {
          count: 0,
          totalLatencyMs: 0,
          minLatencyMs: 0,
          maxLatencyMs: 0,
          p50LatencyMs: 0,
          p95LatencyMs: 0,
          p99LatencyMs: 0,
          errorCount: 0,
          errorRate: 0,
          errors: {},
        };
      }

      routes[dp.route].errorCount++;
      routes[dp.route].errors[dp.statusCode] =
        (routes[dp.route].errors[dp.statusCode] || 0) + 1;
    }

    // Calculate error rates
    for (const route in routes) {
      const metrics = routes[route];
      const totalRequests = metrics.count + metrics.errorCount;
      metrics.errorRate =
        totalRequests > 0 ? metrics.errorCount / totalRequests : 0;
    }

    const totalRequests = this.latencyData.length;
    const totalErrors = this.errorData.length;
    const overallErrorRate =
      totalRequests + totalErrors > 0
        ? totalErrors / (totalRequests + totalErrors)
        : 0;

    return {
      totalRequests,
      totalErrors,
      overallErrorRate,
      routes,
      windowStartMs: now - WINDOW_MS,
      windowEndMs: now,
    };
  }

  /**
   * Get metrics for a specific route
   */
  getRouteMetrics(route: string): RouteMetrics | null {
    const summary = this.getMetricsSummary();
    return summary.routes[route] || null;
  }

  /**
   * Reset all metrics (for testing)
   */
  reset(): void {
    this.latencyData = [];
    this.errorData = [];
  }

  /**
   * Get current window size in milliseconds
   */
  getWindowMs(): number {
    return WINDOW_MS;
  }

  /**
   * Get raw data (for debugging)
   */
  getRawData(): {
    latencyData: LatencyDataPoint[];
    errorData: ErrorDataPoint[];
  } {
    const now = Date.now();
    this.cleanup(now);
    return {
      latencyData: [...this.latencyData],
      errorData: [...this.errorData],
    };
  }
}

// Singleton instance
export const metricsStore = new MetricsStore();

// Export types
export type {
  LatencyDataPoint,
  ErrorDataPoint,
  RouteMetrics,
  MetricsSummary,
};

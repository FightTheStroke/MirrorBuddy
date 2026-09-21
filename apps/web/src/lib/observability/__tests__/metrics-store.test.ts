/**
 * Unit tests for MetricsStore
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { metricsStore } from '../metrics-store';

describe('MetricsStore', () => {
  beforeEach(() => {
    metricsStore.reset();
  });
  afterEach(() => vi.useRealTimers());

  it('should record latency for a route', () => {
    metricsStore.recordLatency('/api/chat', 100);
    metricsStore.recordLatency('/api/chat', 200);

    const metrics = metricsStore.getRouteMetrics('/api/chat');
    expect(metrics).not.toBeNull();
    expect(metrics?.count).toBe(2);
    expect(metrics?.p50LatencyMs).toBeGreaterThan(0);
  });

  it('should record errors for a route', () => {
    metricsStore.recordError('/api/chat', 500);
    metricsStore.recordError('/api/chat', 404);

    const metrics = metricsStore.getRouteMetrics('/api/chat');
    expect(metrics).not.toBeNull();
    expect(metrics?.errorCount).toBe(2);
    expect(metrics?.errors[500]).toBe(1);
    expect(metrics?.errors[404]).toBe(1);
  });

  it('should calculate percentiles correctly', () => {
    const latencies = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    latencies.forEach((lat) => metricsStore.recordLatency('/api/test', lat));

    const metrics = metricsStore.getRouteMetrics('/api/test');
    expect(metrics).not.toBeNull();
    expect(metrics?.p50LatencyMs).toBe(50);
    expect(metrics?.p95LatencyMs).toBeGreaterThanOrEqual(90);
    expect(metrics?.p99LatencyMs).toBeGreaterThanOrEqual(95);
  });

  it('should calculate error rate', () => {
    metricsStore.recordLatency('/api/chat', 100);
    metricsStore.recordLatency('/api/chat', 150);
    metricsStore.recordError('/api/chat', 500);

    const metrics = metricsStore.getRouteMetrics('/api/chat');
    expect(metrics).not.toBeNull();
    expect(metrics?.count).toBe(2);
    expect(metrics?.errorCount).toBe(1);
    expect(metrics?.errorRate).toBe(0.5);
  });

  it('should return summary with all routes', () => {
    metricsStore.recordLatency('/api/chat', 100);
    metricsStore.recordLatency('/api/user', 50);
    metricsStore.recordError('/api/chat', 500);

    const summary = metricsStore.getMetricsSummary();
    expect(summary.totalRequests).toBe(2);
    expect(summary.totalErrors).toBe(1);
    expect(summary.overallErrorRate).toBe(0.5);
    expect(Object.keys(summary.routes)).toContain('/api/chat');
    expect(Object.keys(summary.routes)).toContain('/api/user');
  });

  it('should reset metrics', () => {
    metricsStore.recordLatency('/api/chat', 100);
    metricsStore.recordError('/api/chat', 500);

    metricsStore.reset();

    const summary = metricsStore.getMetricsSummary();
    expect(summary.totalRequests).toBe(0);
    expect(summary.totalErrors).toBe(0);
  });

  it('counts a failed request once in the denominator', () => {
    metricsStore.recordLatency('/api/chat', 100);
    metricsStore.recordError('/api/chat', 403);
    expect(metricsStore.getRouteMetrics('/api/chat')?.errorRate).toBe(1);
    expect(metricsStore.getMetricsSummary().overallErrorRate).toBe(1);
  });

  it('returns a finite zero rate with no recorded requests', () => {
    expect(metricsStore.getMetricsSummary().overallErrorRate).toBe(0);
    metricsStore.recordError('/api/chat', 403);
    expect(metricsStore.getRouteMetrics('/api/chat')?.errorRate).toBe(0);
  });

  it('expires requests and their errors after the five-minute window', () => {
    vi.useFakeTimers();
    metricsStore.recordLatency('/api/chat', 100);
    metricsStore.recordError('/api/chat', 403);
    vi.advanceTimersByTime(metricsStore.getWindowMs() + 1);
    expect(metricsStore.getMetricsSummary()).toMatchObject({
      totalRequests: 0,
      totalErrors: 0,
      overallErrorRate: 0,
      routes: {},
    });
  });
});

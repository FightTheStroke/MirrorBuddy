import { beforeEach, describe, expect, it } from 'vitest';
import { metricsStore } from '../metrics-store';
import { collectHttpMetrics } from '../http-metrics-collector';
import { generateSLIMetrics } from '@/app/api/metrics/sli-metrics';

beforeEach(() => metricsStore.reset());

describe('proxy diagnostic semantics', () => {
  it('publishes no request observations for an empty worker', () => {
    expect(collectHttpMetrics({}, 42)).toEqual([]);
    expect(generateSLIMetrics(metricsStore.getMetricsSummary())).toEqual([]);
  });

  it('uses the same ten explicit proxy gauges for scrape and push', () => {
    metricsStore.recordLatency('/api/chat', 200);
    metricsStore.recordError('/api/chat', 403);
    const pushed = collectHttpMetrics({}, 42);
    const scraped = generateSLIMetrics(metricsStore.getMetricsSummary());

    expect(new Set(pushed.map((sample) => sample.name)).size).toBe(10);
    expect(scraped.map(({ name, labels, value }) => ({ name, labels, value }))).toEqual(
      pushed.map(({ name, labels, value }) => ({ name, labels, value })),
    );
    expect(scraped.every((metric) => metric.name.startsWith('proxy_http_'))).toBe(true);
    expect(scraped.every((metric) => metric.type === 'gauge')).toBe(true);
    expect(scraped.every((metric) => /proxy.*not.*application/i.test(metric.help))).toBe(true);
    expect(scraped.every((metric) => metric.help.includes('5-minute'))).toBe(true);
    const worker = pushed[0].labels.worker;
    expect(worker).toMatch(/^[a-f0-9-]{36}$/);
    expect(collectHttpMetrics({}, 43).every((metric) => metric.labels.worker === worker)).toBe(
      true,
    );
  });
});

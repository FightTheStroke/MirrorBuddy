/**
 * Waitlist KPI Metrics Tests
 *
 * Verifies that the metrics-push cron collects waitlist KPIs:
 * - waitlist_signups_total
 * - waitlist_verified_total
 * - waitlist_unsubscribed_total
 * - waitlist_promo_redeemed_total
 * - waitlist_conversion_rate
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

vi.mock('@/lib/db', async () => {
  const { createMockPrisma } = await import('@/test/mocks/prisma');
  return { prisma: createMockPrisma() };
});

import { prisma } from '@/lib/db';

vi.mock('@/lib/observability/metrics-store', () => ({
  metricsStore: {
    getMetricsSummary: vi.fn().mockReturnValue({ routes: {} }),
  },
}));

vi.mock('@/app/api/metrics/sli-metrics', () => ({
  generateSLIMetrics: vi.fn().mockReturnValue([]),
}));

vi.mock('@/app/api/metrics/behavioral-metrics', () => ({
  generateBehavioralMetrics: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/funnel/batch-funnel', () => ({
  processBatchFunnelEvents: vi.fn().mockResolvedValue({ processed: 0 }),
}));

// Mock fetch for Grafana push
const mockFetch = vi.fn().mockResolvedValue({
  ok: true,
  text: vi.fn().mockResolvedValue(''),
});
global.fetch = mockFetch as typeof fetch;

describe('metrics-push - waitlist KPIs', () => {
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    originalEnv = {
      VERCEL_ENV: process.env.VERCEL_ENV,
      CRON_SECRET: process.env.CRON_SECRET,
      GRAFANA_CLOUD_PROMETHEUS_URL: process.env.GRAFANA_CLOUD_PROMETHEUS_URL,
      GRAFANA_CLOUD_PROMETHEUS_USER: process.env.GRAFANA_CLOUD_PROMETHEUS_USER,
      GRAFANA_CLOUD_API_KEY: process.env.GRAFANA_CLOUD_API_KEY,
    };

    process.env.VERCEL_ENV = 'production';
    process.env.CRON_SECRET = 'test-secret';
    process.env.GRAFANA_CLOUD_PROMETHEUS_URL = 'https://test.grafana.net/api/prom/push';
    process.env.GRAFANA_CLOUD_PROMETHEUS_USER = 'test-user';
    process.env.GRAFANA_CLOUD_API_KEY = 'test-key';

    // Setup waitlistEntry.count mock: 100 total, 80 verified, 10 unsubscribed, 5 redeemed, 20 converted
    prisma.waitlistEntry.count
      .mockResolvedValueOnce(100) // total signups
      .mockResolvedValueOnce(80) // verified
      .mockResolvedValueOnce(10) // unsubscribed
      .mockResolvedValueOnce(5) // promo redeemed
      .mockResolvedValueOnce(20); // converted

    vi.clearAllMocks();
    prisma.waitlistEntry.count
      .mockResolvedValueOnce(100)
      .mockResolvedValueOnce(80)
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(20);
  });

  afterEach(() => {
    Object.entries(originalEnv).forEach(([key, value]) => {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });
    vi.resetModules();
  });

  it('should call prisma.waitlistEntry.count for each waitlist KPI', async () => {
    const { POST } = await import('../route');

    const request = new NextRequest(new URL('http://localhost:3000/api/cron/metrics-push'), {
      method: 'POST',
      headers: { authorization: 'Bearer test-secret' },
    });

    await POST(request);

    expect(prisma.waitlistEntry.count).toHaveBeenCalledTimes(5);
  });

  it('should push waitlist_signups_total metric to Grafana', async () => {
    const { POST } = await import('../route');

    const request = new NextRequest(new URL('http://localhost:3000/api/cron/metrics-push'), {
      method: 'POST',
      headers: { authorization: 'Bearer test-secret' },
    });

    await POST(request);

    const fetchCall = mockFetch.mock.calls[0];
    const body = fetchCall[1].body as string;

    expect(body).toContain('waitlist_signups_total');
    expect(body).toContain('waitlist_verified_total');
    expect(body).toContain('waitlist_unsubscribed_total');
    expect(body).toContain('waitlist_promo_redeemed_total');
    expect(body).toContain('waitlist_conversion_rate');
  });

  it('should compute conversion_rate as converted/total', async () => {
    const { POST } = await import('../route');

    const request = new NextRequest(new URL('http://localhost:3000/api/cron/metrics-push'), {
      method: 'POST',
      headers: { authorization: 'Bearer test-secret' },
    });

    await POST(request);

    const fetchCall = mockFetch.mock.calls[0];
    const body = fetchCall[1].body as string;

    // conversion_rate = 20/100 = 0.2
    const convLine = body.split('\n').find((l) => l.includes('waitlist_conversion_rate'));
    expect(convLine).toBeDefined();
    expect(convLine).toContain('value=0.2');
  });
});

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { collectServiceLimitsSamples } from '../service-limits-metrics';
import { collectTierMetrics } from '../tier-metrics-collector';
import { prometheusPushService } from '../prometheus-push-service';
import { metricsStore } from '../metrics-store';

vi.mock('../service-limits-metrics', () => ({ collectServiceLimitsSamples: vi.fn(() => []) }));
vi.mock('../tier-metrics-collector', () => ({ collectTierMetrics: vi.fn(() => []) }));

const fetchMock = vi.fn();
const now = new Date('2026-09-15T12:00:00Z');

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(now);
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('GRAFANA_CLOUD_PROMETHEUS_URL', 'https://metrics.example.com/write');
  vi.stubEnv('GRAFANA_CLOUD_PROMETHEUS_USER', 'test-user');
  vi.stubEnv('GRAFANA_CLOUD_API_KEY', 'test-key');
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
  metricsStore.reset();
  prometheusPushService.initialize();
});
afterEach(() => {
  prometheusPushService.stop();
  metricsStore.reset();
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('collector ownership', () => {
  it.each(['1', '', undefined])(
    'never runs scheduled sources in the request-bound push (VERCEL=%s)',
    async (vercel) => {
      vi.stubEnv('VERCEL', vercel);
      prometheusPushService.start();
      await prometheusPushService.pushIfDue(now.getTime());
      await prometheusPushService.pushIfDue(now.getTime() + 60_000);

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(collectServiceLimitsSamples).not.toHaveBeenCalled();
      expect(collectTierMetrics).not.toHaveBeenCalled();
    },
  );

  it('keeps scheduled collection and transport independent of the interval module', () => {
    for (const file of ['collectors.ts', 'transport.ts']) {
      const source = readFileSync(
        resolve(import.meta.dirname, '../../../app/api/cron/metrics-push', file),
        'utf8',
      );
      expect(source).not.toContain('prometheus-push-service');
    }
  });

  it.each(['1', ''])(
    'delivers only the 10 observed proxy diagnostics (VERCEL=%s)',
    async (vercel) => {
      vi.stubEnv('VERCEL', vercel);
      metricsStore.recordLatency('/api/chat', 200);
      metricsStore.recordError('/api/chat', 500);
      await prometheusPushService.pushMetrics();

      const expected: Record<string, number> = {
        proxy_http_requests_total: 1,
        proxy_http_request_duration_seconds_p50: 0.2,
        proxy_http_request_duration_seconds_p95: 0.2,
        proxy_http_request_duration_seconds_p99: 0.2,
        proxy_http_request_errors_total: 1,
        proxy_http_request_error_rate: 1,
        proxy_http_request_errors_by_status: 1,
        proxy_http_requests_total_all: 1,
        proxy_http_errors_total_all: 1,
        proxy_http_error_rate_all: 1,
      };
      const lines = (fetchMock.mock.calls[0][1].body as string).split('\n');
      expect(lines.filter((line) => !line.startsWith('metric_collector_'))).toHaveLength(10);
      for (const [name, value] of Object.entries(expected)) {
        const route = !name.endsWith('_all') ? ',route=/api/chat' : '';
        const status = name === 'proxy_http_request_errors_by_status' ? ',status_code=500' : '';
        expect(lines).toEqual(
          expect.arrayContaining([
            expect.stringMatching(
              `^${name},instance=mirrorbuddy,env=production,worker=[a-f0-9-]+${route}${status} value=${value} ${now.getTime() * 1e6}$`,
            ),
          ]),
        );
      }
      expect(
        lines.some((line) => /^(trial_|invite_|budget_|abuse_|conversion_|http_)/.test(line)),
      ).toBe(false);
      for (const metric of ['up', 'enabled']) {
        expect(lines).toContain(
          `metric_collector_${metric},instance=mirrorbuddy,env=production,collector=proxy-http value=1 ${now.getTime() * 1e6}`,
        );
      }
    },
  );

  it('never publishes cold-start zero counters as observations', async () => {
    await prometheusPushService.pushMetrics();
    const lines = (fetchMock.mock.calls[0][1].body as string).split('\n');
    expect(lines.filter((line) => !line.startsWith('metric_collector_'))).toEqual([]);
    expect(lines.every((line) => line.includes('collector=proxy-http '))).toBe(true);
  });
});

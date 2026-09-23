import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from '@/lib/logger';
import { collectHttpMetrics } from '../http-metrics-collector';
import { collectTierMetrics } from '../tier-metrics-collector';
import { collectServiceLimitsSamples } from '../service-limits-metrics';
import { prometheusPushService } from '../prometheus-push-service';
import { collectDatabaseBackedSamples } from '@/app/api/cron/metrics-push/scheduled-metrics';
import { pushToGrafana } from '@/app/api/cron/metrics-push/transport';

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => ({ info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  },
}));
vi.mock('../http-metrics-collector', () => ({ collectHttpMetrics: vi.fn() }));
vi.mock('../tier-metrics-collector', () => ({ collectTierMetrics: vi.fn() }));
vi.mock('../service-limits-metrics', () => ({
  collectServiceLimitsSamples: vi.fn().mockResolvedValue([]),
}));

describe('independent metrics push', () => {
  const fetchMock = vi.fn();
  const now = 1_789_502_000_000;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Date, 'now').mockReturnValue(now);
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('GRAFANA_CLOUD_PROMETHEUS_URL', 'https://metrics.example.test/write');
    vi.stubEnv('GRAFANA_CLOUD_PROMETHEUS_USER', 'test');
    vi.stubEnv('GRAFANA_CLOUD_API_KEY', 'test-only');
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    vi.mocked(collectHttpMetrics).mockImplementation((labels, timestamp) => [
      {
        name: 'proxy_http_requests_total',
        labels: { ...labels, route: '/chat' },
        value: 17,
        timestamp,
      },
    ]);
    vi.mocked(collectTierMetrics).mockResolvedValue([]);
    prometheusPushService.initialize();
  });

  afterEach(() => {
    prometheusPushService.stop();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('pushes valid scheduled siblings and failed tier health when the database times out', async () => {
    const error = new Error('Connection terminated due to connection timeout');
    vi.mocked(collectTierMetrics).mockRejectedValueOnce(error);
    vi.mocked(collectServiceLimitsSamples).mockResolvedValueOnce([
      { name: 'service_limit_absolute', labels: { service: 'vercel' }, value: 17, timestamp: now },
    ]);
    const pushScheduled = async () =>
      pushToGrafana(
        await collectDatabaseBackedSamples({ instance: 'mirrorbuddy', env: 'production' }, now),
      );

    await expect(pushScheduled()).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = fetchMock.mock.calls[0][1].body as string;
    expect(body.split('\n')).toContain(
      `service_limit_absolute,service=vercel value=17 ${now * 1e6}`,
    );
    expect(body).toContain(
      'metric_collector_up,instance=mirrorbuddy,env=production,collector=tier value=0 ',
    );
    expect(body).toContain(
      'metric_collector_up,instance=mirrorbuddy,env=production,collector=service_limits value=1 ',
    );
    expect(body).not.toContain('tier_users');
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledExactlyOnceWith('Metrics collector failed: tier', {
      collector: 'tier',
      component: 'metrics-collector',
      errorType: 'Error',
    });

    await pushScheduled();
    expect(fetchMock.mock.calls[1][1].body).toContain('collector=tier value=1 ');
    expect(fetchMock.mock.calls[1][1].body).not.toContain('collector=tier value=0 ');
  });

  it('reports a synchronous proxy failure without fabricating traffic samples', async () => {
    const error = new Error('Proxy snapshot unavailable');
    vi.mocked(collectHttpMetrics).mockImplementationOnce(() => {
      throw error;
    });

    await prometheusPushService.pushMetrics();

    expect(fetchMock.mock.calls[0][1].body).toContain('collector=proxy-http value=0 ');
    expect(fetchMock.mock.calls[0][1].body).not.toContain('proxy_http_requests_total');
    expect(logger.warn).toHaveBeenCalledExactlyOnceWith('Metrics collector failed: proxy-http', {
      collector: 'proxy-http',
      component: 'metrics-collector',
      errorType: 'Error',
    });
  });

  it('does not turn transport failures into successful pushes', async () => {
    fetchMock.mockResolvedValueOnce(new Response('rejected', { status: 401 }));
    await expect(prometheusPushService.pushMetrics()).rejects.toThrow(
      'Metrics push rejected: HTTP 401',
    );
  });

  it('keeps the transport response attributable without grouping on its body', async () => {
    fetchMock.mockResolvedValueOnce(new Response('tenant 12345 over quota', { status: 429 }));

    const failure = await prometheusPushService.pushMetrics().catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(Error);
    const pushError = failure as Error & { status?: number; responseBody?: string };
    expect(pushError.message).toBe('Metrics push rejected: HTTP 429');
    expect(pushError.status).toBe(429);
    expect(pushError.responseBody).toContain('over quota');
  });

  it('reports a failed start-up push once at warning level with safe driver attribution', async () => {
    const failure = new TypeError('fetch failed', {
      cause: Object.assign(new Error('connection refused'), { code: 'ECONNREFUSED' }),
    });
    fetchMock.mockRejectedValueOnce(failure);

    prometheusPushService.start();
    await prometheusPushService.pushIfDue(now);
    prometheusPushService.stop();

    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledExactlyOnceWith(
      'Metrics collector failed: grafana_transport',
      {
        collector: 'grafana_transport',
        component: 'metrics-collector',
        errorType: 'TypeError',
        code: 'ECONNREFUSED',
      },
    );
  });

  it('marks composite service limits degraded without discarding valid child samples', async () => {
    vi.mocked(collectServiceLimitsSamples).mockResolvedValueOnce([
      { name: 'metric_collector_up', labels: { collector: 'supabase' }, value: 0, timestamp: now },
      {
        name: 'service_limit_absolute',
        labels: { service: 'vercel', metric: 'builds', type: 'used' },
        value: 8,
        timestamp: now,
      },
    ]);
    await pushToGrafana(
      await collectDatabaseBackedSamples({ instance: 'mirrorbuddy', env: 'production' }, now),
    );
    const body = fetchMock.mock.calls[0][1].body as string;
    expect(body).toContain(
      'metric_collector_up,instance=mirrorbuddy,env=production,collector=service_limits value=0 ',
    );
    expect(body).toContain(
      'service_limit_absolute,service=vercel,metric=builds,type=used value=8 ',
    );
    expect(body).not.toContain(
      'metric_collector_up,instance=mirrorbuddy,env=production,collector=service_limits value=1 ',
    );
    expect(body).toContain(
      'metric_collector_enabled,instance=mirrorbuddy,env=production,collector=service_limits value=1 ',
    );
  });

  it('keeps database-backed collectors out of the per-instance timer on Vercel', async () => {
    vi.stubEnv('VERCEL', '1');

    await prometheusPushService.pushMetrics();

    expect(collectServiceLimitsSamples).not.toHaveBeenCalled();
    expect(collectTierMetrics).not.toHaveBeenCalled();
    const body = fetchMock.mock.calls[0][1].body as string;
    expect(body).toContain('proxy_http_requests_total');
    expect(body).not.toContain('collector=service_limits');
    expect(body).not.toContain('collector=tier');
  });

  it('keeps shared sources out of the instance push outside Vercel too', async () => {
    vi.stubEnv('VERCEL', '');

    await prometheusPushService.pushMetrics();

    expect(collectServiceLimitsSamples).not.toHaveBeenCalled();
    expect(collectTierMetrics).not.toHaveBeenCalled();
  });

  it('collects each database-backed family exactly once for a scheduled caller', async () => {
    const labels = { instance: 'mirrorbuddy', env: 'production' };

    const samples = await collectDatabaseBackedSamples(labels, now);

    expect(collectServiceLimitsSamples).toHaveBeenCalledExactlyOnceWith(labels, now);
    expect(collectTierMetrics).toHaveBeenCalledExactlyOnceWith(labels, now);
    expect(samples.map((sample) => sample.labels.collector)).toEqual(
      expect.arrayContaining(['service_limits', 'tier']),
    );
  });

  it('reports a failing scheduled collector without losing the other family', async () => {
    const failure = new Error('Connection terminated due to connection timeout');
    vi.mocked(collectServiceLimitsSamples).mockRejectedValueOnce(failure);

    const samples = await collectDatabaseBackedSamples(
      { instance: 'mirrorbuddy', env: 'production' },
      now,
    );

    expect(collectTierMetrics).toHaveBeenCalledTimes(1);
    expect(
      samples.some(
        (sample) =>
          sample.name === 'metric_collector_up' &&
          sample.labels.collector === 'service_limits' &&
          sample.value === 0,
      ),
    ).toBe(true);
  });
});

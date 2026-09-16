import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from '@/lib/logger';
import { collectHttpMetrics } from '../http-metrics-collector';
import { collectTierMetrics } from '../tier-metrics-collector';
import { collectFunnelMetrics } from '../funnel-metrics-collectors';
import { collectServiceLimitsSamples } from '../service-limits-metrics';
import { prometheusPushService } from '../prometheus-push-service';

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
vi.mock('../funnel-metrics-collectors', () => ({
  collectFunnelMetrics: vi.fn(),
  collectBudgetMetrics: vi.fn(() => []),
  collectAbuseMetrics: vi.fn(() => []),
  collectConversionMetrics: vi.fn(() => []),
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
      { name: 'http_requests_total', labels: { ...labels, route: '/chat' }, value: 17, timestamp },
    ]);
    vi.mocked(collectFunnelMetrics).mockReturnValue([]);
    vi.mocked(collectTierMetrics).mockResolvedValue([]);
    prometheusPushService.initialize();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('pushes real HTTP samples and failed tier health when the database times out', async () => {
    const error = new Error('Connection terminated due to connection timeout');
    vi.mocked(collectTierMetrics).mockRejectedValueOnce(error);

    await expect(prometheusPushService.pushMetrics()).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = fetchMock.mock.calls[0][1].body as string;
    expect(body.split('\n')).toContain(
      `http_requests_total,instance=mirrorbuddy,env=production,route=/chat value=17 ${now * 1e6}`,
    );
    expect(body).toContain(
      'metric_collector_up,instance=mirrorbuddy,env=production,collector=tier value=0 ',
    );
    expect(body).toContain(
      'metric_collector_up,instance=mirrorbuddy,env=production,collector=http value=1 ',
    );
    expect(body).not.toContain('tier_users');
    expect(logger.error).toHaveBeenCalledWith(
      'Metrics collector failed',
      { collector: 'tier' },
      error,
    );

    await prometheusPushService.pushMetrics();
    expect(fetchMock.mock.calls[1][1].body).toContain('collector=tier value=1 ');
    expect(fetchMock.mock.calls[1][1].body).not.toContain('collector=tier value=0 ');
  });

  it('isolates a synchronous collector failure and still invokes later collectors', async () => {
    const error = new Error('Funnel snapshot unavailable');
    vi.mocked(collectFunnelMetrics).mockImplementationOnce(() => {
      throw error;
    });

    await prometheusPushService.pushMetrics();

    expect(collectTierMetrics).toHaveBeenCalled();
    expect(fetchMock.mock.calls[0][1].body).toContain('collector=funnel value=0 ');
    expect(fetchMock.mock.calls[0][1].body).toContain('http_requests_total');
    expect(logger.error).toHaveBeenCalledWith(
      'Metrics collector failed',
      { collector: 'funnel' },
      error,
    );
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

  it('reports a failed start-up push with the original error, not a stringified copy', async () => {
    const failure = new Error('fetch failed');
    fetchMock.mockRejectedValueOnce(failure);

    prometheusPushService.start();
    await vi.waitFor(() => expect(logger.error).toHaveBeenCalled());
    prometheusPushService.stop();

    expect(logger.error).toHaveBeenCalledWith('Metrics push failed', { phase: 'initial' }, failure);
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
    await prometheusPushService.pushMetrics();
    const body = fetchMock.mock.calls[0][1].body as string;
    expect(body).toContain('collector=service_limits value=0 ');
    expect(body).toContain(
      'service_limit_absolute,service=vercel,metric=builds,type=used value=8 ',
    );
    expect(body).not.toContain('collector=service_limits value=1 ');
  });
});

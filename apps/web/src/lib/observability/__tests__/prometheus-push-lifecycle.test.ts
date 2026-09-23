/**
 * Regression for #1158 (Sentry MIRRORBUDDY-35, "Metrics collector failed:
 * grafana_transport", TimeoutError, ~345 events a day).
 *
 * The per-instance push ran on a setInterval started at boot. Vercel suspends
 * an instance between requests, so a push that was in flight at suspension had
 * its 15 s abort timer fire on resume: every event carried no transaction, while
 * the cron push to the same endpoint, inside a request, never failed. Pushes
 * must now happen after a response, kept alive by waitUntil, at most once per
 * interval and one at a time.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from '@/lib/logger';
import { collectHttpMetrics } from '../http-metrics-collector';
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

describe('request-bound Grafana push', () => {
  const fetchMock = vi.fn();
  const t0 = 1_789_502_000_000;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('GRAFANA_CLOUD_PROMETHEUS_URL', 'https://metrics.example.test/write');
    vi.stubEnv('GRAFANA_CLOUD_PROMETHEUS_USER', 'test');
    vi.stubEnv('GRAFANA_CLOUD_API_KEY', 'test-only');
    vi.stubEnv('GRAFANA_CLOUD_PUSH_INTERVAL', '60');
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    vi.mocked(collectHttpMetrics).mockImplementation((labels, timestamp) => [
      { name: 'proxy_http_requests_total', labels, value: 3, timestamp },
    ]);
    prometheusPushService.stop();
  });

  afterEach(() => {
    prometheusPushService.stop();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('starts without a free-running timer and without pushing outside a request', () => {
    const interval = vi.spyOn(globalThis, 'setInterval');

    prometheusPushService.start();

    expect(interval).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(prometheusPushService.isActive()).toBe(true);
  });

  it('pushes at most once per interval, returning the push for waitUntil', async () => {
    prometheusPushService.start();

    const first = prometheusPushService.pushIfDue(t0);
    expect(first).toBeInstanceOf(Promise);
    await first;
    expect(prometheusPushService.pushIfDue(t0 + 59_999)).toBeNull();
    const next = prometheusPushService.pushIfDue(t0 + 60_000);
    await next;

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('never overlaps two pushes from the same instance', async () => {
    let finish: (() => void) | undefined;
    fetchMock.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = () => resolve(new Response(null, { status: 204 }));
      }),
    );
    prometheusPushService.start();

    const first = prometheusPushService.pushIfDue(t0);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(prometheusPushService.pushIfDue(t0 + 120_000)).toBeNull();
    finish?.();
    await first;

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('starts itself lazily in a process where boot did not start it', async () => {
    const pending = prometheusPushService.pushIfDue(t0);

    expect(pending).toBeInstanceOf(Promise);
    await pending;
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('stays inert outside production deployments', () => {
    vi.stubEnv('VERCEL_ENV', 'preview');

    expect(prometheusPushService.pushIfDue(t0)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports a failed push once at warning level and does not throw', async () => {
    fetchMock.mockRejectedValueOnce(
      Object.assign(new Error('The operation was aborted due to timeout'), {
        name: 'TimeoutError',
      }),
    );
    prometheusPushService.start();

    await expect(prometheusPushService.pushIfDue(t0)).resolves.toBeUndefined();

    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledExactlyOnceWith(
      'Metrics collector failed: grafana_transport',
      expect.objectContaining({ collector: 'grafana_transport', errorType: 'TimeoutError' }),
    );
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from '@/lib/logger';
import { collectMetricSource } from '../collect-metric-source';
import { getVercelLimits } from '../vercel-limits';
import { prometheusPushService } from '../prometheus-push-service';

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
  },
}));
vi.mock('../vercel-api-client', () => ({
  queryProjectUsage: vi.fn(),
  queryTeamLimits: vi.fn(),
  getDefaultLimits: vi.fn(),
}));
vi.mock('../service-limits-metrics', () => ({ collectServiceLimitsSamples: vi.fn(() => []) }));
vi.mock('../tier-metrics-collector', () => ({ collectTierMetrics: vi.fn(() => []) }));
vi.mock('../http-metrics-collector', () => ({ collectHttpMetrics: vi.fn(() => []) }));
vi.mock('../funnel-metrics-collectors', () => ({
  collectFunnelMetrics: vi.fn(() => []),
  collectBudgetMetrics: vi.fn(() => []),
  collectAbuseMetrics: vi.fn(() => []),
  collectConversionMetrics: vi.fn(() => []),
}));

describe('optional monitoring reliability', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => {
    prometheusPushService.stop();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('records an unconfigured Vercel skip once at info level', async () => {
    vi.stubEnv('VERCEL_TOKEN', '');
    await expect(getVercelLimits()).resolves.toMatchObject({ status: 'not_configured' });
    await expect(getVercelLimits()).resolves.toMatchObject({ status: 'not_configured' });
    expect(logger.info).toHaveBeenCalledExactlyOnceWith(
      'Metrics collector skipped (not configured)',
      {
        collector: 'vercel',
      },
    );
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('reports failed SQL monitoring once as a warning retaining safe driver attribution', async () => {
    const cause = Object.assign(new Error('sensitive driver detail'), {
      code: 'P2010',
      meta: { code: '42501', message: 'sensitive SQL detail' },
    });
    const failure = new Error('Supabase monitoring query failed: connection_count', { cause });
    failure.name = 'MonitoringQueryError';
    const samples = await collectMetricSource('supabase', () => Promise.reject(failure), {}, 42);
    expect(samples).toContainEqual({
      name: 'metric_collector_up',
      labels: { collector: 'supabase' },
      value: 0,
      timestamp: 42,
    });
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledExactlyOnceWith('Metrics collector failed: supabase', {
      collector: 'supabase',
      component: 'metrics-collector',
      errorType: 'MonitoringQueryError',
      code: 'P2010',
      sqlState: '42501',
      query: 'connection_count',
    });
    expect(JSON.stringify(vi.mocked(logger.warn).mock.calls)).not.toContain('sensitive');
  });

  it('skips repeated unconfigured pushes before collecting or sending', async () => {
    vi.stubEnv('GRAFANA_CLOUD_PROMETHEUS_URL', '');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(prometheusPushService.initialize()).toBe(false);
    await expect(prometheusPushService.pushMetrics()).resolves.toBeUndefined();
    await expect(prometheusPushService.pushMetrics()).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledExactlyOnceWith(
      'Metrics collector skipped (not configured)',
      {
        collector: 'grafana',
      },
    );
  });

  it('clears stale configuration when credentials are removed', () => {
    vi.stubEnv('GRAFANA_CLOUD_PROMETHEUS_URL', 'https://metrics.example.test/write');
    vi.stubEnv('GRAFANA_CLOUD_PROMETHEUS_USER', 'test');
    vi.stubEnv('GRAFANA_CLOUD_API_KEY', 'test');
    expect(prometheusPushService.initialize()).toBe(true);
    vi.stubEnv('GRAFANA_CLOUD_API_KEY', ' ');
    expect(prometheusPushService.initialize()).toBe(false);
    expect(prometheusPushService.isConfigured()).toBe(false);
  });
});

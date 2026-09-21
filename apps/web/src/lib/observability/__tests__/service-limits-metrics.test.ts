import { beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from '@/lib/logger';
import { getVercelLimits } from '../vercel-limits';
import { getSupabaseLimits } from '../supabase-limits';
import { getAzureOpenAILimits } from '../azure-openai-limits';
import { collectServiceLimitsSamples } from '../service-limits-metrics';

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => ({ info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  },
}));
vi.mock('../vercel-limits', () => ({ getVercelLimits: vi.fn() }));
vi.mock('../supabase-limits', () => ({ getSupabaseLimits: vi.fn() }));
vi.mock('../azure-openai-limits', () => ({ getAzureOpenAILimits: vi.fn() }));

const resource = { used: 12, limit: 100, usagePercent: 12, unit: 'MB', status: 'ok' as const };
const vercelResource = { used: 8, limit: 100, percent: 8, status: 'ok' as const };
const labels = { instance: 'test' };
const timestamp = 1234;

describe('service limit collector health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getVercelLimits).mockResolvedValue({
      bandwidth: vercelResource,
      builds: vercelResource,
      functions: vercelResource,
      timestamp,
      status: 'ok',
    });
    vi.mocked(getSupabaseLimits).mockResolvedValue({
      database: resource,
      connections: resource,
      storage: null,
      timestamp: 'test',
    });
    vi.mocked(getAzureOpenAILimits).mockResolvedValue({
      status: 'ok',
      tpm: resource,
      rpm: resource,
      timestamp: 'test',
    });
  });

  it('preserves exact independent metric triplets and exposes a failed Supabase source', async () => {
    const error = new Error('Connection terminated due to connection timeout');
    vi.mocked(getSupabaseLimits).mockRejectedValueOnce(error);

    const samples = await collectServiceLimitsSamples(labels, timestamp);

    expect(samples.filter((s) => s.labels.service === 'supabase')).toEqual([]);
    expect(samples.filter((s) => s.labels.service === 'vercel')).toHaveLength(9);
    expect(samples.filter((s) => s.labels.service === 'azure_openai')).toHaveLength(6);
    expect(samples).toContainEqual({
      name: 'service_limit_absolute',
      labels: { ...labels, service: 'vercel', metric: 'bandwidth', type: 'used' },
      value: 8,
      timestamp,
    });
    expect(samples).toContainEqual({
      name: 'metric_collector_up',
      labels: { ...labels, collector: 'supabase' },
      value: 0,
      timestamp,
    });
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledExactlyOnceWith(    'Metrics collector failed: supabase', {
      collector: 'supabase',
      component: 'metrics-collector',
      errorType: 'Error',
    });
  });

  it('reports an unconfigured Vercel integration as unavailable without an error report', async () => {
    vi.mocked(getVercelLimits).mockResolvedValue({
      bandwidth: vercelResource,
      builds: vercelResource,
      functions: vercelResource,
      timestamp,
      status: 'not_configured',
      error: 'VERCEL_TOKEN not configured',
    });

    for (let attempt = 0; attempt < 2; attempt++) {
      const samples = await collectServiceLimitsSamples(labels, timestamp);

      expect(samples.filter((s) => s.labels.service === 'vercel')).toEqual([]);
      expect(samples).toContainEqual({
        name: 'metric_collector_enabled',
        labels: { ...labels, collector: 'vercel' },
        value: 0,
        timestamp,
      });
      expect(samples).toContainEqual({
        name: 'metric_collector_up',
        labels: { ...labels, collector: 'vercel' },
        value: 0,
        timestamp,
      });
      expect(samples.filter((s) => s.labels.service === 'supabase')).toHaveLength(6);
    }
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('reports a failing configured integration exactly once, never as zero usage', async () => {
    vi.mocked(getVercelLimits).mockResolvedValueOnce({
      bandwidth: vercelResource,
      builds: vercelResource,
      functions: vercelResource,
      timestamp,
      status: 'error',
      error: 'Vercel API error: 401 Unauthorized',
    });

    vi.mocked(getAzureOpenAILimits).mockResolvedValueOnce({
      status: 'error',
      tpm: null,
      rpm: null,
      timestamp: 'test',
      error: 'Azure authentication failed',
    });

    const samples = await collectServiceLimitsSamples(labels, timestamp);

    expect(
      samples.filter((s) => s.labels.service === 'vercel' || s.labels.service === 'azure_openai'),
    ).toEqual([]);
    for (const collector of ['vercel', 'azure_openai']) {
      expect(samples).toContainEqual({
        name: 'metric_collector_up',
        labels: { ...labels, collector },
        value: 0,
        timestamp,
      });
      expect(
        vi
          .mocked(logger.warn)
          .mock.calls.filter(
            (call) => (call[1] as { collector?: string } | undefined)?.collector === collector,
          ),
      ).toHaveLength(1);
    }
    expect(samples.filter((s) => s.labels.service === 'supabase')).toHaveLength(6);
  });

  it('exposes deliberately disabled Azure monitoring without repeated error reports', async () => {
    vi.mocked(getAzureOpenAILimits).mockResolvedValue({
      status: 'not_configured',
      error: 'NOT_CONFIGURED: Azure Monitor disabled by ADR 0142',
      tpm: null,
      rpm: null,
      timestamp: 'test',
    });
    for (let attempt = 0; attempt < 2; attempt++) {
      const samples = await collectServiceLimitsSamples(labels, timestamp);
      expect(samples.filter((sample) => sample.labels.service === 'azure_openai')).toEqual([]);
      expect(samples).toContainEqual({
        name: 'metric_collector_enabled',
        labels: { ...labels, collector: 'azure_openai' },
        value: 0,
        timestamp,
      });
      expect(
        samples.filter(
          (sample) =>
            sample.name === 'metric_collector_up' && sample.labels.collector === 'azure_openai',
        ),
      ).toEqual([
        {
          name: 'metric_collector_up',
          labels: { ...labels, collector: 'azure_openai' },
          value: 0,
          timestamp,
        },
      ]);
      expect(samples.filter((sample) => sample.labels.service === 'supabase')).toHaveLength(6);
    }
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });
});

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
    expect(logger.error).toHaveBeenCalledWith(
      'Metrics collector failed',
      { collector: 'supabase' },
      error,
    );
  });

  it('reports unconfigured services as unhealthy, never as zero usage or healthy absence', async () => {
    vi.mocked(getVercelLimits).mockResolvedValueOnce({
      bandwidth: vercelResource,
      builds: vercelResource,
      functions: vercelResource,
      timestamp,
      error: 'VERCEL_TOKEN not configured',
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
      expect(logger.error).toHaveBeenCalledWith(
        'Metrics collector failed',
        { collector },
        expect.any(Error),
      );
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

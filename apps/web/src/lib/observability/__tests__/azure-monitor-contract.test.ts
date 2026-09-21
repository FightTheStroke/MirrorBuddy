// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from '@/lib/logger';
import { setCache } from '@/app/api/azure/costs/helpers';
import { parseAzureResourceId, queryAzureMetrics } from '../azure-monitor-client';

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    child: () => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }),
  },
}));

describe('Azure Monitor HTTP failure contract', () => {
  const boundary = vi.fn<typeof fetch>();
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('AZURE_TENANT_ID', 'local-tenant');
    vi.stubEnv('AZURE_CLIENT_ID', 'local-client');
    vi.stubEnv('AZURE_CLIENT_SECRET', 'local-disposable-secret');
    vi.stubEnv('AZURE_SUBSCRIPTION_ID', 'local-subscription');
    setCache('azure_token', 'local-access-token');
    vi.stubGlobal('fetch', boundary);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it.each([401, 429, 500])(
    'retains HTTP%s without logging or copying response bodies',
    async (status) => {
      boundary.mockResolvedValue(new Response('sensitive-provider-response', { status }));
      const error: unknown = await queryAzureMetrics('/local-resource', ['Requests']).catch(
        (failure: unknown) => failure,
      );
      expect(error).toMatchObject({ name: 'AzureProviderError', status, operation: 'metrics' });
      expect(String(error)).not.toContain('sensitive-provider-response');
      expect(error).not.toHaveProperty('responseBody');
      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
    },
  );

  it('preserves the exact original network cause', async () => {
    const cause = new TypeError('controlled network disconnect');
    boundary.mockRejectedValue(cause);
    await expect(queryAzureMetrics('/local-resource', ['Requests'])).rejects.toMatchObject({
      operation: 'metrics',
      cause,
    });
    expect(logger.error).not.toHaveBeenCalled();
  });

  it.each([null, {}, { value: null }])(
    'rejects invalid success shapes rather than inventing zero: %j',
    async (data) => {
      boundary.mockResolvedValue(Response.json(data));
      await expect(queryAzureMetrics('/local-resource', ['Requests'])).rejects.toMatchObject({
        operation: 'metrics',
      });
    },
  );

  it('keeps legitimate zero and sums valid provider datapoints', async () => {
    boundary.mockResolvedValueOnce(
      Response.json({ value: [{ timeseries: [{ data: [{ total: 0 }] }] }] }),
    );
    expect(await queryAzureMetrics('/local-resource', ['Requests'])).toBe(0);
    boundary.mockResolvedValueOnce(
      Response.json({ value: [{ timeseries: [{ data: [{ total: 8 }, { total: 9 }] }] }] }),
    );
    expect(await queryAzureMetrics('/local-resource', ['Requests'])).toBe(17);
  });

  it('handles absent configuration and invalid inputs without lower-level duplicate reports', async () => {
    expect(parseAzureResourceId(null)).toBeNull();
    expect(parseAzureResourceId(undefined)).toBeNull();
    expect(parseAzureResourceId('not-an-endpoint')).toBeNull();
    await expect(queryAzureMetrics('', [])).rejects.toMatchObject({ operation: 'configuration' });
    expect(boundary).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });
});

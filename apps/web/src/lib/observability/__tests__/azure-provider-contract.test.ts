// @vitest-environment node
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from '@/lib/logger';
import type { collectServiceLimitsSamples } from '../service-limits-metrics';
import type { prisma, dbPool } from '@/lib/db';

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    child: () => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }),
  },
}));

describe.skipIf(!process.env.TEST_DATABASE_URL)(
  'Azure provider contract with read-only PostgreSQL',
  () => {
    let collect: typeof collectServiceLimitsSamples;
    let database: typeof prisma;
    let pool: typeof dbPool;
    let helpers: typeof import('@/app/api/azure/costs/helpers');
    let limitsModule: typeof import('../azure-openai-limits');
    const labels = { instance: 'mirrorbuddy', env: 'production' };
    const boundary = vi.fn<typeof fetch>();
    let tokenStatus = 200;
    let tpmStatus = 200;

    beforeAll(async () => {
      for (const key of ['TEST_DATABASE_URL', 'DATABASE_URL', 'DEV_DATABASE_URL']) {
        const url = new URL(process.env[key] ?? '');
        expect(['localhost', '127.0.0.1']).toContain(url.hostname);
        expect(url.pathname).toBe('/mirrorbuddy_test');
        expect(url.searchParams.get('options')).toBe('-c default_transaction_read_only=on');
      }
      ({ prisma: database, dbPool: pool } = await import('@/lib/db'));
      expect(await database.$queryRaw`SHOW transaction_read_only`).toEqual([
        { transaction_read_only: 'on' },
      ]);
      ({ collectServiceLimitsSamples: collect } = await import('../service-limits-metrics'));
      helpers = await import('@/app/api/azure/costs/helpers');
      limitsModule = await import('../azure-openai-limits');
    });

    beforeEach(() => {
      vi.clearAllMocks();
      tokenStatus = 200;
      tpmStatus = 200;
      for (const [key, value] of Object.entries({
        AZURE_TENANT_ID: 'local-tenant',
        AZURE_CLIENT_ID: 'local-client',
        AZURE_CLIENT_SECRET: 'local-disposable-secret',
        AZURE_SUBSCRIPTION_ID: 'local-subscription',
        AZURE_OPENAI_ENDPOINT: 'https://local-fixture.openai.azure.com',
        AZURE_OPENAI_RESOURCE_GROUP: 'local-rg',
        VERCEL_TOKEN: '',
      }))
        vi.stubEnv(key, value);
      helpers.setCache('azure_token', null);
      helpers.setCache('azure_openai_limits', null);
      boundary.mockImplementation(async (input) => {
        const url = new URL(String(input));
        if (url.hostname === 'login.microsoftonline.com') {
          return Response.json({ access_token: 'local-access-token' }, { status: tokenStatus });
        }
        expect(url.hostname).toBe('management.azure.com');
        const isTpm = url.searchParams.get('metricnames') === 'TokenTransaction';
        return Response.json(
          { value: [{ timeseries: [{ data: [{ total: isTpm ? 321 : 17 }] }] }] },
          { status: isTpm ? tpmStatus : 200 },
        );
      });
      vi.stubGlobal('fetch', boundary);
    });

    afterEach(() => {
      vi.unstubAllEnvs();
      vi.unstubAllGlobals();
    });
    afterAll(async () => {
      await database?.$disconnect();
      if (pool && !pool.ended) await pool.end();
    });

    async function collectAggregate() {
      const { collectMetricSource } = await import('../collect-metric-source');
      return collectMetricSource('service_limits', () => collect(labels, 42), labels, 42);
    }

    it('rejects Monitor429 once without false TPM usage or healthy aggregate; preserves real RPM and PG', async () => {
      tpmStatus = 429;
      const samples = await collectAggregate();
      for (const collector of ['azure_openai', 'service_limits']) {
        expect(samples).toContainEqual({
          name: 'metric_collector_up',
          labels: { ...labels, collector },
          value: 0,
          timestamp: 42,
        });
      }
      expect(
        samples.filter(
          (s) => s.labels.service === 'azure_openai' && s.labels.metric === 'chat_tpm',
        ),
      ).toEqual([]);
      expect(samples).toContainEqual({
        name: 'service_limit_absolute',
        labels: { ...labels, service: 'azure_openai', metric: 'chat_rpm', type: 'used' },
        value: 17,
        timestamp: 42,
      });
      expect(samples.filter((s) => s.labels.service === 'supabase')).toHaveLength(6);
      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledExactlyOnceWith(
        'Metrics collector failed',
        { collector: 'azure_openai' },
        expect.objectContaining({ status: 429, operation: 'metrics' }),
      );
    });

    it('reports token401 exactly once with original status and no manufactured usage', async () => {
      tokenStatus = 401;
      const samples = await collectAggregate();
      expect(samples.filter((s) => s.labels.service === 'azure_openai')).toEqual([]);
      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledExactlyOnceWith(
        'Metrics collector failed',
        { collector: 'azure_openai' },
        expect.objectContaining({ status: 401, operation: 'token' }),
      );
      expect(boundary).toHaveBeenCalledTimes(1);
    });

    it('keeps unavailable monitoring silent and explicitly disabled', async () => {
      vi.stubEnv('AZURE_CLIENT_SECRET', '');
      const samples = await collectAggregate();
      for (const name of ['metric_collector_enabled', 'metric_collector_up']) {
        expect(samples).toContainEqual({
          name,
          labels: { ...labels, collector: 'azure_openai' },
          value: 0,
          timestamp: 42,
        });
      }
      expect(boundary).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('retains original network failure cause through the reporting boundary', async () => {
      const original = new TypeError('controlled token network failure');
      boundary.mockRejectedValue(original);
      await collectAggregate();
      expect(logger.error).toHaveBeenCalledExactlyOnceWith(
        'Metrics collector failed',
        { collector: 'azure_openai' },
        expect.objectContaining({ operation: 'token', cause: original }),
      );
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('preserves healthy cached values and both stress helper contracts', async () => {
      const samples = await collectAggregate();
      expect(samples.some((s) => s.labels.metric === 'chat_tpm' && s.value === 321)).toBe(true);
      const requests = boundary.mock.calls.length;
      expect(await limitsModule.isAzureOpenAIStressed()).toBe(false);
      expect(await limitsModule.getAzureOpenAIStressReport()).toContain('RPM: 17/1000');
      expect(boundary).toHaveBeenCalledTimes(requests);
    });

    it('preserves healthy TPM when RPM fails, while both stress helpers report unavailable', async () => {
      boundary.mockImplementation(async (input) => {
        const url = new URL(String(input));
        if (url.hostname === 'login.microsoftonline.com')
          return Response.json({ access_token: 'local-access-token' });
        if (url.searchParams.get('metricnames') === 'Requests')
          return new Response(null, { status: 429 });
        return Response.json({ value: [{ timeseries: [{ data: [{ total: 321 }] }] }] });
      });
      const samples = await collectAggregate();
      expect(
        samples.some(
          (s) => s.labels.metric === 'chat_tpm' && s.labels.type === 'used' && s.value === 321,
        ),
      ).toBe(true);
      expect(samples.some((s) => s.labels.metric === 'chat_rpm')).toBe(false);
      expect(logger.error).toHaveBeenCalledExactlyOnceWith(
        'Metrics collector failed',
        { collector: 'azure_openai' },
        expect.objectContaining({ status: 429 }),
      );
      expect(await limitsModule.isAzureOpenAIStressed()).toBeNull();
      expect(await limitsModule.getAzureOpenAIStressReport()).toContain('HTTP 429');
      expect(logger.error).toHaveBeenCalledTimes(1);
    });
  },
);

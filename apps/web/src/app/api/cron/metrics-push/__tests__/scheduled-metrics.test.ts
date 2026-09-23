import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { collectDatabaseBackedSamples } from '../scheduled-metrics';
import { pushToGrafana } from '../transport';

const mocks = vi.hoisted(() => ({
  groups: vi.fn(),
  tiers: vi.fn(),
  activity: vi.fn(),
  changes: vi.fn(),
  vercel: vi.fn(),
  supabase: vi.fn(),
  azure: vi.fn(),
  report: vi.fn(),
}));
vi.mock('@/lib/db', () => ({
  prisma: {
    userSubscription: { groupBy: mocks.groups },
    $queryRaw: mocks.activity,
    tierDefinition: { findMany: mocks.tiers },
    tierAuditLog: { findMany: mocks.changes },
  },
}));
vi.mock('@/lib/observability/vercel-limits', () => ({ getVercelLimits: mocks.vercel }));
vi.mock('@/lib/observability/supabase-limits', () => ({ getSupabaseLimits: mocks.supabase }));
vi.mock('@/lib/observability/azure-openai-limits', () => ({ getAzureOpenAILimits: mocks.azure }));
vi.mock('@/lib/observability/collector-diagnostics', () => ({
  reportCollectorFailure: mocks.report,
}));
const labels = { instance: 'mirrorbuddy', env: 'production' };
const now = 1789984800123;
const resource = { used: 12, limit: 100, usagePercent: 12 };
const vercelResource = { used: 8, limit: 100, percent: 8 };
const fetchMock = vi.fn();

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('GRAFANA_CLOUD_PROMETHEUS_URL', 'https://metrics.example.com/write');
  vi.stubEnv('GRAFANA_CLOUD_PROMETHEUS_USER', 'test-user');
  vi.stubEnv('GRAFANA_CLOUD_API_KEY', 'test-key');
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
  mocks.groups.mockResolvedValue([{ tierId: 'base-id', _count: { id: 10 } }]);
  mocks.tiers.mockResolvedValue([
    { id: 'base-id', code: 'base', sortOrder: 1 },
    { id: 'pro-id', code: 'pro', sortOrder: 2 },
  ]);
  mocks.activity.mockResolvedValueOnce([
    { tierId: 'base-id', wau: BigInt(4), mau: BigInt(7), dau: BigInt(2), churned: BigInt(3) },
  ]);
  mocks.changes.mockResolvedValue([
    { changes: { from: { tierId: 'base-id' }, to: { tierId: 'pro-id' } } },
    { changes: { from: { tierId: 'pro-id' }, to: { tierId: 'base-id' } } },
  ]);
  mocks.vercel.mockResolvedValue({
    status: 'ok',
    bandwidth: vercelResource,
    builds: vercelResource,
    functions: vercelResource,
  });
  mocks.supabase.mockResolvedValue({
    database: resource,
    connections: resource,
    storage: resource,
  });
  mocks.azure.mockResolvedValue({ status: 'ok', tpm: resource, rpm: resource });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const health = (collector: string, enabled: number, up: number) => [
  {
    name: 'metric_collector_enabled',
    labels: { ...labels, collector },
    value: enabled,
    timestamp: now,
  },
  { name: 'metric_collector_up', labels: { ...labels, collector }, value: up, timestamp: now },
];

describe('scheduled metric fidelity', () => {
  it.each(['1', '', undefined])(
    'delivers every shared-source sample once without startup (VERCEL=%s)',
    async (vercel) => {
      vi.stubEnv('VERCEL', vercel);
      const interval = vi.spyOn(globalThis, 'setInterval');
      const samples = await collectDatabaseBackedSamples(labels, now);
      const expected = [];
      for (const [service, resources, used] of [
        ['vercel', ['bandwidth', 'builds', 'functions'], 8],
        ['supabase', ['database', 'connections', 'storage'], 12],
        ['azure_openai', ['chat_tpm', 'chat_rpm'], 12],
      ] as const) {
        for (const metric of resources) {
          const resourceLabels = { ...labels, service, metric };
          expected.push(
            {
              name: 'service_limit_usage_percentage',
              labels: resourceLabels,
              value: used,
              timestamp: now,
            },
            {
              name: 'service_limit_absolute',
              labels: { ...resourceLabels, type: 'used' },
              value: used,
              timestamp: now,
            },
            {
              name: 'service_limit_absolute',
              labels: { ...resourceLabels, type: 'limit' },
              value: 100,
              timestamp: now,
            },
          );
        }
      }
      for (const [name, value] of Object.entries({
        mirrorbuddy_users_by_tier: 10,
        mirrorbuddy_active_users_by_tier: 4,
        mirrorbuddy_total_active_by_tier: 4,
        mirrorbuddy_wau_by_tier: 4,
        mirrorbuddy_mau_by_tier: 7,
        mirrorbuddy_dau_by_tier: 2,
        mirrorbuddy_churned_users_by_tier: 3,
        mirrorbuddy_churn_rate_by_tier: 0.3,
      })) {
        expected.push({ name, labels: { ...labels, tier: 'base' }, value, timestamp: now });
      }
      for (const name of ['mirrorbuddy_tier_upgrades_total', 'mirrorbuddy_tier_downgrades_total']) {
        expected.push({ name, labels, value: 1, timestamp: now });
      }
      for (const collector of ['vercel', 'supabase', 'azure_openai', 'service_limits', 'tier']) {
        expected.push(...health(collector, 1, 1));
      }
      expect(samples).toHaveLength(44);
      expect(samples).toEqual(expect.arrayContaining(expected));

      await pushToGrafana(samples);

      expect(fetchMock).toHaveBeenCalledOnce();
      const body = fetchMock.mock.calls[0][1].body as string;
      const lines = body.split('\n');
      expect(lines).toHaveLength(expected.length);
      expect(new Set(lines).size).toBe(expected.length);
      for (const sample of expected) {
        const tags = Object.entries(sample.labels)
          .map(([key, value]) => `${key}=${value}`)
          .join(',');
        expect(lines).toContain(
          `${sample.name},${tags} value=${sample.value} ${sample.timestamp * 1e6}`,
        );
      }
      for (const source of [mocks.vercel, mocks.supabase, mocks.azure, mocks.groups]) {
        expect(source).toHaveBeenCalledOnce();
      }
      expect(interval).not.toHaveBeenCalled();
      expect(mocks.report).not.toHaveBeenCalled();
    },
  );

  it('keeps disabled Azure separate from failed Supabase and reports the failure only once', async () => {
    const failure = new Error('database unavailable');
    mocks.supabase.mockRejectedValueOnce(failure);
    mocks.azure.mockResolvedValueOnce({ status: 'not_configured', tpm: null, rpm: null });

    const samples = await collectDatabaseBackedSamples(labels, now);
    await pushToGrafana(samples);

    expect(samples).toEqual(
      expect.arrayContaining([
        ...health('azure_openai', 0, 0),
        ...health('supabase', 1, 0),
        ...health('service_limits', 1, 0),
        ...health('vercel', 1, 1),
        ...health('tier', 1, 1),
      ]),
    );
    expect(
      samples.filter((sample) => ['supabase', 'azure_openai'].includes(sample.labels.service)),
    ).toEqual([]);
    expect(mocks.report).toHaveBeenCalledExactlyOnceWith('supabase', failure);
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});

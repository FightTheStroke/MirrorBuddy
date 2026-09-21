// @vitest-environment node
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  cleanup: vi.fn(),
  funnel: vi.fn(),
  waitlist: vi.fn(),
  summary: vi.fn(),
  behavioral: vi.fn(),
  batch: vi.fn(),
  database: vi.fn(),
  fetch: vi.fn(),
  report: vi.fn(),
  skipped: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    $queryRaw: mocks.query,
    userActivity: { deleteMany: mocks.cleanup },
    funnelEvent: { groupBy: mocks.funnel },
    waitlistEntry: { count: mocks.waitlist },
  },
}));
vi.mock('@/lib/observability/metrics-store', () => ({
  metricsStore: { getMetricsSummary: mocks.summary },
}));
vi.mock('@/app/api/metrics/sli-metrics', () => ({
  generateSLIMetrics: () => [{ name: 'sli_availability', labels: {}, value: 0.99 }],
}));
vi.mock('@/app/api/metrics/behavioral-metrics', () => ({
  generateBehavioralMetrics: mocks.behavioral,
}));
vi.mock('@/lib/funnel/batch-funnel', () => ({
  processBatchFunnelEvents: mocks.batch,
}));
vi.mock('../scheduled-metrics', () => ({
  collectDatabaseBackedSamples: mocks.database,
}));
vi.mock('@/lib/observability/collector-diagnostics', () => ({
  reportCollectorFailure: mocks.report,
  logCollectorSkippedOnce: mocks.skipped,
  isGrafanaConfigured: () =>
    [
      process.env.GRAFANA_CLOUD_PROMETHEUS_URL,
      process.env.GRAFANA_CLOUD_PROMETHEUS_USER,
      process.env.GRAFANA_CLOUD_API_KEY,
    ].every((value) => Boolean(value?.trim())),
}));

const configKeys = [
  'GRAFANA_CLOUD_PROMETHEUS_URL',
  'GRAFANA_CLOUD_PROMETHEUS_USER',
  'GRAFANA_CLOUD_API_KEY',
] as const;
const request = (authorized = true) =>
  new NextRequest('http://localhost/api/cron/metrics-push', {
    headers: authorized ? { authorization: 'Bearer test-secret' } : {},
  });
const body = () => mocks.fetch.mock.calls[0]?.[1]?.body as string;
const health = (collector: string, up: number) => {
  expect(body()).toMatch(
    new RegExp(`metric_collector_enabled,[^\\n]*collector=${collector}[^\\n]* value=1 `),
  );
  expect(body()).toMatch(
    new RegExp(`metric_collector_up,[^\\n]*collector=${collector}[^\\n]* value=${up} `),
  );
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('VERCEL_ENV', 'production');
  vi.stubEnv('CRON_SECRET', 'test-secret');
  vi.stubEnv(configKeys[0], 'https://grafana.example/write');
  vi.stubEnv(configKeys[1], 'test-user');
  vi.stubEnv(configKeys[2], 'test-key');
  mocks.query.mockImplementation(async (parts: TemplateStringsArray) =>
    parts.join('').includes('GROUP BY "userType"')
      ? [{ userType: 'logged', count: BigInt(3) }]
      : [],
  );
  mocks.cleanup.mockResolvedValue({ count: 0 });
  mocks.funnel.mockResolvedValue([{ stage: 'VISITOR', _count: { _all: 10 } }]);
  mocks.waitlist.mockResolvedValue(4);
  mocks.summary.mockReturnValue({
    routes: { '/chat': { count: 7, p95LatencyMs: 250, errorRate: 0.1 } },
  });
  mocks.behavioral.mockResolvedValue([
    { name: 'session_success_rate', labels: { mode: 'voice' }, value: 0.8 },
  ]);
  mocks.batch.mockResolvedValue({ processed: 1 });
  mocks.database.mockResolvedValue([
    { name: 'tier_users', labels: { tier: 'base' }, value: 5, timestamp: 1234 },
  ]);
  mocks.fetch.mockResolvedValue(new Response(null, { status: 204 }));
  vi.stubGlobal('fetch', mocks.fetch);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('cron configuration and authorization', () => {
  it.each(configKeys.flatMap((key) => [undefined, '', '  '].map((value) => ({ key, value }))))(
    'skips before work when $key is "$value"',
    async ({ key, value }) => {
      vi.stubEnv(key, value);
      const { GET } = await import('../route');
      const response = await GET(request());
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ status: 'skipped' });
      expect(mocks.query).not.toHaveBeenCalled();
      expect(mocks.summary).not.toHaveBeenCalled();
      expect(mocks.funnel).not.toHaveBeenCalled();
      expect(mocks.waitlist).not.toHaveBeenCalled();
      expect(mocks.batch).not.toHaveBeenCalled();
      expect(mocks.database).not.toHaveBeenCalled();
      expect(mocks.fetch).not.toHaveBeenCalled();
      expect(mocks.skipped).toHaveBeenCalledWith('grafana');
      expect(mocks.report).not.toHaveBeenCalled();
    },
  );
  it.each([true, false])('enforces auth even with Grafana configured=%s', async (configured) => {
    if (!configured) vi.stubEnv(configKeys[0], '');
    const { GET, POST } = await import('../route');
    expect((await GET(request(false))).status).toBe(401);
    expect((await POST(request(false))).status).toBe(401);
    expect(mocks.query).not.toHaveBeenCalled();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});

describe('isolated collectors and transport', () => {
  it.each([
    ['GROUP BY route', 'realtime-active-users'],
    ['FROM latest', 'churn-metrics'],
  ])('isolates a later SQL failure in %s', async (query, collector) => {
    const failure = new Error('query failed');
    mocks.query.mockImplementation(async (parts: TemplateStringsArray) => {
      if (parts.join('').includes(query)) throw failure;
      return parts.join('').includes('GROUP BY "userType"')
        ? [{ userType: 'logged', count: BigInt(3) }]
        : [];
    });
    const { GET } = await import('../route');
    expect((await GET(request())).status).toBe(200);
    expect(body()).toMatch(/mirrorbuddy_realtime_active_users,[^\n]*user_type=logged value=3 /);
    expect(body()).toContain('waitlist_signups_total,');
    expect(mocks.report).toHaveBeenCalledExactlyOnceWith(collector, failure);
    health(collector, 0);
  });
  it.each([
    ['cron-http', 'summary', 'http_requests_total'],
    ['realtime-active-users', 'query', 'mirrorbuddy_realtime_active_users'],
    ['funnel-metrics', 'funnel', 'mirrorbuddy_funnel_stage_count'],
    ['behavioral-metrics', 'behavioral', 'session_success_rate'],
    ['batch-funnel', 'batch', 'unused'],
    ['waitlist-metrics', 'waitlist', 'waitlist_signups_total'],
    ['database-backed', 'database', 'tier_users'],
  ] as const)('isolates %s and reports once', async (collector, mock, absent) => {
    const failure = new Error('collector failed');
    if (mock === 'summary')
      mocks.summary.mockImplementationOnce(() => {
        throw failure;
      });
    else mocks[mock].mockRejectedValueOnce(failure);
    const { GET } = await import('../route');
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(mocks.report).toHaveBeenCalledExactlyOnceWith(collector, failure);
    expect(body()).not.toContain(`${absent},`);
    expect(body()).toContain('mirrorbuddy_funnel_churn_rate,');
    health(collector, 0);
    health('churn-metrics', 1);
  });
  it('preserves successful activity counts when cleanup fails', async () => {
    const failure = Object.assign(new Error('read-only'), { code: '25006' });
    mocks.cleanup.mockRejectedValueOnce(failure);
    const { GET } = await import('../route');
    expect((await GET(request())).status).toBe(200);
    expect(body()).toMatch(/mirrorbuddy_realtime_active_users,[^\n]*user_type=logged value=3 /);
    expect(body()).toContain('waitlist_signups_total,');
    expect(mocks.report).toHaveBeenCalledExactlyOnceWith('realtime-active-users', failure);
    expect(mocks.batch).toHaveBeenCalledOnce();
    health('realtime-active-users', 0);
  });
  it('keeps every successful section and original database sample timestamp', async () => {
    const { GET } = await import('../route');
    const response = await GET(request());
    expect((await response.json()).metrics_pushed).toBe(body().split('\n').length);
    for (const collector of [
      'cron-http',
      'realtime-active-users',
      'funnel-metrics',
      'churn-metrics',
      'behavioral-metrics',
      'batch-funnel',
      'waitlist-metrics',
      'database-backed',
    ])
      health(collector, 1);
    expect(body()).toContain('tier_users,tier=base value=5 1234000000');
    expect(body()).toMatch(
      /http_request_duration_seconds,[^\n]*route=\/chat,quantile=0.95 value=0.25 /,
    );
    expect(mocks.cleanup).toHaveBeenCalledOnce();
    expect(mocks.batch).toHaveBeenCalledOnce();
    expect(mocks.report).not.toHaveBeenCalled();
  });
  it.each(['http', 'network'])(
    'returns 502 and one diagnostic on %s transport failure',
    async (kind) => {
      const unsafeText = vi.fn().mockResolvedValue('private response body');
      if (kind === 'http')
        mocks.fetch.mockResolvedValue({ ok: false, status: 429, text: unsafeText });
      else mocks.fetch.mockRejectedValue(new TypeError('private network details'));
      const { GET } = await import('../route');
      const response = await GET(request());
      expect(response.status).toBe(502);
      expect(await response.json()).toMatchObject({
        status: 'error',
        error: 'Metrics push failed',
      });
      expect(mocks.report).toHaveBeenCalledTimes(1);
      expect(mocks.report.mock.calls[0][0]).toBe('grafana_transport');
      if (kind === 'http') {
        expect(mocks.report.mock.calls[0][1]).toMatchObject({
          name: 'MetricsPushError',
          status: 429,
        });
        expect(unsafeText).not.toHaveBeenCalled();
      }
    },
  );
});

/**
 * One malformed sample must not silence every metric.
 *
 * Grafana rejects an entire batch with 400 if a single line is malformed — an
 * empty label value is enough. That is what `grafana_transport` has been: a
 * handful of pushes a day losing *all* metrics because one sample among dozens
 * carried an empty label, with nothing in the report to say which one.
 *
 * Verified against the real endpoint while diagnosing this: a body containing
 * `value=NaN`, `value=undefined` or `source=` (empty label) returns 400, while
 * a 2000-line batch of well-formed samples returns 204.
 *
 * The transport now drops what Grafana would refuse, names it, and pushes the
 * rest.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MetricSample } from '@/lib/observability/http-metrics-collector';

const { childWarn } = vi.hoisted(() => ({ childWarn: vi.fn() }));

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: childWarn,
      error: vi.fn(),
    }),
  },
}));

const NOW = 1_700_000_000_000;

function sample(overrides: Partial<MetricSample> = {}): MetricSample {
  return {
    name: 'mirrorbuddy_sessions_total',
    labels: { instance: 'mirrorbuddy', env: 'production' },
    value: 3,
    timestamp: NOW,
    ...overrides,
  } as MetricSample;
}

describe('Pushing metrics that Grafana would refuse', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    process.env.GRAFANA_CLOUD_PROMETHEUS_URL = 'https://grafana.example/api/push';
    process.env.GRAFANA_CLOUD_PROMETHEUS_USER = 'user';
    process.env.GRAFANA_CLOUD_API_KEY = 'key';
    fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204, text: async () => '' });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function push(samples: MetricSample[]) {
    const { pushToGrafana } = await import('../transport');
    await pushToGrafana(samples);
    return (fetchMock.mock.calls[0]?.[1]?.body as string) ?? '';
  }

  it('sends the healthy metrics even when one sample is malformed', async () => {
    const body = await push([
      sample({ name: 'good_metric' }),
      sample({ name: 'bad_metric', labels: { instance: '' } }),
    ]);

    expect(body).toContain('good_metric');
    expect(body).not.toContain('bad_metric');
  });

  it('drops a sample whose label is only whitespace', async () => {
    const body = await push([sample({ name: 'spaced', labels: { tier: '  ' } })]);

    expect(body).not.toContain('spaced');
  });

  it('drops a sample with no value to report', async () => {
    const body = await push([
      sample({ name: 'kept' }),
      sample({ name: 'not_a_number', value: Number.NaN }),
    ]);

    expect(body).toContain('kept');
    expect(body).not.toContain('not_a_number');
  });

  it('names what it dropped, so the source can be fixed', async () => {
    childWarn.mockClear();
    await push([sample({ name: 'kept' }), sample({ name: 'culprit', labels: { tier: '' } })]);

    const warned = childWarn.mock.calls
      .flatMap((call) => call.map((part) => JSON.stringify(part)))
      .join(' ');
    expect(warned).toContain('culprit');
  });

  it('does not call Grafana at all when nothing is left to send', async () => {
    await push([sample({ name: 'only_bad', value: Number.POSITIVE_INFINITY })]);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('escapes separators in metric names and label keys', async () => {
    const body = await push([
      sample({ name: 'odd name', labels: { 'weird key': 'value' }, value: 1 }),
    ]);

    expect(body).toBe(`odd\\ name,weird\\ key=value value=1 ${NOW * 1000000}`);
  });

  it('leaves a well-formed batch exactly as it was', async () => {
    const body = await push([sample({ name: 'sessions_total', value: 7 })]);

    expect(body).toBe(
      `sessions_total,instance=mirrorbuddy,env=production value=7 ${NOW * 1000000}`,
    );
  });
});

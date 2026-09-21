import { beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from '@/lib/logger';
import { collectMetricSource, MetricSourceError } from '../collect-metric-source';
import type { MetricSample } from '../http-metrics-collector';

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
  },
}));

describe('metric source boundary', () => {
  beforeEach(() => vi.clearAllMocks());

  const state = (collector: string, enabled: number, up: number, region = 'eu'): MetricSample[] =>
    [
      { name: 'metric_collector_enabled', value: enabled },
      { name: 'metric_collector_up', value: up },
    ].map((sample) => ({ ...sample, labels: { collector, region }, timestamp: 42 }));

  it('keeps healthy configured services up when optional Azure monitoring is disabled', async () => {
    const children = [...state('supabase', 1, 1), ...state('azure_openai', 0, 0)];
    const result = await collectMetricSource(
      'service_limits',
      () => children,
      { region: 'eu' },
      42,
    );
    expect(result.slice(0, children.length)).toEqual(children);
    expect(result).toContainEqual({
      name: 'metric_collector_up',
      labels: { region: 'eu', collector: 'service_limits' },
      value: 1,
      timestamp: 42,
    });
    expect(result).toContainEqual({
      name: 'metric_collector_enabled',
      labels: { region: 'eu', collector: 'service_limits' },
      value: 1,
      timestamp: 42,
    });
    expect(logger.error).not.toHaveBeenCalled();
  });

  it.each([
    { enabled: 1, up: 0, children: [...state('vercel', 1, 0), ...state('azure_openai', 0, 0)] },
    { enabled: 0, up: 0, children: [...state('vercel', 0, 0), ...state('azure_openai', 0, 0)] },
    { enabled: 1, up: 1, children: [...state('vercel', 1, 1), ...state('azure_openai', 1, 1)] },
  ])(
    'reports aggregate enabled=$enabled and up=$up without relogging children',
    async ({ enabled, up, children }) => {
      const result = await collectMetricSource(
        'service_limits',
        () => children,
        { region: 'eu' },
        42,
      );
      for (const [name, value] of [
        ['enabled', enabled],
        ['up', up],
      ] as const) {
        expect(
          result.filter(
            (sample) =>
              sample.name === `metric_collector_${name}` &&
              sample.labels.collector === 'service_limits',
          ),
        ).toEqual([
          {
            name: `metric_collector_${name}`,
            labels: { region: 'eu', collector: 'service_limits' },
            value,
            timestamp: 42,
          },
        ]);
      }
      expect(logger.error).not.toHaveBeenCalled();
    },
  );

  it('does not let a disabled region mask a failing region of the same provider', async () => {
    const children = [...state('azure_openai', 0, 0), ...state('azure_openai', 1, 0, 'us')];
    const result = await collectMetricSource('service_limits', () => children, {}, 42);
    expect(result).toContainEqual({
      name: 'metric_collector_up',
      labels: { collector: 'service_limits' },
      value: 0,
      timestamp: 42,
    });
    expect(result).toContainEqual({
      name: 'metric_collector_enabled',
      labels: { collector: 'service_limits' },
      value: 1,
      timestamp: 42,
    });
  });

  it('reports a configured collection exception once with enabled=1 and no fabricated usage', async () => {
    const error = new Error('Provider rejected credentials');
    const result = await collectMetricSource(
      'vercel',
      async () => {
        throw error;
      },
      {},
      42,
    );
    expect(result).toEqual([
      {
        name: 'metric_collector_enabled',
        labels: { collector: 'vercel' },
        value: 1,
        timestamp: 42,
      },
      { name: 'metric_collector_up', labels: { collector: 'vercel' }, value: 0, timestamp: 42 },
    ]);
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledExactlyOnceWith(    'Metrics collector failed: vercel', {
      collector: 'vercel',
      component: 'metrics-collector',
      errorType: 'Error',
    });
  });

  it.each([
    null,
    undefined,
    [{ name: 'invalid', labels: {}, value: NaN, timestamp: 42 }],
    [{ name: 'invalid', labels: null, value: 1, timestamp: 42 }],
    [{ name: 'metric_collector_up', labels: {}, value: 2, timestamp: 42 }],
  ])('reports malformed source output instead of publishing invalid samples: %j', async (value) => {
    const collect = vi.fn<() => MetricSample[]>().mockReturnValue(value as MetricSample[]);
    expect(await collectMetricSource('test', collect, {}, 42)).toEqual([
      { name: 'metric_collector_enabled', labels: { collector: 'test' }, value: 1, timestamp: 42 },
      { name: 'metric_collector_up', labels: { collector: 'test' }, value: 0, timestamp: 42 },
    ]);
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledExactlyOnceWith(    'Metrics collector failed: test', {
      collector: 'test',
      component: 'metrics-collector',
      errorType: 'Error',
    });
  });

  it('retains validated partial usage and reports the original cause, never healthy state', async () => {
    const cause = new Error('Controlled provider rejection');
    const usage = {
      name: 'service_limit_absolute',
      labels: { metric: 'rpm' },
      value: 17,
      timestamp: 42,
    };
    const result = await collectMetricSource(
      'azure_openai',
      () => {
        throw new MetricSourceError(cause, [usage, ...state('azure_openai', 0, 1)]);
      },
      { region: 'eu' },
      42,
    );
    expect(result).toEqual([usage, ...state('azure_openai', 1, 0)]);
    expect(logger.warn).toHaveBeenCalledExactlyOnceWith(    'Metrics collector failed: azure_openai', {
      collector: 'azure_openai',
      component: 'metrics-collector',
      errorType: 'Error',
    });
  });

  it('never publishes malformed partial usage even when a source supplies it with a failure', async () => {
    const cause = new Error('Controlled provider rejection');
    const result = await collectMetricSource(
      'azure_openai',
      () => {
        throw new MetricSourceError(cause, [
          { name: 'service_limit_absolute', labels: {}, value: NaN, timestamp: 42 },
        ]);
      },
      { region: 'eu' },
      42,
    );
    expect(result).toEqual(state('azure_openai', 1, 0));
    expect(logger.warn).toHaveBeenCalledExactlyOnceWith(    'Metrics collector failed: azure_openai', {
      collector: 'azure_openai',
      component: 'metrics-collector',
      errorType: 'Error',
    });
  });
});

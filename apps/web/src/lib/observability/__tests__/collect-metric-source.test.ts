import { beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from '@/lib/logger';
import { collectMetricSource } from '../collect-metric-source';
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

  it.each([null, undefined, [{ name: 'invalid', labels: {}, value: NaN, timestamp: 42 }]])(
    'reports malformed source output instead of publishing invalid samples: %j',
    async (value) => {
      const collect = vi.fn<() => MetricSample[]>().mockReturnValue(value as MetricSample[]);
      expect(await collectMetricSource('test', collect, {}, 42)).toEqual([
        { name: 'metric_collector_up', labels: { collector: 'test' }, value: 0, timestamp: 42 },
      ]);
      expect(logger.error).toHaveBeenCalledWith(
        'Metrics collector failed',
        { collector: 'test' },
        expect.any(Error),
      );
    },
  );
});

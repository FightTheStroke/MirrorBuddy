import { beforeEach, describe, expect, it, vi } from 'vitest';
import { collectSection, type MetricSample } from '../collector-utils';

const report = vi.hoisted(() => vi.fn());
vi.mock('@/lib/observability/collector-diagnostics', () => ({
  reportCollectorFailure: report,
}));
const context = { instanceLabels: { instance: 'mirrorbuddy', env: 'production' }, now: 1000 };
const sample = (value: number): MetricSample => ({
  name: 'usage',
  labels: context.instanceLabels,
  value,
  timestamp: context.now,
});

beforeEach(() => vi.clearAllMocks());

describe('collector section health', () => {
  it('marks an already-reported batch failure down without duplicate diagnostics', async () => {
    const samples = await collectSection('test', () => false, context);
    expect(samples).toContainEqual(
      expect.objectContaining({ name: 'metric_collector_up', value: 0 }),
    );
    expect(report).not.toHaveBeenCalled();
  });
  it('omits invalid measurements rather than publishing fake zero or NaN', async () => {
    const samples = await collectSection(
      'test',
      ({ samples }) => {
        samples.push(sample(5), sample(Number.NaN));
      },
      context,
    );
    expect(samples.filter((item) => item.name === 'usage')).toEqual([sample(5)]);
    expect(samples).toContainEqual(
      expect.objectContaining({ name: 'metric_collector_up', value: 0 }),
    );
    expect(report).toHaveBeenCalledOnce();
  });
  it('does not mark a healthy group down for an optional disabled child', async () => {
    const labels = { ...context.instanceLabels, collector: 'optional' };
    const samples = await collectSection(
      'test',
      ({ samples }) => {
        samples.push(
          sample(5),
          { name: 'metric_collector_enabled', labels, value: 0, timestamp: 1000 },
          { name: 'metric_collector_up', labels, value: 0, timestamp: 1000 },
        );
      },
      context,
    );
    expect(samples).toContainEqual({
      name: 'metric_collector_up',
      labels: { ...context.instanceLabels, collector: 'test' },
      value: 1,
      timestamp: 1000,
    });
    expect(report).not.toHaveBeenCalled();
  });
  it('preserves failed enabled child health without reporting the same failure twice', async () => {
    const labels = { ...context.instanceLabels, collector: 'child' };
    const samples = await collectSection(
      'test',
      ({ samples }) => {
        samples.push(
          sample(5),
          { name: 'metric_collector_enabled', labels, value: 1, timestamp: 1000 },
          { name: 'metric_collector_up', labels, value: 0, timestamp: 1000 },
        );
      },
      context,
    );
    expect(samples).toContainEqual({
      name: 'metric_collector_up',
      labels: { ...context.instanceLabels, collector: 'test' },
      value: 0,
      timestamp: 1000,
    });
    expect(report).not.toHaveBeenCalled();
  });
});

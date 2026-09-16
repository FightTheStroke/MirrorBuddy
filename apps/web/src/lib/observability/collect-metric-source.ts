import { logger } from '@/lib/logger';
import type { MetricSample } from './http-metrics-collector';

/** Isolate one source, not the push transport; never substitute failed usage with zero. */
export async function collectMetricSource(
  collector: string,
  collect: () => MetricSample[] | Promise<MetricSample[]>,
  labels: Record<string, string>,
  timestamp: number,
): Promise<MetricSample[]> {
  let samples: MetricSample[] = [];
  let up = 0;
  try {
    const collected = await collect();
    if (
      !Array.isArray(collected) ||
      collected.some(
        (sample) => !sample || !Number.isFinite(sample.value) || !Number.isFinite(sample.timestamp),
      )
    ) {
      throw new Error('Invalid metric samples');
    }
    samples = collected;
    // Disabled sources remain visibly unavailable, without being execution errors.
    up = samples.some(
      (sample) =>
        (sample.name === 'metric_collector_up' || sample.name === 'metric_collector_enabled') &&
        sample.value === 0,
    )
      ? 0
      : 1;
  } catch (error) {
    logger.error('Metrics collector failed', { collector }, error);
  }
  return [
    ...samples,
    { name: 'metric_collector_up', labels: { ...labels, collector }, value: up, timestamp },
  ];
}

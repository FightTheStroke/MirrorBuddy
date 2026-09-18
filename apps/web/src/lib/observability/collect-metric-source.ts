import { logger } from '@/lib/logger';
import type { MetricSample } from './http-metrics-collector';

const labelKey = (labels: Record<string, string>) =>
  JSON.stringify(Object.entries(labels).sort(([a], [b]) => a.localeCompare(b)));

/** Isolate one source, not the push transport; never substitute failed usage with zero. */
export async function collectMetricSource(
  collector: string,
  collect: () => MetricSample[] | Promise<MetricSample[]>,
  labels: Record<string, string>,
  timestamp: number,
): Promise<MetricSample[]> {
  let samples: MetricSample[] = [];
  let enabled = 1;
  let up = 0;
  const sourceLabels = { ...labels, collector };
  const sourceKey = labelKey(sourceLabels);
  try {
    const collected = await collect();
    if (
      !Array.isArray(collected) ||
      collected.some(
        (sample) =>
          !sample ||
          typeof sample.name !== 'string' ||
          !sample.labels ||
          typeof sample.labels !== 'object' ||
          Array.isArray(sample.labels) ||
          Object.values(sample.labels).some((value) => typeof value !== 'string') ||
          !Number.isFinite(sample.value) ||
          !Number.isFinite(sample.timestamp) ||
          (['metric_collector_up', 'metric_collector_enabled'].includes(sample.name) &&
            sample.value !== 0 &&
            sample.value !== 1),
      )
    ) {
      throw new Error('Invalid metric samples');
    }
    samples = collected;
    const disabled = new Set(
      samples
        .filter((sample) => sample.name === 'metric_collector_enabled' && sample.value === 0)
        .map((sample) => labelKey(sample.labels)),
    );
    const health = samples.filter(
      (sample) =>
        sample.name === 'metric_collector_up' || sample.name === 'metric_collector_enabled',
    );
    const ownEnabled = samples.find(
      (sample) =>
        sample.name === 'metric_collector_enabled' && labelKey(sample.labels) === sourceKey,
    );
    enabled =
      ownEnabled?.value ??
      (health.length > 0 && health.every((sample) => disabled.has(labelKey(sample.labels)))
        ? 0
        : 1);
    // An optional disabled child is not a failure of its configured siblings.
    up =
      enabled &&
      !samples.some(
        (sample) =>
          sample.name === 'metric_collector_up' &&
          sample.value === 0 &&
          !disabled.has(labelKey(sample.labels)),
      )
        ? 1
        : 0;
  } catch (error) {
    logger.error('Metrics collector failed', { collector }, error);
  }
  return [
    ...samples.filter(
      (sample) => !(sample.name === 'metric_collector_up' && labelKey(sample.labels) === sourceKey),
    ),
    ...(!samples.some(
      (sample) =>
        sample.name === 'metric_collector_enabled' && labelKey(sample.labels) === sourceKey,
    )
      ? [{ name: 'metric_collector_enabled', labels: sourceLabels, value: enabled, timestamp }]
      : []),
    { name: 'metric_collector_up', labels: sourceLabels, value: up, timestamp },
  ];
}

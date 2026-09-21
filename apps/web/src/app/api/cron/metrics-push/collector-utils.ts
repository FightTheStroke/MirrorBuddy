import { reportCollectorFailure } from '@/lib/observability/collector-diagnostics';
import type { MetricSample } from '@/lib/observability/http-metrics-collector';

export type { MetricSample };

export interface CollectorContext {
  samples: MetricSample[];
  instanceLabels: Record<string, string>;
  now: number;
}

const labelKey = (labels: Record<string, string>) =>
  JSON.stringify(Object.entries(labels).sort(([left], [right]) => left.localeCompare(right)));

function validSample(sample: MetricSample | null | undefined): sample is MetricSample {
  return Boolean(
    sample &&
    typeof sample.name === 'string' &&
    sample.labels &&
    Object.values(sample.labels).every((label) => typeof label === 'string') &&
    Number.isFinite(sample.value) &&
    Number.isFinite(sample.timestamp),
  );
}

/** Keep valid samples collected before a later query or cleanup fails. */
export async function collectSection(
  collector: string,
  collect: (context: CollectorContext) => void | boolean | Promise<void | boolean>,
  context: Omit<CollectorContext, 'samples'>,
): Promise<MetricSample[]> {
  const samples: MetricSample[] = [];
  let up = 1;
  try {
    if ((await collect({ ...context, samples })) === false) up = 0;
    if (!samples.every(validSample)) throw new Error('Invalid metric samples');
    const disabled = new Set(
      samples
        .filter((sample) => sample.name === 'metric_collector_enabled' && sample.value === 0)
        .map((sample) => labelKey(sample.labels)),
    );
    if (
      samples.some(
        (sample) =>
          sample.name === 'metric_collector_up' &&
          sample.value === 0 &&
          !disabled.has(labelKey(sample.labels)),
      )
    ) {
      up = 0;
    }
  } catch (error) {
    up = 0;
    reportCollectorFailure(collector, error);
  }
  const labels = { ...context.instanceLabels, collector };
  return [
    ...samples.filter(validSample),
    { name: 'metric_collector_enabled', labels, value: 1, timestamp: context.now },
    { name: 'metric_collector_up', labels, value: up, timestamp: context.now },
  ];
}

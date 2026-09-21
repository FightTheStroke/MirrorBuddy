import { collectServiceLimitsSamples } from '@/lib/observability/service-limits-metrics';
import { collectTierMetrics } from '@/lib/observability/tier-metrics-collector';
import { collectMetricSource } from '@/lib/observability/collect-metric-source';
import type { MetricSample } from './collector-utils';

/** Shared sources have one owner: the authenticated five-minute cron, on every host. */
export async function collectDatabaseBackedSamples(
  instanceLabels: Record<string, string>,
  now: number,
): Promise<MetricSample[]> {
  const samples: MetricSample[] = [];
  const collectors = {
    service_limits: collectServiceLimitsSamples,
    tier: collectTierMetrics,
  };
  for (const [name, collect] of Object.entries(collectors)) {
    samples.push(
      ...(await collectMetricSource(name, () => collect(instanceLabels, now), instanceLabels, now)),
    );
  }
  return samples;
}

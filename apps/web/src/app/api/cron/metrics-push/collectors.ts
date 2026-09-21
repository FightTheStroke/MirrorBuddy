import { logger } from '@/lib/logger';
import { generateBehavioralMetrics } from '@/app/api/metrics/behavioral-metrics';
import { collectDatabaseBackedSamples } from '@/lib/observability/prometheus-push-service';
import { collectSection, type CollectorContext, type MetricSample } from './collector-utils';
import { collectHttpMetrics } from './http-metrics';
import { collectActivityMetrics } from './activity-metrics';
import { collectFunnelMetrics } from './funnel-metrics';
import { collectChurnMetrics } from './churn-metrics';
import { collectWaitlistMetrics } from './waitlist-metrics';

const log = logger.child({ module: 'cron-metrics-push' });

async function collectBehavioralMetrics({
  samples,
  instanceLabels,
  now,
}: CollectorContext): Promise<void> {
  const metrics = await generateBehavioralMetrics();
  for (const metric of metrics) {
    samples.push({
      name: metric.name,
      labels: { ...metric.labels, ...instanceLabels },
      value: metric.value,
      timestamp: now,
    });
  }
  log.debug('Collected behavioral metrics', { count: metrics.length });
}

async function processFunnelEvents(): Promise<boolean> {
  const { processBatchFunnelEvents } = await import('@/lib/funnel/batch-funnel');
  const result = await processBatchFunnelEvents();
  if (!result) throw new Error('Invalid batch funnel result');
  log.debug('Batch funnel events processed', { ...result });
  // Batch processing owns its caught errors; reflect them without reporting twice.
  return !result.errors;
}

/** Instance-local metrics stay here; moving them to another schedule loses data. */
export async function collectLightMetrics(): Promise<MetricSample[]> {
  const now = Date.now();
  const env = process.env.NODE_ENV === 'production' ? 'production' : 'development';
  const instanceLabels = { instance: 'mirrorbuddy', env };
  const samples: MetricSample[] = [];
  const collectors = {
    'cron-http': collectHttpMetrics,
    'realtime-active-users': collectActivityMetrics,
    'funnel-metrics': collectFunnelMetrics,
    'churn-metrics': collectChurnMetrics,
    'behavioral-metrics': collectBehavioralMetrics,
    'batch-funnel': processFunnelEvents,
    'waitlist-metrics': collectWaitlistMetrics,
    'database-backed': async (context: CollectorContext) => {
      context.samples.push(
        ...(await collectDatabaseBackedSamples(context.instanceLabels, context.now)),
      );
    },
  };
  for (const [name, collect] of Object.entries(collectors)) {
    samples.push(...(await collectSection(name, collect, { instanceLabels, now })));
  }
  return samples;
}

import { logger } from '@/lib/logger';
import { metricTruth, type MetricContext, type MetricTruth } from './metric-truth';

export async function readMetric<T>(
  read: () => Promise<T | null | undefined>,
  context: MetricContext,
): Promise<MetricTruth<T>> {
  try {
    return metricTruth(await read(), context);
  } catch {
    // Do not include database errors or record contents in analytics diagnostics.
    logger.warn('Admin metric collection failed', { source: context.source });
    return metricTruth<T>(null, { ...context, reason: 'collectionFailed' });
  }
}

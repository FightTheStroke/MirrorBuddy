/**
 * Authenticated five-minute Grafana push: activity, funnel/churn,
 * session health, waitlist and database-backed metrics.
 * Requires all three existing GRAFANA_CLOUD_* credentials before collecting.
 */
import { pipe, withSentry, withCron } from '@/lib/api/middlewares';
import { logger } from '@/lib/logger';
import {
  isGrafanaConfigured,
  logCollectorSkippedOnce,
  reportCollectorFailure,
} from '@/lib/observability/collector-diagnostics';
import { collectLightMetrics } from './collectors';
import { pushToGrafana } from './transport';

export const dynamic = 'force-dynamic';

const log = logger.child({ module: 'cron-metrics-push' });

interface PushResponse {
  status: 'success' | 'skipped' | 'error';
  timestamp: string;
  duration_ms: number;
  metrics_pushed?: number;
  error?: string;
}

export const POST = pipe(
  withSentry('/api/cron/metrics-push'),
  withCron,
)(async () => {
  const startTime = Date.now();
  const response: PushResponse = {
    status: 'success',
    timestamp: new Date().toISOString(),
    duration_ms: 0,
  };
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production') {
    log.info(`[CRON] Skipping metrics-push - not production (env: ${process.env.VERCEL_ENV})`);
    return Response.json(
      {
        skipped: true,
        reason: 'Not production environment',
        environment: process.env.VERCEL_ENV,
      },
      { status: 200 },
    );
  }
  if (!isGrafanaConfigured()) {
    response.status = 'skipped';
    response.duration_ms = Date.now() - startTime;
    logCollectorSkippedOnce('grafana');
    return Response.json(response, { status: 200 });
  }
  const samples = await collectLightMetrics();
  if (samples.length === 0) {
    response.status = 'skipped';
    response.duration_ms = Date.now() - startTime;
    log.info('No metrics to push');
    return Response.json(response, { status: 200 });
  }
  try {
    await pushToGrafana(samples);
  } catch (error) {
    reportCollectorFailure('grafana_transport', error);
    response.status = 'error';
    response.error = 'Metrics push failed';
    response.duration_ms = Date.now() - startTime;
    return Response.json(response, { status: 502 });
  }
  response.metrics_pushed = samples.length;
  response.duration_ms = Date.now() - startTime;
  log.info('Metrics pushed to Grafana Cloud', {
    metrics_count: samples.length,
    duration_ms: response.duration_ms,
  });
  return Response.json(response, { status: 200 });
});

export const GET = POST;

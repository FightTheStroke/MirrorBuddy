import { logger } from '@/lib/logger';

const skippedCollectors = new Set<string>();

/** Once per process; serverless instances do not share memory. */
export function logCollectorSkippedOnce(collector: string): void {
  if (skippedCollectors.has(collector)) return;
  skippedCollectors.add(collector);
  logger.info('Metrics collector skipped (not configured)', { collector });
}

export function isGrafanaConfigured(): boolean {
  return [
    process.env.GRAFANA_CLOUD_PROMETHEUS_URL,
    process.env.GRAFANA_CLOUD_PROMETHEUS_USER,
    process.env.GRAFANA_CLOUD_API_KEY,
  ].every((value) => Boolean(value?.trim()));
}

/** Keep actionable attribution, never SQL text, response bodies or provider credentials. */
export function reportCollectorFailure(collector: string, error: unknown): void {
  const context: Record<string, string | number> = { collector, component: 'metrics-collector' };
  let cause = error;
  for (let depth = 0; depth < 5 && cause && typeof cause === 'object'; depth++) {
    if (cause instanceof Error) {
      context.errorType ??= cause.name;
      if (cause.name === 'MonitoringQueryError') {
        const query = cause.message.match(
          /^Supabase monitoring query failed: (database_size|connection_count)$/,
        )?.[1];
        if (query) context.query = query;
      }
    }
    if ('code' in cause && typeof cause.code === 'string' && /^[A-Z0-9_]{2,40}$/.test(cause.code)) {
      context.code = cause.code;
    }
    if ('meta' in cause && cause.meta && typeof cause.meta === 'object' && 'code' in cause.meta) {
      const code = cause.meta.code;
      if (typeof code === 'string' && /^[A-Z0-9]{5}$/.test(code)) context.sqlState = code;
    }
    if ('status' in cause && typeof cause.status === 'number' && Number.isFinite(cause.status)) {
      context.status = cause.status;
    }
    cause = 'cause' in cause ? cause.cause : undefined;
  }
  logger.warn(`Metrics collector failed: ${collector}`, context);
}

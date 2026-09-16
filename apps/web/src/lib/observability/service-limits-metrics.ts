/**
 * Service Limits Metrics Collection
 *
 * Collects external service limits metrics for Prometheus push service.
 * Implements F-21: Prometheus metrics for external service limits.
 *
 * Services monitored:
 *   - Vercel: bandwidth, builds, functions
 *   - Supabase: database, connections, storage
 *   - Azure OpenAI: TPM, RPM (F-02)
 *
 * Metrics format:
 *   - service_limit_usage_percentage{service, metric}
 *   - service_limit_absolute{service, metric, type="used|limit"}
 */

import { collectMetricSource } from './collect-metric-source';
import { getVercelLimits } from './vercel-limits';
import { getSupabaseLimits } from './supabase-limits';
import { getAzureOpenAILimits } from './azure-openai-limits';

export interface ServiceLimitMetricSample {
  name: string;
  labels: Record<string, string>;
  value: number;
  timestamp: number;
}

interface LimitData {
  used: number;
  limit: number;
  percent: number;
}

/**
 * Create metric triplet (percentage + used + limit) for a resource
 */
function createLimitMetrics(
  instanceLabels: Record<string, string>,
  service: string,
  metric: string,
  data: LimitData,
  timestamp: number,
): ServiceLimitMetricSample[] {
  return [
    {
      name: 'service_limit_usage_percentage',
      labels: { ...instanceLabels, service, metric },
      value: data.percent,
      timestamp,
    },
    {
      name: 'service_limit_absolute',
      labels: { ...instanceLabels, service, metric, type: 'used' },
      value: data.used,
      timestamp,
    },
    {
      name: 'service_limit_absolute',
      labels: { ...instanceLabels, service, metric, type: 'limit' },
      value: data.limit,
      timestamp,
    },
  ];
}

/**
 * Collect all external service limits metrics
 */
export async function collectServiceLimitsSamples(
  instanceLabels: Record<string, string>,
  timestamp: number,
): Promise<ServiceLimitMetricSample[]> {
  const samples: ServiceLimitMetricSample[] = [];

  const collectors = {
    vercel: collectVercelLimits,
    supabase: collectSupabaseLimits,
    azure_openai: collectAzureOpenAILimits,
  };
  for (const [name, collect] of Object.entries(collectors)) {
    samples.push(
      ...(await collectMetricSource(
        name,
        () => collect(instanceLabels, timestamp),
        instanceLabels,
        timestamp,
      )),
    );
  }

  return samples;
}

/**
 * Collect Vercel limits metrics (bandwidth, builds, functions)
 */
async function collectVercelLimits(
  instanceLabels: Record<string, string>,
  timestamp: number,
): Promise<ServiceLimitMetricSample[]> {
  const samples: ServiceLimitMetricSample[] = [];

  const limits = await getVercelLimits();
  if (limits.error) {
    throw new Error(limits.error);
  }

  samples.push(
    ...createLimitMetrics(instanceLabels, 'vercel', 'bandwidth', limits.bandwidth, timestamp),
    ...createLimitMetrics(instanceLabels, 'vercel', 'builds', limits.builds, timestamp),
    ...createLimitMetrics(instanceLabels, 'vercel', 'functions', limits.functions, timestamp),
  );

  return samples;
}

/**
 * Collect Supabase limits metrics (database, connections, storage)
 */
async function collectSupabaseLimits(
  instanceLabels: Record<string, string>,
  timestamp: number,
): Promise<ServiceLimitMetricSample[]> {
  const samples: ServiceLimitMetricSample[] = [];

  const limits = await getSupabaseLimits();

  // Database and connections
  samples.push(
    ...createLimitMetrics(
      instanceLabels,
      'supabase',
      'database',
      {
        used: limits.database.used,
        limit: limits.database.limit,
        percent: limits.database.usagePercent,
      },
      timestamp,
    ),
    ...createLimitMetrics(
      instanceLabels,
      'supabase',
      'connections',
      {
        used: limits.connections.used,
        limit: limits.connections.limit,
        percent: limits.connections.usagePercent,
      },
      timestamp,
    ),
  );

  // Storage (if available)
  if (limits.storage) {
    samples.push(
      ...createLimitMetrics(
        instanceLabels,
        'supabase',
        'storage',
        {
          used: limits.storage.used,
          limit: limits.storage.limit,
          percent: limits.storage.usagePercent,
        },
        timestamp,
      ),
    );
  }

  return samples;
}

/**
 * Collect Azure OpenAI limits metrics (TPM, RPM) - F-02
 */
async function collectAzureOpenAILimits(
  instanceLabels: Record<string, string>,
  timestamp: number,
): Promise<ServiceLimitMetricSample[]> {
  const samples: ServiceLimitMetricSample[] = [];

  const limits = await getAzureOpenAILimits();

  const enabled = {
    name: 'metric_collector_enabled',
    labels: { ...instanceLabels, collector: 'azure_openai' },
    value: limits.status === 'not_configured' ? 0 : 1,
    timestamp,
  };
  if (limits.status === 'not_configured') return [enabled];
  if (limits.status !== 'ok') {
    throw new Error(limits.error);
  }

  samples.push(
    enabled,
    ...createLimitMetrics(
      instanceLabels,
      'azure_openai',
      'chat_tpm',
      {
        used: limits.tpm.used,
        limit: limits.tpm.limit,
        percent: limits.tpm.usagePercent,
      },
      timestamp,
    ),
    ...createLimitMetrics(
      instanceLabels,
      'azure_openai',
      'chat_rpm',
      {
        used: limits.rpm.used,
        limit: limits.rpm.limit,
        percent: limits.rpm.usagePercent,
      },
      timestamp,
    ),
  );

  return samples;
}

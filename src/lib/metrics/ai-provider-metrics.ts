/**
 * @file ai-provider-metrics.ts
 * @brief AI provider performance and cost metrics
 * Tracks success rate, latency, cost, and failover events per provider
 * Created for F-08: Multi-Provider AI Router
 */

import { logger } from "@/lib/logger";
import type { AIProviderType } from "@/lib/ai/providers/provider-interface";

interface ProviderMetricsBucket {
  provider: AIProviderType;
  requests: number;
  successes: number;
  failures: number;
  failovers: number;
  totalLatencyMs: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  lastResetAt: Date;
}

const buckets = new Map<AIProviderType, ProviderMetricsBucket>();

function getBucket(provider: AIProviderType): ProviderMetricsBucket {
  let bucket = buckets.get(provider);
  if (!bucket) {
    bucket = {
      provider,
      requests: 0,
      successes: 0,
      failures: 0,
      failovers: 0,
      totalLatencyMs: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      lastResetAt: new Date(),
    };
    buckets.set(provider, bucket);
  }
  return bucket;
}

export function recordRequest(
  provider: AIProviderType,
  latencyMs: number,
  success: boolean,
  usage?: { prompt_tokens: number; completion_tokens: number },
): void {
  const bucket = getBucket(provider);
  bucket.requests++;

  if (success) {
    bucket.successes++;
  } else {
    bucket.failures++;
  }

  bucket.totalLatencyMs += latencyMs;

  if (usage) {
    bucket.totalInputTokens += usage.prompt_tokens;
    bucket.totalOutputTokens += usage.completion_tokens;
  }
}

export function recordFailover(
  fromProvider: AIProviderType,
  toProvider: AIProviderType,
  reason: string,
): void {
  const fromBucket = getBucket(fromProvider);
  fromBucket.failovers++;

  logger.info("[AI Metrics] Failover event", {
    from: fromProvider,
    to: toProvider,
    reason,
  });
}

export interface ProviderMetricsSummary {
  provider: AIProviderType;
  requests: number;
  successRate: number;
  failovers: number;
  avgLatencyMs: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  periodStart: string;
}

export function getMetricsSummary(): ProviderMetricsSummary[] {
  return Array.from(buckets.values()).map((bucket) => ({
    provider: bucket.provider,
    requests: bucket.requests,
    successRate: bucket.requests > 0 ? bucket.successes / bucket.requests : 0,
    failovers: bucket.failovers,
    avgLatencyMs:
      bucket.requests > 0
        ? Math.round(bucket.totalLatencyMs / bucket.requests)
        : 0,
    totalInputTokens: bucket.totalInputTokens,
    totalOutputTokens: bucket.totalOutputTokens,
    periodStart: bucket.lastResetAt.toISOString(),
  }));
}

export function resetMetrics(): void {
  buckets.clear();
}

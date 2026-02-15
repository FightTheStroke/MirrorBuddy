/**
 * Redis Metrics Provider
 * Fetches Redis metrics via REST API
 */

import { logger } from '@/lib/logger';
import type { RedisMetrics } from './infra-panel-types';

/**
 * Check if Redis is configured
 */
function isRedisConfigured(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

/**
 * Parse Redis INFO response
 */
function parseRedisInfo(info: string): Partial<RedisMetrics> {
  const lines = info.split('\n');
  const metrics: Record<string, string> = {};

  for (const line of lines) {
    const [key, value] = line.split(':');
    if (key && value) {
      metrics[key.trim()] = value.trim();
    }
  }

  const usedMemory = parseInt(metrics.used_memory || '0', 10);
  const maxMemory = parseInt(metrics.maxmemory || '0', 10) || 104_857_600; // Default 100 MB
  const totalKeys = parseInt(metrics.db0?.match(/keys=(\d+)/)?.[1] || '0', 10);
  const keyspaceHits = parseInt(metrics.keyspace_hits || '0', 10);
  const keyspaceMisses = parseInt(metrics.keyspace_misses || '0', 10);
  const totalCommands = parseInt(metrics.total_commands_processed || '0', 10);

  const totalKeyspaceOps = keyspaceHits + keyspaceMisses;
  const hitRate = totalKeyspaceOps > 0 ? (keyspaceHits / totalKeyspaceOps) * 100 : 0;

  return {
    memoryUsed: usedMemory,
    memoryMax: maxMemory,
    keysCount: totalKeys,
    hitRate,
    commands: totalCommands,
  };
}

/**
 * Get Redis metrics from REST API
 * Returns null if not configured or if API call fails
 */
export async function getRedisMetrics(): Promise<RedisMetrics | null> {
  try {
    if (!isRedisConfigured()) {
      logger.info(
        'Redis not configured (missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN)',
      );
      return null;
    }

    const url = process.env.UPSTASH_REDIS_REST_URL!;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN!;

    // Execute INFO command via REST API
    const response = await fetch(`${url}/INFO`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      logger.error('Failed to fetch Redis INFO', { status: response.status });
      return null;
    }

    const data = await response.json();
    const infoString = data.result || '';

    const parsed = parseRedisInfo(infoString);

    const memoryUsage = parsed.memoryMax ? (parsed.memoryUsed || 0) / parsed.memoryMax : 0;

    return {
      memoryUsed: parsed.memoryUsed || 0,
      memoryMax: parsed.memoryMax || 104_857_600,
      keysCount: parsed.keysCount || 0,
      hitRate: parsed.hitRate || 0,
      commands: parsed.commands || 0,
      status: memoryUsage > 0.9 ? 'degraded' : memoryUsage > 0.95 ? 'down' : 'healthy',
    };
  } catch (error) {
    logger.error('Error fetching Redis metrics', { error: String(error) });
    return null;
  }
}

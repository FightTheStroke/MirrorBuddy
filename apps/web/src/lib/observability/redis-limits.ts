/**
 * Redis Cache Limits (F-18, F-25)
 *
 * Monitors Redis memory and connection usage via Upstash REST API.
 * Used for proactive alerts when approaching resource limits.
 */

import { logger } from '@/lib/logger';
import { isRedisConfigured, getRedisUrl, getRedisToken } from '@/lib/redis';
import { calculateStatus, AlertStatus } from './threshold-logic';

/**
 * Resource metric
 */
export interface ResourceMetric {
  used: number;
  limit: number;
  percent: number;
  status: AlertStatus;
}

/**
 * Redis limits
 */
export interface RedisLimits {
  memory: ResourceMetric;
  connections: ResourceMetric;
  timestamp: number;
  error?: string;
}

interface CacheEntry {
  data: RedisLimits;
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
let cache: CacheEntry | null = null;

/**
 * Get Redis resource limits from Upstash REST API
 */
export async function getRedisLimits(): Promise<RedisLimits> {
  if (cache && cache.expiresAt > Date.now()) {
    logger.debug('Returning cached Redis limits');
    return cache.data;
  }

  if (!isRedisConfigured()) {
    return createEmptyLimits('Redis not configured');
  }

  const url = getRedisUrl()!;
  const token = getRedisToken()!;

  try {
    const response = await fetch(`${url}/INFO`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      return createEmptyLimits(`Redis INFO failed: HTTP ${response.status}`);
    }

    const data = await response.json();
    const infoString: string = data.result || '';

    const infoMap: Record<string, string> = {};
    for (const line of infoString.split('\n')) {
      const [k, v] = line.split(':');
      if (k && v) infoMap[k.trim()] = v.trim();
    }

    const memoryUsed = parseInt(infoMap.used_memory || '0', 10);
    const maxMemory = parseInt(infoMap.maxmemory || '0', 10) || 268_435_456; // Default 256 MB (Upstash free)
    const memoryPercent = maxMemory > 0 ? Math.round((memoryUsed / maxMemory) * 100) : 0;

    const connectedClients = parseInt(infoMap.connected_clients || '0', 10);
    const maxClients = parseInt(infoMap.maxclients || '0', 10) || 1000;
    const connectionsPercent =
      maxClients > 0 ? Math.round((connectedClients / maxClients) * 100) : 0;

    const limits: RedisLimits = {
      memory: {
        used: memoryUsed,
        limit: maxMemory,
        percent: memoryPercent,
        status: calculateStatus(memoryPercent),
      },
      connections: {
        used: connectedClients,
        limit: maxClients,
        percent: connectionsPercent,
        status: calculateStatus(connectionsPercent),
      },
      timestamp: Date.now(),
    };

    cache = { data: limits, expiresAt: Date.now() + CACHE_TTL_MS };

    logger.info('Redis limits fetched', {
      memory: `${memoryPercent}%`,
      connections: `${connectionsPercent}%`,
    });

    return limits;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to fetch Redis limits', undefined, error as Error);
    return createEmptyLimits(errorMsg);
  }
}

/**
 * Create empty limits response on error
 */
function createEmptyLimits(error: string): RedisLimits {
  return {
    memory: { used: 0, limit: 0, percent: 0, status: 'ok' },
    connections: { used: 0, limit: 0, percent: 0, status: 'ok' },
    timestamp: Date.now(),
    error,
  };
}

/**
 * Clear cache (for testing)
 */
export function clearRedisLimitsCache(): void {
  cache = null;
}

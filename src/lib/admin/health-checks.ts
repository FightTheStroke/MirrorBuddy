/**
 * Infrastructure Health Checks
 * Database, Redis/KV, and Vercel connectivity checks
 */

import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getRedisUrl, getRedisToken } from '@/lib/redis';

const log = logger.child({ module: 'health-checks' });
import type { ServiceHealth } from './health-aggregator-types';
import { fetchWithTimeout, buildHealthResponse } from './health-checks-utils';

// Re-export external checks for backwards compatibility
export { checkAzureOpenAI, checkResend, checkSentry } from './health-checks-external';

/**
 * Check Database connectivity
 */
export async function checkDatabase(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const responseTimeMs = Date.now() - start;
    const status = responseTimeMs < 1000 ? 'healthy' : 'degraded';
    const details = status === 'healthy' ? 'Connected' : `Slow (${responseTimeMs}ms)`;
    return buildHealthResponse('Database', status, true, responseTimeMs, details);
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Connection failed';
    return buildHealthResponse('Database', 'down', true, Date.now() - start, details);
  }
}

/**
 * Check Redis/KV connectivity
 */
export async function checkRedis(): Promise<ServiceHealth> {
  const kvUrl = getRedisUrl();
  const kvToken = getRedisToken();
  const configured = !!kvUrl;

  if (!kvUrl || !kvToken) {
    log.warn('Redis not configured — health check skipped');
    return buildHealthResponse('Redis/KV', 'unknown', configured, undefined, 'Not configured');
  }

  const start = Date.now();
  try {
    const response = await fetchWithTimeout(`${kvUrl}/ping`, {
      Authorization: `Bearer ${kvToken}`,
    });
    const responseTimeMs = Date.now() - start;
    const status = response.ok ? 'healthy' : 'degraded';
    const details = response.ok ? 'Connected' : `HTTP ${response.status}`;
    return buildHealthResponse('Redis/KV', status, configured, responseTimeMs, details);
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Connection failed';
    return buildHealthResponse('Redis/KV', 'down', configured, Date.now() - start, details);
  }
}

/**
 * Check Vercel API
 */
export async function checkVercel(): Promise<ServiceHealth> {
  const token = process.env.VERCEL_TOKEN;
  const configured = !!token;

  if (!token) {
    return buildHealthResponse('Vercel', 'unknown', configured, undefined, 'Not configured');
  }

  const start = Date.now();
  try {
    const response = await fetchWithTimeout('https://api.vercel.com/v9/projects', {
      Authorization: `Bearer ${token}`,
    });
    const responseTimeMs = Date.now() - start;
    const status = response.ok ? 'healthy' : 'degraded';
    const details = response.ok ? 'Connected' : `HTTP ${response.status}`;
    return buildHealthResponse('Vercel', status, configured, responseTimeMs, details);
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Connection failed';
    return buildHealthResponse('Vercel', 'down', configured, Date.now() - start, details);
  }
}

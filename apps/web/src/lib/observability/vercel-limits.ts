/**
 * Vercel API Integration for Real-Time Limits
 *
 * Queries Vercel API to get current usage metrics for bandwidth,
 * build minutes, and function invocations.
 *
 * Environment Variables Required:
 *   - VERCEL_TOKEN: Personal access token from Vercel dashboard
 *   - VERCEL_PROJECT_ID: Project ID (optional, auto-detected from deployment)
 *   - VERCEL_TEAM_ID: Team ID (optional, for team projects)
 *
 * Usage:
 *   const limits = await getVercelLimits();
 *   console.log(limits.bandwidth.used, limits.bandwidth.limit);
 */

import { logger } from '@/lib/logger';
import { logCollectorSkippedOnce } from './collector-diagnostics';
import { queryProjectUsage, queryTeamLimits, getDefaultLimits } from './vercel-api-client';
import { calculateStatus, AlertStatus } from './threshold-logic';

/**
 * Vercel usage metrics response with threshold status (F-18, F-25)
 *
 * `status` separates an integration that is intentionally not configured from one
 * that is configured and failing. Callers own reporting: this module does not emit
 * warnings or errors for either condition, so a single failure is reported once by
 * the metric collector instead of twice.
 */
export interface VercelLimits {
  bandwidth: {
    used: number; // Bytes used in current period
    limit: number; // Bytes limit per period
    percent: number; // Usage percentage (0-100)
    status: AlertStatus; // Alert status (F-25)
  };
  builds: {
    used: number; // Build minutes used
    limit: number; // Build minutes limit
    percent: number; // Usage percentage (0-100)
    status: AlertStatus; // Alert status (F-25)
  };
  functions: {
    used: number; // Function invocations count
    limit: number; // Function invocations limit
    percent: number; // Usage percentage (0-100)
    status: AlertStatus; // Alert status (F-25)
  };
  timestamp: number; // Unix timestamp of query
  status: VercelLimitsStatus; // Availability of the integration itself
  error?: string; // Error message if query failed or configuration is absent
}

/**
 * Availability of the Vercel monitoring integration
 *
 *   - `ok`: usage values below are real
 *   - `not_configured`: no credentials supplied; usage is unknown, not zero
 *   - `error`: the configured integration failed (auth, rate limit, transport)
 */
export type VercelLimitsStatus = 'ok' | 'not_configured' | 'error';

/**
 * Cache for rate limiting
 */
interface CacheEntry {
  data: VercelLimits;
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
let cache: CacheEntry | null = null;

/**
 * Get Vercel project usage limits
 *
 * @returns Promise<VercelLimits> Current usage metrics
 * Configuration absence and runtime failures are explicit status values.
 */
export async function getVercelLimits(): Promise<VercelLimits> {
  const token = process.env.VERCEL_TOKEN?.trim();
  const projectId = process.env.VERCEL_PROJECT_ID || process.env.VERCEL_URL?.split('.')[0];
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!token) {
    const error = 'VERCEL_TOKEN not configured';
    logCollectorSkippedOnce('vercel');
    return createEmptyLimits(error, 'not_configured');
  }

  if (!projectId?.trim()) {
    const error = 'VERCEL_PROJECT_ID not configured';
    logCollectorSkippedOnce('vercel');
    return createEmptyLimits(error, 'not_configured');
  }

  if (cache && cache.expiresAt > Date.now()) {
    logger.debug('Returning cached Vercel limits');
    return cache.data;
  }

  try {
    // Query project-level usage
    const projectUsage = await queryProjectUsage(token, projectId, teamId);

    // Query team-level limits (if in a team)
    const teamLimits = teamId ? await queryTeamLimits(token, teamId) : getDefaultLimits();

    // Combine project usage with team limits (F-25: add status)
    const bandwidthPercent = calculatePercent(projectUsage.bandwidth.used, teamLimits.bandwidth);
    const buildsPercent = calculatePercent(projectUsage.builds.used, teamLimits.builds);
    const functionsPercent = calculatePercent(projectUsage.functions.used, teamLimits.functions);

    const limits: VercelLimits = {
      bandwidth: {
        used: projectUsage.bandwidth.used,
        limit: teamLimits.bandwidth,
        percent: bandwidthPercent,
        status: calculateStatus(bandwidthPercent), // F-25
      },
      builds: {
        used: projectUsage.builds.used,
        limit: teamLimits.builds,
        percent: buildsPercent,
        status: calculateStatus(buildsPercent), // F-25
      },
      functions: {
        used: projectUsage.functions.used,
        limit: teamLimits.functions,
        percent: functionsPercent,
        status: calculateStatus(functionsPercent), // F-25
      },
      timestamp: Date.now(),
      status: 'ok',
    };

    // Update cache
    cache = {
      data: limits,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };

    logger.info('Vercel limits fetched successfully', {
      bandwidth: `${limits.bandwidth.percent.toFixed(1)}%`,
      builds: `${limits.builds.percent.toFixed(1)}%`,
      functions: `${limits.functions.percent.toFixed(1)}%`,
    });

    return limits;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    // Reported once by the caller (metric collector), not here.
    logger.debug('Failed to fetch Vercel limits', { error: errorMsg });
    return createEmptyLimits(errorMsg, 'error');
  }
}

/**
 * Calculate percentage (0-100)
 */
function calculatePercent(used: number, limit: number): number {
  if (limit === 0) return 0;
  return Math.min(100, (used / limit) * 100);
}

/**
 * Create a response carrying no usage values
 *
 * Usage is reported as unknown (`0/0`) with an explicit `status`; the collector
 * must not publish these numbers as real usage.
 */
function createEmptyLimits(error: string, status: Exclude<VercelLimitsStatus, 'ok'>): VercelLimits {
  return {
    bandwidth: { used: 0, limit: 0, percent: 0, status: 'ok' },
    builds: { used: 0, limit: 0, percent: 0, status: 'ok' },
    functions: { used: 0, limit: 0, percent: 0, status: 'ok' },
    timestamp: Date.now(),
    status,
    error,
  };
}

/**
 * Clear cache (for testing)
 */
export function clearVercelLimitsCache(): void {
  cache = null;
}

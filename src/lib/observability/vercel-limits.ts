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

import { logger } from "@/lib/logger";
import {
  queryProjectUsage,
  queryTeamLimits,
  getDefaultLimits,
} from "./vercel-api-client";
import { calculateStatus, AlertStatus } from "./threshold-logic";

/**
 * Vercel usage metrics response with threshold status (F-18, F-25)
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
  error?: string; // Error message if query failed
}

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
 * @throws Error if API token is missing or request fails
 */
export async function getVercelLimits(): Promise<VercelLimits> {
  // Check cache first (rate limiting)
  if (cache && cache.expiresAt > Date.now()) {
    logger.debug("Returning cached Vercel limits");
    return cache.data;
  }

  const token = process.env.VERCEL_TOKEN;
  const projectId =
    process.env.VERCEL_PROJECT_ID || process.env.VERCEL_URL?.split(".")[0];
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!token) {
    const error = "VERCEL_TOKEN not configured";
    logger.warn(error);
    return createEmptyLimits(error);
  }

  try {
    // Query project-level usage
    const projectUsage = await queryProjectUsage(token, projectId, teamId);

    // Query team-level limits (if in a team)
    const teamLimits = teamId
      ? await queryTeamLimits(token, teamId)
      : getDefaultLimits();

    // Combine project usage with team limits (F-25: add status)
    const bandwidthPercent = calculatePercent(
      projectUsage.bandwidth.used,
      teamLimits.bandwidth,
    );
    const buildsPercent = calculatePercent(
      projectUsage.builds.used,
      teamLimits.builds,
    );
    const functionsPercent = calculatePercent(
      projectUsage.functions.used,
      teamLimits.functions,
    );

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
    };

    // Update cache
    cache = {
      data: limits,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };

    logger.info("Vercel limits fetched successfully", {
      bandwidth: `${limits.bandwidth.percent.toFixed(1)}%`,
      builds: `${limits.builds.percent.toFixed(1)}%`,
      functions: `${limits.functions.percent.toFixed(1)}%`,
    });

    return limits;
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "Unknown error";
    logger.error("Failed to fetch Vercel limits", undefined, error as Error);
    return createEmptyLimits(errorMsg);
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
 * Create empty limits response on error
 */
function createEmptyLimits(error: string): VercelLimits {
  return {
    bandwidth: { used: 0, limit: 0, percent: 0, status: "ok" },
    builds: { used: 0, limit: 0, percent: 0, status: "ok" },
    functions: { used: 0, limit: 0, percent: 0, status: "ok" },
    timestamp: Date.now(),
    error,
  };
}

/**
 * Clear cache (for testing)
 */
export function clearVercelLimitsCache(): void {
  cache = null;
}

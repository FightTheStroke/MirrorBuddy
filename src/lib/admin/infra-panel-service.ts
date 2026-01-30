/**
 * Infrastructure Panel Service
 * Aggregates metrics from Vercel, Supabase, and Redis providers
 */

import { logger } from "@/lib/logger";
import { getVercelMetrics } from "./infra-panel-vercel";
import { getSupabaseMetrics } from "./infra-panel-supabase";
import { getRedisMetrics } from "./infra-panel-redis";
import type { InfraMetrics } from "./infra-panel-types";

// Cache for 30 seconds
let cache: { metrics: InfraMetrics; timestamp: number } | null = null;
const CACHE_TTL = 30_000; // 30 seconds

/**
 * Get all infrastructure metrics
 * Uses Promise.allSettled to ensure partial data on provider failures
 */
export async function getInfraMetrics(): Promise<InfraMetrics> {
  // Return cached data if valid
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return cache.metrics;
  }

  try {
    const [vercelResult, supabaseResult, redisResult] =
      await Promise.allSettled([
        getVercelMetrics(),
        getSupabaseMetrics(),
        getRedisMetrics(),
      ]);

    const metrics: InfraMetrics = {
      vercel: vercelResult.status === "fulfilled" ? vercelResult.value : null,
      supabase:
        supabaseResult.status === "fulfilled" ? supabaseResult.value : null,
      redis: redisResult.status === "fulfilled" ? redisResult.value : null,
      timestamp: Date.now(),
    };

    // Log any failures
    if (vercelResult.status === "rejected") {
      logger.error("Failed to fetch Vercel metrics", {
        error: String(vercelResult.reason),
      });
    }
    if (supabaseResult.status === "rejected") {
      logger.error("Failed to fetch Supabase metrics", {
        error: String(supabaseResult.reason),
      });
    }
    if (redisResult.status === "rejected") {
      logger.error("Failed to fetch Redis metrics", {
        error: String(redisResult.reason),
      });
    }

    // Cache the result
    cache = { metrics, timestamp: Date.now() };

    return metrics;
  } catch (error) {
    logger.error("Error in getInfraMetrics", { error: String(error) });
    throw error;
  }
}

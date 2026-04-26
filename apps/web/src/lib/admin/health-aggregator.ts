/**
 * Health Aggregator
 * Polls all external services and aggregates health status with caching
 */

import {
  checkDatabase,
  checkRedis,
  checkAzureOpenAI,
  checkResend,
  checkSentry,
  checkVercel,
} from "./health-checks";
import type {
  HealthAggregatorResponse,
  ServiceHealth,
  ServiceStatus,
} from "./health-aggregator-types";

const CACHE_TTL_MS = 30000; // 30 seconds

interface CachedHealth {
  data: HealthAggregatorResponse;
  timestamp: number;
}

let cache: CachedHealth | null = null;

/**
 * Determine overall status from individual service statuses
 * Only considers configured services in the calculation
 */
function getOverallStatus(services: ServiceHealth[]): ServiceStatus {
  // Filter to only configured services
  const configuredServices = services.filter((s) => s.configured);

  // If no services are configured, status is unknown
  if (configuredServices.length === 0) {
    return "unknown";
  }

  const statuses = configuredServices.map((s) => s.status);

  // If any configured service is down, overall is down
  if (statuses.includes("down")) {
    return "down";
  }

  // If any configured service is degraded, overall is degraded
  if (statuses.includes("degraded")) {
    return "degraded";
  }

  // If any configured service is unknown, overall is degraded (not fully healthy)
  if (statuses.includes("unknown")) {
    return "degraded";
  }

  // All configured services healthy
  return "healthy";
}

/**
 * Aggregate health status from all external services
 * Uses 30-second caching to avoid excessive API calls
 */
export async function aggregateHealth(): Promise<HealthAggregatorResponse> {
  // Return cached data if still valid
  const now = Date.now();
  if (cache && now - cache.timestamp < CACHE_TTL_MS) {
    return cache.data;
  }

  // Run all health checks in parallel with Promise.allSettled for resilience
  const results = await Promise.allSettled([
    checkDatabase(),
    checkRedis(),
    checkAzureOpenAI(),
    checkResend(),
    checkSentry(),
    checkVercel(),
  ]);

  // Extract successful results, use fallback for failures
  const services: ServiceHealth[] = results.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    }

    // Fallback for rejected promises
    const serviceNames = [
      "Database",
      "Redis/KV",
      "Azure OpenAI",
      "Resend",
      "Sentry",
      "Vercel",
    ];
    return {
      name: serviceNames[index] || "Unknown",
      status: "down" as const,
      configured: false,
      lastChecked: new Date(),
      details: "Health check failed",
    };
  });

  // Calculate configured and unconfigured counts
  const configuredCount = services.filter((s) => s.configured).length;
  const unconfiguredCount = services.filter((s) => !s.configured).length;

  const response: HealthAggregatorResponse = {
    services,
    overallStatus: getOverallStatus(services),
    checkedAt: new Date(),
    configuredCount,
    unconfiguredCount,
  };

  // Update cache
  cache = {
    data: response,
    timestamp: now,
  };

  return response;
}

/**
 * Invalidate cache (useful for testing or forced refresh)
 */
export function invalidateHealthCache(): void {
  cache = null;
}

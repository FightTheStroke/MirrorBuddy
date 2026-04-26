/**
 * Health Check Utilities
 * Shared helpers for service health checks
 */

import type { ServiceHealth, ServiceStatus } from "./health-aggregator-types";

const TIMEOUT_MS = 5000;

/**
 * HTTP fetch with configurable timeout
 */
export async function fetchWithTimeout(
  url: string,
  headers: Record<string, string>,
  timeout: number = TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Build a standardized ServiceHealth response
 */
export function buildHealthResponse(
  name: string,
  status: ServiceStatus,
  configured: boolean,
  responseTimeMs?: number,
  details?: string,
): ServiceHealth {
  return {
    name,
    status,
    configured,
    responseTimeMs,
    lastChecked: new Date(),
    details,
  };
}

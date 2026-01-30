/**
 * Health Check Functions
 * Individual service health check implementations
 */

import { prisma } from "@/lib/db";
import type { ServiceHealth, ServiceStatus } from "./health-aggregator-types";

const TIMEOUT_MS = 5000;

/**
 * Helper function for HTTP health checks with timeout
 */
async function fetchWithTimeout(
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
 * Helper to build ServiceHealth response
 */
function buildHealthResponse(
  name: string,
  status: ServiceStatus,
  responseTimeMs?: number,
  details?: string,
): ServiceHealth {
  return {
    name,
    status,
    responseTimeMs,
    lastChecked: new Date(),
    details,
  };
}

/**
 * Check Database connectivity
 */
export async function checkDatabase(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const responseTimeMs = Date.now() - start;
    const status = responseTimeMs < 1000 ? "healthy" : "degraded";
    const details =
      status === "healthy" ? "Connected" : `Slow (${responseTimeMs}ms)`;
    return buildHealthResponse("Database", status, responseTimeMs, details);
  } catch (error) {
    const details =
      error instanceof Error ? error.message : "Connection failed";
    return buildHealthResponse("Database", "down", Date.now() - start, details);
  }
}

/**
 * Check Redis/KV connectivity
 */
export async function checkRedis(): Promise<ServiceHealth> {
  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;

  if (!kvUrl || !kvToken) {
    return buildHealthResponse(
      "Redis/KV",
      "unknown",
      undefined,
      "Not configured",
    );
  }

  const start = Date.now();
  try {
    const response = await fetchWithTimeout(`${kvUrl}/ping`, {
      Authorization: `Bearer ${kvToken}`,
    });
    const responseTimeMs = Date.now() - start;
    const status = response.ok ? "healthy" : "degraded";
    const details = response.ok ? "Connected" : `HTTP ${response.status}`;
    return buildHealthResponse("Redis/KV", status, responseTimeMs, details);
  } catch (error) {
    const details =
      error instanceof Error ? error.message : "Connection failed";
    return buildHealthResponse("Redis/KV", "down", Date.now() - start, details);
  }
}

/**
 * Check Azure OpenAI availability
 */
export async function checkAzureOpenAI(): Promise<ServiceHealth> {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;

  if (!endpoint || !apiKey) {
    return buildHealthResponse(
      "Azure OpenAI",
      "unknown",
      undefined,
      "Not configured",
    );
  }

  const start = Date.now();
  try {
    const url = `${endpoint}/openai/deployments?api-version=2024-02-01`;
    const response = await fetchWithTimeout(url, { "api-key": apiKey });
    const responseTimeMs = Date.now() - start;
    const status = response.ok ? "healthy" : "degraded";
    const details = response.ok ? "Connected" : `HTTP ${response.status}`;
    return buildHealthResponse("Azure OpenAI", status, responseTimeMs, details);
  } catch (error) {
    const details =
      error instanceof Error ? error.message : "Connection failed";
    return buildHealthResponse(
      "Azure OpenAI",
      "down",
      Date.now() - start,
      details,
    );
  }
}

/**
 * Check Resend email service
 */
export async function checkResend(): Promise<ServiceHealth> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return buildHealthResponse(
      "Resend",
      "unknown",
      undefined,
      "Not configured",
    );
  }

  const start = Date.now();
  try {
    const response = await fetchWithTimeout("https://api.resend.com/domains", {
      Authorization: `Bearer ${apiKey}`,
    });
    const responseTimeMs = Date.now() - start;
    const status = response.ok ? "healthy" : "degraded";
    const details = response.ok ? "Connected" : `HTTP ${response.status}`;
    return buildHealthResponse("Resend", status, responseTimeMs, details);
  } catch (error) {
    const details =
      error instanceof Error ? error.message : "Connection failed";
    return buildHealthResponse("Resend", "down", Date.now() - start, details);
  }
}

/**
 * Check Sentry error tracking
 */
export async function checkSentry(): Promise<ServiceHealth> {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    return buildHealthResponse(
      "Sentry",
      "unknown",
      undefined,
      "Not configured",
    );
  }

  const isValidFormat = dsn.startsWith("https://") && dsn.includes("@o");

  if (!isValidFormat) {
    return buildHealthResponse(
      "Sentry",
      "down",
      undefined,
      "Invalid DSN format",
    );
  }

  return buildHealthResponse("Sentry", "healthy", undefined, "Configured");
}

/**
 * Check Vercel API
 */
export async function checkVercel(): Promise<ServiceHealth> {
  const token = process.env.VERCEL_TOKEN;

  if (!token) {
    return buildHealthResponse(
      "Vercel",
      "unknown",
      undefined,
      "Not configured",
    );
  }

  const start = Date.now();
  try {
    const response = await fetchWithTimeout(
      "https://api.vercel.com/v9/projects",
      { Authorization: `Bearer ${token}` },
    );
    const responseTimeMs = Date.now() - start;
    const status = response.ok ? "healthy" : "degraded";
    const details = response.ok ? "Connected" : `HTTP ${response.status}`;
    return buildHealthResponse("Vercel", status, responseTimeMs, details);
  } catch (error) {
    const details =
      error instanceof Error ? error.message : "Connection failed";
    return buildHealthResponse("Vercel", "down", Date.now() - start, details);
  }
}

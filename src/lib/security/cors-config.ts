// ============================================================================
// CORS Configuration (F-04)
// Purpose: Prevent wildcard CORS in production, enforce origin whitelist
// ============================================================================

import { logger } from "@/lib/logger";

/**
 * Get allowed origins based on environment
 *
 * @returns Array of allowed origin URLs
 */
export function getAllowedOrigins(): string[] {
  const isDevelopment = process.env.NODE_ENV === "development";

  // Development: Allow localhost variants
  if (isDevelopment) {
    return [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
      "http://127.0.0.1:3002",
    ];
  }

  // Production: Parse from environment variable
  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS;
  if (!allowedOriginsEnv) {
    // F-04: Warn in production if ALLOWED_ORIGINS is not configured
    logger.warn(
      "ALLOWED_ORIGINS not configured in production. All cross-origin requests will be blocked.",
      { component: "CORS" },
    );
    return [];
  }

  return allowedOriginsEnv
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

/**
 * Get CORS headers for a given request origin
 *
 * F-04: NEVER returns wildcard '*' in production
 * Only returns Access-Control-Allow-Origin for whitelisted origins
 *
 * @param requestOrigin - Origin from request headers
 * @returns CORS headers object
 */
export function getCorsHeaders(
  requestOrigin: string | null | undefined,
): Record<string, string> {
  const allowedOrigins = getAllowedOrigins();

  // Base headers (always returned)
  const baseHeaders: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  // If no origin provided, return base headers only
  if (!requestOrigin) {
    return baseHeaders;
  }

  // Check if origin is in whitelist (exact match, case-sensitive)
  const isAllowed = allowedOrigins.includes(requestOrigin);

  // F-04: Only set Access-Control-Allow-Origin if whitelisted
  if (isAllowed) {
    return {
      ...baseHeaders,
      "Access-Control-Allow-Origin": requestOrigin,
      "Access-Control-Allow-Credentials": "true",
    };
  }

  // Origin not allowed - return base headers without Access-Control-Allow-Origin
  return baseHeaders;
}

/**
 * Check if an origin is allowed
 *
 * @param origin - Origin to check
 * @returns true if origin is in whitelist
 */
export function isOriginAllowed(origin: string | null | undefined): boolean {
  if (!origin) {
    return false;
  }

  const allowedOrigins = getAllowedOrigins();
  return allowedOrigins.includes(origin);
}

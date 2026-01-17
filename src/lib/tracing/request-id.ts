/**
 * Request ID Tracing Utility (F-21)
 *
 * Generates unique request IDs for tracing requests across logs.
 * Use with the logger to correlate all logs from a single request.
 *
 * @example
 * // In an API route:
 * import { getRequestLogger } from '@/lib/tracing';
 *
 * export async function GET(request: NextRequest) {
 *   const log = getRequestLogger(request);
 *   log.info('Processing request');
 *   // All logs from this request will have the same requestId
 * }
 */

import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * Generate a unique request ID
 * Format: timestamp-random (e.g., "1705512345678-a1b2c3")
 */
export function generateRequestId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}

/**
 * Extract request ID from headers or generate a new one
 * Checks X-Request-ID header first (for upstream tracing)
 */
export function getRequestId(request: NextRequest): string {
  const existingId = request.headers.get('x-request-id');
  if (existingId) return existingId;
  return generateRequestId();
}

/**
 * Create a child logger with request context
 * Automatically includes requestId, method, and path
 */
export function getRequestLogger(request: NextRequest) {
  const requestId = getRequestId(request);
  const method = request.method;
  const path = new URL(request.url).pathname;

  return logger.child({
    requestId,
    method,
    path,
  });
}

/**
 * Extract client info from request for logging
 */
export function getClientInfo(request: NextRequest): {
  ip: string | null;
  userAgent: string | null;
} {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || null;
  const userAgent = request.headers.get('user-agent');

  return { ip, userAgent };
}

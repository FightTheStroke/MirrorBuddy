import { randomBytes, timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";
import {
  CSRF_TOKEN_COOKIE,
  CSRF_TOKEN_HEADER,
} from "@/lib/auth";

/**
 * CSRF Protection Utilities
 *
 * Provides token generation and validation for mutating endpoints (POST/PUT/DELETE).
 * Implements double-submit cookie pattern.
 *
 * Usage:
 * 1. Generate token on GET request: const token = generateCSRFToken()
 * 2. Send token to client in response
 * 3. Client includes token in header: X-CSRF-Token: {token}
 * 4. Validate on mutating request: await validateCSRFToken(request)
 */

// Re-export for backwards compatibility
export { CSRF_TOKEN_COOKIE, CSRF_TOKEN_HEADER };

/**
 * Generate a cryptographically secure CSRF token
 * Use 32 bytes (256 bits) for strong protection
 */
export function generateCSRFToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Validate CSRF token from request
 *
 * Checks token in header matches expectation.
 * Uses timing-safe comparison to prevent timing attacks.
 *
 * @param request - Next.js request object
 * @param expectedToken - Token to validate against (from session/cookie/etc)
 * @returns true if token is valid
 */
export function validateCSRFToken(
  request: NextRequest,
  expectedToken: string,
): boolean {
  // Get token from header
  const headerToken = request.headers.get(CSRF_TOKEN_HEADER);

  if (!headerToken || !expectedToken) {
    return false;
  }

  // Convert to buffers for timing-safe comparison
  try {
    const headerBuffer = Buffer.from(headerToken, "base64url");
    const expectedBuffer = Buffer.from(expectedToken, "base64url");

    // Ensure same length (timingSafeEqual requires it)
    if (headerBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(headerBuffer, expectedBuffer);
  } catch {
    // Invalid base64url encoding
    return false;
  }
}

/**
 * Extract CSRF token from request cookie (double-submit pattern)
 *
 * @param request - Next.js request object
 * @returns CSRF token from cookie, or null if not found
 */
export function getCSRFTokenFromCookie(request: NextRequest): string | null {
  return request.cookies.get(CSRF_TOKEN_COOKIE)?.value || null;
}

/**
 * Validate CSRF token using double-submit cookie pattern
 *
 * Compares token in header with token in cookie.
 * Both must exist and match exactly.
 *
 * @param request - Next.js request object
 * @returns true if token is valid
 */
export function validateCSRFTokenFromCookie(request: NextRequest): boolean {
  const cookieToken = getCSRFTokenFromCookie(request);
  if (!cookieToken) {
    return false;
  }

  return validateCSRFToken(request, cookieToken);
}

/**
 * CSRF middleware helper for API routes
 *
 * Example usage in API route:
 *
 * ```typescript
 * import { requireCSRF } from '@/lib/security/csrf';
 *
 * export async function POST(request: NextRequest) {
 *   // Validate CSRF token (double-submit pattern)
 *   if (!requireCSRF(request)) {
 *     return NextResponse.json(
 *       { error: 'Invalid CSRF token' },
 *       { status: 403 }
 *     );
 *   }
 *
 *   // Process request...
 * }
 * ```
 */
export function requireCSRF(request: NextRequest): boolean {
  return validateCSRFTokenFromCookie(request);
}

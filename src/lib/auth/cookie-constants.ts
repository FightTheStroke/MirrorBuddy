/**
 * Centralized cookie name constants and validation utilities
 *
 * ADR 0075: Cookie Handling Standards
 *
 * ALL cookie operations MUST use these constants to prevent typos
 * and ensure consistent behavior across the codebase.
 */

// =============================================================================
// COOKIE NAME CONSTANTS
// =============================================================================

/**
 * Authentication Cookies (httpOnly, signed)
 * Used for secure server-side authentication
 */
export const AUTH_COOKIE_NAME = "mirrorbuddy-user-id";
export const AUTH_COOKIE_CLIENT = "mirrorbuddy-user-id-client";
export const LEGACY_AUTH_COOKIE = "convergio-user-id"; // Legacy fallback

/**
 * Trial/Visitor Cookies (httpOnly)
 * Used for anonymous trial session tracking
 */
export const VISITOR_COOKIE_NAME = "mirrorbuddy-visitor-id";

/**
 * Admin/Tier Cookies (httpOnly, signed)
 * Used for admin features and tier simulation
 */
export const SIMULATED_TIER_COOKIE = "mirrorbuddy-simulated-tier";
export const ADMIN_COOKIE_NAME = "mirrorbuddy-admin";

/**
 * CSRF Token Cookie (httpOnly)
 * Used for CSRF protection
 */
export const CSRF_TOKEN_COOKIE = "csrf-token";
export const CSRF_TOKEN_HEADER = "x-csrf-token";

/**
 * Client-side Cookies (NOT httpOnly - accessible via JavaScript)
 * Used for UI preferences
 */
export const CONSENT_COOKIE = "mirrorbuddy-consent";
export const A11Y_COOKIE = "mirrorbuddy-a11y";
export const THEME_COOKIE = "mirrorbuddy-theme";

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

/**
 * UUID v4 regex pattern
 * Used to validate visitor IDs
 */
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validate that a visitor ID is a proper UUID v4
 * Prevents trivial forgery of visitor cookies
 *
 * @param visitorId - The visitor ID to validate
 * @returns true if valid UUID v4, false otherwise
 *
 * @example
 * ```ts
 * const visitorId = cookieStore.get(VISITOR_COOKIE_NAME)?.value;
 * if (!visitorId || !isValidVisitorId(visitorId)) {
 *   return NextResponse.json({ error: "Invalid visitor" }, { status: 401 });
 * }
 * ```
 */
export function isValidVisitorId(visitorId: string | undefined): boolean {
  if (!visitorId) return false;
  return UUID_V4_REGEX.test(visitorId);
}

/**
 * Validate visitor ID and return it or null
 * Combines null check and format validation
 *
 * @param visitorId - The visitor ID to validate
 * @returns The validated visitor ID or null if invalid
 */
export function validateVisitorId(
  visitorId: string | undefined,
): string | null {
  if (!visitorId || !UUID_V4_REGEX.test(visitorId)) {
    return null;
  }
  return visitorId;
}

// =============================================================================
// COOKIE CONFIGURATION
// =============================================================================

/**
 * Standard cookie options for signed httpOnly cookies
 */
export const SECURE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

/**
 * Session cookie max age (7 days in seconds)
 */
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

/**
 * CSRF token max age (30 minutes in seconds)
 */
export const CSRF_MAX_AGE = 30 * 60; // 30 minutes

/**
 * Visitor session max age (30 days in seconds)
 */
export const VISITOR_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

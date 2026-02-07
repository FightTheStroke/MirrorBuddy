/**
 * @module Auth (Client)
 *
 * Client-safe authentication utilities for MirrorBuddy.
 * For server-only auth functions (validateAuth, signCookieValue, etc.),
 * import from '@/lib/auth/server' instead.
 */

// Client-side auth
export { getUserIdFromCookie, isAuthenticated } from "./client-auth";

// CSRF protection (client)
export { csrfFetch, getCSRFToken, clearCSRFToken } from "./csrf-client";

// Cookie constants (shared between client and server)
export {
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_CLIENT,
  LEGACY_AUTH_COOKIE,
  VISITOR_COOKIE_NAME,
  SIMULATED_TIER_COOKIE,
  ADMIN_COOKIE_NAME,
  CSRF_TOKEN_COOKIE,
  CSRF_TOKEN_HEADER,
  CONSENT_COOKIE,
  A11Y_COOKIE,
  THEME_COOKIE,
  SECURE_COOKIE_OPTIONS,
  SESSION_MAX_AGE,
  CSRF_MAX_AGE,
  VISITOR_MAX_AGE,
  isValidVisitorId,
  validateVisitorId,
} from "./cookie-constants";

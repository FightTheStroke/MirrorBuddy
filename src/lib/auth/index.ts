/**
 * @module Auth
 *
 * Authentication and authorization utilities for MirrorBuddy.
 *
 * This module provides a unified interface for all auth-related functionality.
 * External modules MUST import from '@/lib/auth' (this barrel) and NOT from sub-paths.
 */

// Session authentication
export {
  validateAuth,
  validateSessionOwnership,
  validateAdminAuth,
  requireAuthenticatedUser,
  type AuthResult,
  type AdminAuthResult,
} from './session-auth';

// Cookie signing
export { signCookieValue, verifyCookieValue, isSignedCookie } from './cookie-signing';

// Admin authorization
export { requireAdmin, isAdmin } from './require-admin';

// Client-side auth
export { getUserIdFromCookie, isAuthenticated } from './client-auth';

// CSRF protection
export { csrfFetch, getCSRFToken, clearCSRFToken } from './csrf-client';

// Password utilities
export {
  hashPassword,
  verifyPassword,
  generateRandomPassword,
  validatePasswordStrength,
} from './password';

// Cookie constants
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
} from './cookie-constants';

// SSO providers
export { GoogleWorkspaceProvider, GOOGLE_EDU_SCOPES, type GoogleUserInfo } from './sso/google-workspace';
export { Microsoft365Provider, MICROSOFT_EDU_SCOPES, type MicrosoftUserInfo } from './sso/microsoft365';

// SSO session management
export { createSSOSession, consumeSSOSession, type SSOSessionData } from './sso/sso-session';

// SSO callback handling
export { handleSSOCallback, type SSOCallbackResult } from './sso/sso-callback-handler';

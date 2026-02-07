/**
 * @module Auth (Server)
 *
 * Server-only authentication utilities for MirrorBuddy.
 * These modules use next/headers, @prisma/client, bcrypt, or other server-only deps.
 * Import from '@/lib/auth/server' in API routes, server components, and middleware.
 */

// Re-export all client-safe exports for convenience
export * from "./index";

// Session authentication (uses next/headers, prisma)
export {
  validateAuth,
  validateSessionOwnership,
  validateAdminAuth,
  requireAuthenticatedUser,
  type AuthResult,
  type AdminAuthResult,
} from "./session-auth";

// Cookie signing (uses azure key vault)
export {
  signCookieValue,
  verifyCookieValue,
  isSignedCookie,
} from "./cookie-signing";

// Admin authorization (uses prisma)
export { requireAdmin, isAdmin } from "./require-admin";

// Password utilities (uses bcrypt)
export {
  hashPassword,
  verifyPassword,
  generateRandomPassword,
  validatePasswordStrength,
} from "./password";

// SSO providers (server-side OAuth flows)
export {
  GoogleWorkspaceProvider,
  GOOGLE_EDU_SCOPES,
  type GoogleUserInfo,
} from "./sso/google-workspace";
export {
  Microsoft365Provider,
  MICROSOFT_EDU_SCOPES,
  type MicrosoftUserInfo,
} from "./sso/microsoft365";

// SSO session management (uses prisma)
export {
  createSSOSession,
  consumeSSOSession,
  type SSOSessionData,
} from "./sso/sso-session";

// SSO callback handling (uses prisma)
export {
  handleSSOCallback,
  type SSOCallbackResult,
} from "./sso/sso-callback-handler";

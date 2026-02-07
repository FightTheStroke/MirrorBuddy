/**
 * Compliance Module (Server-only)
 * COPPA service requires prisma/email - server-only context.
 */

// Re-export all client-safe exports
export * from "./index";

// COPPA service (server-only - uses prisma, email)
export {
  COPPA_AGE_THRESHOLD,
  checkCoppaStatus,
  requestParentalConsent,
  verifyParentalConsent,
  denyParentalConsentByCode,
  denyParentalConsent,
  canAccessFullFeatures,
  type CoppaStatus,
} from "./coppa-service";

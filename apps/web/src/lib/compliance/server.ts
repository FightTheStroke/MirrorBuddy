/**
 * Compliance Module (Server-only)
 * COPPA service requires prisma/email - server-only context.
 */

// Re-export all client-safe exports
export * from "./index";

// Guardian gate for payment endpoints (server-only - uses prisma) (T1.6, D-11)
export {
  assertNotUnconsentedMinor,
  guardianRequiredResponse,
  GUARDIAN_REQUIRED_CODE,
  type GuardianGateResult,
} from "./guardian-gate";

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

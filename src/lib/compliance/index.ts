/**
 * Compliance Module
 * COPPA, GDPR, Cookie Consent compliance utilities
 */

// Cookie consent config
export {
  localeToCountry,
  getCookieConsentConfig,
  getCookieConsentConfigFromLocale,
  type CookieConsentConfig,
} from "./cookie-consent-config";

export type { CountryCode } from "./cookie-consent-config";

// COPPA service
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

// Data retention config
export {
  ITALY_RETENTION,
  UK_RETENTION,
  GERMANY_RETENTION,
  SPAIN_RETENTION,
  FRANCE_RETENTION,
  type DataCategory,
  type RetentionSchedule,
  type RetentionPeriod,
  type DeletionRequest,
  type DeletionAuditLog,
} from "./data-retention-config";

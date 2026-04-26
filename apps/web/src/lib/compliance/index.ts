/**
 * Compliance Module (Client-safe)
 * Cookie Consent and Data Retention configuration.
 * For server-only COPPA functions, import from '@/lib/compliance/server'.
 */

// Cookie consent config (client-safe)
export {
  localeToCountry,
  getCookieConsentConfig,
  getCookieConsentConfigFromLocale,
  type CookieConsentConfig,
} from "./cookie-consent-config";

export type { CountryCode } from "./cookie-consent-config";

// Data retention config (client-safe - pure constants)
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

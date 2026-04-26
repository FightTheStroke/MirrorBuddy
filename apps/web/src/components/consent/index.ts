export { CookieConsentWall } from "./cookie-consent-wall";
export { UnifiedConsentWall } from "./unified-consent-wall";
export { InlineConsent } from "./inline-consent";
export {
  hasConsent,
  getConsent,
  saveConsent,
  clearConsent,
  hasAnalyticsConsent,
  syncConsentToServer,
  type ConsentData,
} from "@/lib/consent/consent-storage";
export {
  hasUnifiedConsent,
  getUnifiedConsent,
  saveUnifiedConsent,
  clearUnifiedConsent,
  syncUnifiedConsentToServer,
  needsReconsent,
  initializeConsent,
  loadUnifiedConsentFromDB,
  markConsentLoaded,
  isConsentLoaded,
  type UnifiedConsentData,
} from "@/lib/consent/unified-consent-storage";
export {
  updateConsentSnapshot,
  resetConsentSnapshot,
} from "@/lib/consent/consent-store";

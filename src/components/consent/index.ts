export { CookieConsentWall } from "./cookie-consent-wall";
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

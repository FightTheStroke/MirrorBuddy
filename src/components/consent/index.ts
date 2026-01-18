export { CookieConsentWall } from "./cookie-consent-wall";
export {
  hasConsent,
  getConsent,
  saveConsent,
  clearConsent,
  hasAnalyticsConsent,
  syncConsentToServer,
  type ConsentData,
} from "@/lib/consent/consent-storage";

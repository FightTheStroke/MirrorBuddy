/**
 * i18n Utilities - Language detection and cookie management
 */

export {
  parseAcceptLanguageHeader,
  getLocaleFromCookie,
  extractLocaleFromUrl,
  detectLocaleFromRequest,
  detectLocaleFromNextRequest,
  isValidLocale,
} from "./locale-detection";

export {
  getLanguageCookie,
  setLanguageCookie,
  removeLanguageCookie,
  getBrowserLanguage,
} from "./language-cookie";

export { getLanguageInstruction } from "./language-instructions";

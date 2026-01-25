/**
 * Locale Testing Helpers - Main Export
 *
 * Utility functions for common locale testing scenarios.
 * This file re-exports all locale helper modules for convenience.
 */

// Verification helpers
export {
  verifyPageLocale,
  waitForLocale,
  testLocaleDetection,
  type LocaleVerification,
} from "./locale-verification";

// Navigation and cookie helpers
export {
  getLocaleName,
  getAcceptLanguageHeader,
  isSupportedLocale,
  extractLocaleFromUrl,
  buildLocalizedPath,
  getLocaleCookie,
  setLocaleCookie,
  clearLocaleCookie,
  LOCALE_NAMES,
  ACCEPT_LANGUAGE_HEADERS,
} from "./locale-navigation";

// Testing patterns
export { localePatterns } from "./locale-patterns";

// Content matchers
export { contentMatchers } from "./locale-content";

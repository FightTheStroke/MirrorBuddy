/**
 * E2E Test Fixtures - Index
 *
 * Centralized export for all E2E test fixtures and helpers.
 * Import from this file to access all locale testing utilities.
 *
 * @example
 * ```typescript
 * import { test, expect, testAllLocales } from './fixtures';
 * import { verifyPageLocale, waitForLocale } from './fixtures';
 * ```
 */

// Core fixtures and test extensions
export {
  test,
  testLocale,
  testAllLocales,
  SUPPORTED_LOCALES,
  LOCALE_NAMES,
  ACCEPT_LANGUAGE_HEADERS,
  type LocaleFixtureOptions,
} from "./locale-fixtures";

// LocalePage class
export { LocalePage } from "./locale-page";

// Custom matchers
export { expect } from "./locale-matchers";

// All locale helpers (consolidated export)
export {
  // Verification
  verifyPageLocale,
  waitForLocale,
  testLocaleDetection,
  type LocaleVerification,
  // Navigation
  getLocaleName,
  getAcceptLanguageHeader,
  isSupportedLocale,
  extractLocaleFromUrl,
  buildLocalizedPath,
  getLocaleCookie,
  setLocaleCookie,
  clearLocaleCookie,
  // Patterns
  localePatterns,
  // Content matchers
  contentMatchers,
} from "./locale-helpers";

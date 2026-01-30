/**
 * Locale Testing Fixtures for E2E Tests
 *
 * Provides fixtures for testing internationalization:
 * - Setting locale via URL prefix (/it/, /en/, /fr/, /de/, /es/)
 * - Mocking Accept-Language header
 * - Verifying page is in correct locale
 * - Locale-aware page navigation
 *
 * Usage:
 * ```typescript
 * import { test, expect } from './fixtures/locale-fixtures';
 *
 * test('should display Italian content', async ({ localePage }) => {
 *   await localePage.goto('/home');
 *   await expect(localePage.page).toHaveLocale('it');
 * });
 * ```
 *
 * Note: This file uses Playwright's fixture 'use' function, not React hooks.
 * The react-hooks/rules-of-hooks rule is disabled for this file.
 */

/* eslint-disable react-hooks/rules-of-hooks */

import { test as base } from "@playwright/test";
import type { Locale } from "@/i18n/config";
import { LocalePage } from "./locale-page";

/**
 * Supported locales in MirrorBuddy
 */
export const SUPPORTED_LOCALES = ["it", "en", "fr", "de", "es"] as const;

/**
 * Locale names for display and verification
 */
export const LOCALE_NAMES: Record<Locale, string> = {
  it: "Italiano",
  en: "English",
  fr: "Français",
  de: "Deutsch",
  es: "Español",
};

/**
 * Accept-Language header values for each locale
 */
export const ACCEPT_LANGUAGE_HEADERS: Record<Locale, string> = {
  it: "it-IT,it;q=0.9,en;q=0.8",
  en: "en-US,en;q=0.9",
  fr: "fr-FR,fr;q=0.9,en;q=0.8",
  de: "de-DE,de;q=0.9,en;q=0.8",
  es: "es-ES,es;q=0.9,en;q=0.8",
};

/**
 * Fixture options for locale testing
 */
export type LocaleFixtureOptions = {
  locale: Locale;
  acceptLanguage?: string;
  setLocaleCookie?: boolean;
};

/**
 * Fixtures for locale testing
 */
type LocaleFixtures = {
  localeOptions: LocaleFixtureOptions;
  localePage: LocalePage;
};

/**
 * Extend Playwright test with locale fixtures
 */
export const test = base.extend<LocaleFixtures>({
  /**
   * Locale options - configure via test.use()
   */
  localeOptions: [
    {
      locale: "it", // Default locale
      setLocaleCookie: false,
    },
    { option: true },
  ],

  /**
   * LocalePage fixture - provides locale-aware page navigation
   */
  localePage: async ({ page, localeOptions, context }, use) => {
    const { locale, acceptLanguage, setLocaleCookie } = localeOptions;

    // Set Accept-Language header if specified
    if (acceptLanguage) {
      await context.setExtraHTTPHeaders({
        "Accept-Language": acceptLanguage,
      });
    } else {
      // Use default Accept-Language for locale
      await context.setExtraHTTPHeaders({
        "Accept-Language": ACCEPT_LANGUAGE_HEADERS[locale],
      });
    }

    // Mock ToS API to bypass TosGateProvider (ADR 0059)
    await page.route("**/api/tos", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ accepted: true, version: "1.0" }),
      });
    });

    // Set localStorage to bypass wall components (cookie consent, onboarding store)
    await page.context().addInitScript(() => {
      localStorage.setItem(
        "mirrorbuddy-consent",
        JSON.stringify({
          version: "1.0",
          acceptedAt: new Date().toISOString(),
          essential: true,
          analytics: false,
          marketing: false,
        }),
      );
    });

    // Set trial consent cookie to bypass TrialConsentGate on /welcome
    await context.addCookies([
      {
        name: "mirrorbuddy-trial-consent",
        value: encodeURIComponent(
          JSON.stringify({
            accepted: true,
            version: "1.0",
            acceptedAt: new Date().toISOString(),
          }),
        ),
        domain: "localhost",
        path: "/",
        sameSite: "Lax",
      },
    ]);

    // Set NEXT_LOCALE cookie if requested (simulates user preference)
    if (setLocaleCookie) {
      await context.addCookies([
        {
          name: "NEXT_LOCALE",
          value: locale,
          domain: "localhost",
          path: "/",
        },
      ]);
    }

    // Create LocalePage instance
    const localePage = new LocalePage(page, locale);

    // Use the fixture
    await use(localePage);
  },
});

// Re-export expect with matchers
export { expect } from "./locale-matchers";

// Re-export LocalePage
export { LocalePage } from "./locale-page";

/**
 * Create a test suite for a specific locale
 *
 * @param locale - Locale to test
 * @param testFn - Test function that receives localePage
 *
 * @example
 * ```typescript
 * testLocale('it', async ({ localePage }) => {
 *   await localePage.goto('/home');
 *   await expect(localePage.page).toHaveLocale('it');
 * });
 * ```
 */
export function testLocale(
  locale: Locale,
  testName: string,
  testFn: (args: { localePage: LocalePage }) => Promise<void>,
) {
  test.describe(`[${locale}]`, () => {
    test.use({ localeOptions: { locale } });
    test(testName, testFn);
  });
}

/**
 * Create test suite that runs for all locales
 *
 * @param testName - Name of the test
 * @param testFn - Test function that receives localePage
 *
 * @example
 * ```typescript
 * testAllLocales('should load home page', async ({ localePage }) => {
 *   await localePage.goto('/home');
 *   await expect(localePage.page).toHaveLocale(localePage.locale);
 * });
 * ```
 */
export function testAllLocales(
  testName: string,
  testFn: (args: { localePage: LocalePage }) => Promise<void>,
) {
  for (const locale of SUPPORTED_LOCALES) {
    testLocale(locale, testName, testFn);
  }
}

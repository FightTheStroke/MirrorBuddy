/**
 * Locale Verification Helpers
 *
 * Functions for verifying page locale and waiting for locale changes.
 */

import { type Page } from '@playwright/test';
import type { Locale } from '@/i18n/config';

/**
 * Locale verification result
 */
export interface LocaleVerification {
  locale: Locale;
  htmlLang: string | null;
  urlContainsLocale: boolean;
  cookieValue: string | null;
  isValid: boolean;
  errors: string[];
}

/**
 * Verify page is correctly localized
 *
 * Checks multiple indicators:
 * - HTML lang attribute
 * - URL locale prefix
 * - NEXT_LOCALE cookie
 *
 * @param page - Playwright page
 * @param expectedLocale - Expected locale code
 * @returns Verification result with details
 */
export async function verifyPageLocale(
  page: Page,
  expectedLocale: Locale,
): Promise<LocaleVerification> {
  const errors: string[] = [];

  // Check HTML lang attribute
  const htmlLang = await page.locator('html').getAttribute('lang');
  if (htmlLang !== expectedLocale) {
    errors.push(`HTML lang="${htmlLang}" does not match expected "${expectedLocale}"`);
  }

  // Check URL locale prefix
  const url = page.url();
  const urlContainsLocale = url.includes(`/${expectedLocale}/`);
  if (!urlContainsLocale) {
    errors.push(`URL "${url}" does not contain locale prefix "/${expectedLocale}/"`);
  }

  // Check NEXT_LOCALE cookie
  // Scope cookies to the current page URL to avoid picking up stale cookies
  // from other domains/paths (Playwright can return a superset when called with no URL).
  const cookies = await page.context().cookies(page.url());
  const localeCookies = cookies.filter((c) => c.name === 'NEXT_LOCALE');
  const cookieValue =
    localeCookies.length === 0
      ? null
      : Array.from(new Set(localeCookies.map((c) => c.value))).join(',');
  const cookieMatchesExpected = localeCookies.some((cookie) => cookie.value === expectedLocale);

  // Cookie is optional and is primarily used for locale detection when URLs are not explicitly
  // locale-prefixed. When the URL *is* prefixed (e.g. /en/...), the URL is the source of truth.
  const shouldEnforceCookieMatch = !urlContainsLocale;

  if (cookieValue && !cookieMatchesExpected && shouldEnforceCookieMatch) {
    errors.push(`NEXT_LOCALE cookie="${cookieValue}" does not match expected "${expectedLocale}"`);
  }

  return {
    locale: expectedLocale,
    htmlLang,
    urlContainsLocale,
    cookieValue,
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Wait for locale to be applied to page
 *
 * @param page - Playwright page
 * @param locale - Expected locale
 * @param timeout - Timeout in milliseconds (default: 5000)
 */
export async function waitForLocale(page: Page, locale: Locale, timeout = 5000): Promise<void> {
  await page.waitForSelector(`html[lang="${locale}"]`, {
    timeout,
    state: 'attached',
  });
}

/**
 * Test locale detection from Accept-Language header
 *
 * @param page - Playwright page
 * @param expectedLocale - Expected locale to be detected
 * @returns True if locale was correctly detected
 */
export async function testLocaleDetection(page: Page, expectedLocale: Locale): Promise<boolean> {
  const ACCEPT_LANGUAGE_HEADERS: Record<Locale, string> = {
    it: 'it-IT,it;q=0.9,en;q=0.8',
    en: 'en-US,en;q=0.9',
    fr: 'fr-FR,fr;q=0.9,en;q=0.8',
    de: 'de-DE,de;q=0.9,en;q=0.8',
    es: 'es-ES,es;q=0.9,en;q=0.8',
  };

  // Set Accept-Language header
  await page.context().setExtraHTTPHeaders({
    'Accept-Language': ACCEPT_LANGUAGE_HEADERS[expectedLocale],
  });

  // Navigate to root (should redirect to detected locale)
  await page.goto('/');

  // Wait for redirect
  await page.waitForLoadState('domcontentloaded');

  // Check if redirected to correct locale
  const verification = await verifyPageLocale(page, expectedLocale);
  return verification.isValid;
}

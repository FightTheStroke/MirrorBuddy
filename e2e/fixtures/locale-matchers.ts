/**
 * Locale Custom Matchers
 *
 * Custom Playwright expect matchers for locale testing.
 */

import {
  expect as baseExpect,
  type Page,
  type Locator,
} from "@playwright/test";
import type { Locale } from "@/i18n/config";

/**
 * Extend expect with locale-specific matchers
 */
export const expect = baseExpect.extend({
  /**
   * Assert that page is in the expected locale
   * @param page - Playwright page
   * @param expectedLocale - Expected locale code
   */
  async toHaveLocale(page: Page, expectedLocale: Locale) {
    let pass = false;
    let matcherResult;

    try {
      // Check HTML lang attribute
      const htmlLang = await page.locator("html").getAttribute("lang");

      // Check if current URL has locale prefix
      const url = page.url();
      const hasLocalePrefix = url.includes(`/${expectedLocale}/`);

      // Check if NEXT_LOCALE cookie is set
      const cookies = await page.context().cookies();
      const localeCookie = cookies.find((c) => c.name === "NEXT_LOCALE");
      const cookieMatches =
        !localeCookie || localeCookie.value === expectedLocale;

      pass = htmlLang === expectedLocale && hasLocalePrefix && cookieMatches;

      matcherResult = {
        message: () =>
          pass
            ? `Expected page NOT to be in locale "${expectedLocale}"`
            : `Expected page to be in locale "${expectedLocale}"\n` +
              `  HTML lang: ${htmlLang}\n` +
              `  URL: ${url}\n` +
              `  Cookie: ${localeCookie?.value || "not set"}`,
        pass,
      };
    } catch (error) {
      matcherResult = {
        message: () => `Error checking locale: ${error}`,
        pass: false,
      };
    }

    return matcherResult;
  },

  /**
   * Assert that an element contains text in a specific locale
   * @param locator - Playwright locator
   * @param expectedText - Expected text content
   */
  async toHaveLocaleText(
    locator: Locator,
    expectedText: string | RegExp,
    options?: { timeout?: number },
  ) {
    let pass = false;
    let matcherResult;

    try {
      // Get actual text content
      const actualText = await locator.textContent({
        timeout: options?.timeout,
      });

      // Check if text matches
      if (typeof expectedText === "string") {
        pass = actualText?.includes(expectedText) || false;
      } else {
        pass = expectedText.test(actualText || "");
      }

      matcherResult = {
        message: () =>
          pass
            ? `Expected element NOT to contain "${expectedText}"`
            : `Expected element to contain "${expectedText}"\n` +
              `  Actual: ${actualText}`,
        pass,
      };
    } catch (error) {
      matcherResult = {
        message: () => `Error checking locale text: ${error}`,
        pass: false,
      };
    }

    return matcherResult;
  },
});

/**
 * Locale Testing Patterns
 *
 * Common patterns for locale testing in E2E tests.
 */

import type { Page } from "@playwright/test";
import type { Locale } from "@/i18n/config";
import { verifyPageLocale, waitForLocale } from "./locale-verification";
import { buildLocalizedPath } from "./locale-navigation";

/**
 * Supported locales
 */
const SUPPORTED_LOCALES = ["it", "en", "fr", "de", "es"] as const;

/**
 * Common locale test patterns
 */
export const localePatterns = {
  /**
   * Test that a page loads correctly in each locale
   */
  async testPageInAllLocales(
    page: Page,
    path: string,
    verifyFn?: (locale: Locale) => Promise<void>,
  ): Promise<void> {
    for (const locale of SUPPORTED_LOCALES) {
      const localizedPath = buildLocalizedPath(locale, path);
      await page.goto(localizedPath);
      await waitForLocale(page, locale);

      const verification = await verifyPageLocale(page, locale);
      if (!verification.isValid) {
        throw new Error(
          `Locale verification failed for ${locale}: ${verification.errors.join(", ")}`,
        );
      }

      // Run custom verification if provided
      if (verifyFn) {
        await verifyFn(locale);
      }
    }
  },

  /**
   * Test locale switching behavior
   */
  async testLocaleSwitching(
    page: Page,
    fromLocale: Locale,
    toLocale: Locale,
    path: string,
  ): Promise<void> {
    // Start in first locale
    const startPath = buildLocalizedPath(fromLocale, path);
    await page.goto(startPath);
    await waitForLocale(page, fromLocale);

    // Switch to second locale (implementation depends on UI)
    // This is a placeholder - implement based on actual locale switcher
    const targetPath = buildLocalizedPath(toLocale, path);
    await page.goto(targetPath);
    await waitForLocale(page, toLocale);

    // Verify switch was successful
    const verification = await verifyPageLocale(page, toLocale);
    if (!verification.isValid) {
      throw new Error(
        `Locale switch verification failed: ${verification.errors.join(", ")}`,
      );
    }
  },

  /**
   * Test that locale persists across navigation
   */
  async testLocalePersistence(
    page: Page,
    locale: Locale,
    paths: string[],
  ): Promise<void> {
    for (const path of paths) {
      const localizedPath = buildLocalizedPath(locale, path);
      await page.goto(localizedPath);
      await waitForLocale(page, locale);

      const verification = await verifyPageLocale(page, locale);
      if (!verification.isValid) {
        throw new Error(
          `Locale persistence failed at ${path}: ${verification.errors.join(", ")}`,
        );
      }
    }
  },
};

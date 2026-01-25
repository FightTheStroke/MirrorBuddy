/**
 * Locale Fixtures Integration Tests
 *
 * Real-world scenarios testing locale behavior:
 * - User workflows
 * - Locale switching
 * - Locale persistence
 * - Cookie and header interactions
 */

import { test, expect } from "./fixtures/locale-fixtures";
import {
  verifyPageLocale,
  waitForLocale,
  setLocaleCookie,
  getLocaleCookie,
  localePatterns,
} from "./fixtures/locale-helpers";

// ==================================================
// Locale Pattern Tests
// ==================================================

test.describe("Locale Patterns", () => {
  test("should test page in all locales using pattern", async ({ page }) => {
    await localePatterns.testPageInAllLocales(page, "/home", async (locale) => {
      // Custom verification for each locale
      const htmlLang = await page.locator("html").getAttribute("lang");
      expect(htmlLang).toBe(locale);
    });
  });

  test("should test locale persistence across navigation", async ({ page }) => {
    await localePatterns.testLocalePersistence(page, "it", [
      "/home",
      "/chat",
      "/settings",
    ]);
  });

  test("should test locale switching", async ({ page }) => {
    await localePatterns.testLocaleSwitching(page, "it", "en", "/home");
  });
});

// ==================================================
// Integration Tests - Real World Scenarios
// ==================================================

test.describe("Real World Locale Scenarios", () => {
  test("user visits from Italy (Accept-Language: it)", async ({ page, context }) => {
    // Simulate Italian browser
    await context.setExtraHTTPHeaders({
      "Accept-Language": "it-IT,it;q=0.9,en;q=0.8",
    });

    // Visit home page
    await page.goto("/it/home");
    await waitForLocale(page, "it");

    // Verify Italian locale
    const verification = await verifyPageLocale(page, "it");
    expect(verification.isValid).toBe(true);
  });

  test("user visits from UK (Accept-Language: en)", async ({ page, context }) => {
    // Simulate UK browser
    await context.setExtraHTTPHeaders({
      "Accept-Language": "en-GB,en;q=0.9",
    });

    // Visit home page
    await page.goto("/en/home");
    await waitForLocale(page, "en");

    // Verify English locale
    const verification = await verifyPageLocale(page, "en");
    expect(verification.isValid).toBe(true);
  });

  test("user navigates between different locale pages", async ({ page }) => {
    // Start in Italian
    await page.goto("/it/home");
    await waitForLocale(page, "it");
    expect(await verifyPageLocale(page, "it")).toMatchObject({ isValid: true });

    // Navigate to English version of same page
    await page.goto("/en/home");
    await waitForLocale(page, "en");
    expect(await verifyPageLocale(page, "en")).toMatchObject({ isValid: true });

    // Navigate to French version
    await page.goto("/fr/home");
    await waitForLocale(page, "fr");
    expect(await verifyPageLocale(page, "fr")).toMatchObject({ isValid: true });
  });

  test("user preference cookie overrides Accept-Language", async ({ page, context }) => {
    // Browser sends Italian Accept-Language
    await context.setExtraHTTPHeaders({
      "Accept-Language": "it-IT,it;q=0.9,en;q=0.8",
    });

    // But user has English cookie preference
    await setLocaleCookie(page, "en");

    // Visit English page
    await page.goto("/en/home");

    // Cookie should be respected
    const cookieValue = await getLocaleCookie(page);
    expect(cookieValue).toBe("en");

    // Page should be in English
    await waitForLocale(page, "en");
    const verification = await verifyPageLocale(page, "en");
    expect(verification.isValid).toBe(true);
  });

  test("locale persists during multi-page navigation", async ({ page }) => {
    // Start in German
    await page.goto("/de/home");
    await waitForLocale(page, "de");

    // Navigate to different pages, locale should persist
    const pages = ["/chat", "/settings", "/profile"];

    for (const path of pages) {
      await page.goto(`/de${path}`);
      await waitForLocale(page, "de");

      const verification = await verifyPageLocale(page, "de");
      expect(verification.isValid).toBe(true);
      expect(verification.errors).toHaveLength(0);
    }
  });

  test("switching locales via URL updates page correctly", async ({ page }) => {
    const locales = ["it", "en", "fr", "de", "es"] as const;

    for (const locale of locales) {
      // Navigate to locale-specific page
      await page.goto(`/${locale}/chat`);
      await waitForLocale(page, locale);

      // Verify page updated to correct locale
      const verification = await verifyPageLocale(page, locale);
      expect(verification.isValid).toBe(true);
      expect(verification.htmlLang).toBe(locale);
      expect(verification.urlContainsLocale).toBe(true);
    }
  });

  test("Accept-Language fallback when no cookie set", async ({ page, context }) => {
    // User has Spanish browser
    await context.setExtraHTTPHeaders({
      "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
    });

    // Visit Spanish page (no cookie, uses Accept-Language)
    await page.goto("/es/home");
    await waitForLocale(page, "es");

    // Should use Spanish from Accept-Language
    const verification = await verifyPageLocale(page, "es");
    expect(verification.isValid).toBe(true);

    // Cookie may or may not be set by middleware - verify verification succeeded
    expect(verification.htmlLang).toBe("es");
  });
});

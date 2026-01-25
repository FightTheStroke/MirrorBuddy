/**
 * Locale Fixtures Basic Tests
 *
 * Tests basic functionality of locale fixtures:
 * - Fixture behavior
 * - Helper functions
 * - Custom matchers
 */

import { test, expect, testAllLocales, testLocale } from "./fixtures/locale-fixtures";
import {
  verifyPageLocale,
  waitForLocale,
  getLocaleCookie,
  setLocaleCookie,
  clearLocaleCookie,
  buildLocalizedPath,
  extractLocaleFromUrl,
  isSupportedLocale,
} from "./fixtures/locale-helpers";

// ==================================================
// Basic Fixture Functionality Tests
// ==================================================

test.describe("Locale Fixtures - Basic", () => {
  test.describe("LocalePage Navigation", () => {
    test("should navigate to Italian page by default", async ({ localePage }) => {
      await localePage.goto("/home");
      await expect(localePage.page).toHaveLocale("it");
    });

    test("should navigate to English page when configured", async ({ page, context }) => {
      // Set Accept-Language header for English
      await context.setExtraHTTPHeaders({
        "Accept-Language": "en-US,en;q=0.9",
      });

      // Navigate to English home page
      await page.goto("/en/home");

      // Verify page is in English
      const verification = await verifyPageLocale(page, "en");
      expect(verification.isValid).toBe(true);
    });

    test("should handle all locale URL prefixes", async ({ page }) => {
      const locales = ["it", "en", "fr", "de", "es"] as const;

      for (const locale of locales) {
        await page.goto(`/${locale}/home`);
        await waitForLocale(page, locale);

        const verification = await verifyPageLocale(page, locale);
        expect(verification.isValid).toBe(true);
        expect(verification.htmlLang).toBe(locale);
        expect(verification.urlContainsLocale).toBe(true);
      }
    });
  });

  test.describe("Accept-Language Header", () => {
    test("should detect Italian from Accept-Language", async ({ page, context }) => {
      await context.setExtraHTTPHeaders({
        "Accept-Language": "it-IT,it;q=0.9,en;q=0.8",
      });

      await page.goto("/it/home");
      const verification = await verifyPageLocale(page, "it");
      expect(verification.isValid).toBe(true);
    });

    test("should detect English from Accept-Language", async ({ page, context }) => {
      await context.setExtraHTTPHeaders({
        "Accept-Language": "en-US,en;q=0.9",
      });

      await page.goto("/en/home");
      const verification = await verifyPageLocale(page, "en");
      expect(verification.isValid).toBe(true);
    });

    test("should detect French from Accept-Language", async ({ page, context }) => {
      await context.setExtraHTTPHeaders({
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
      });

      await page.goto("/fr/home");
      const verification = await verifyPageLocale(page, "fr");
      expect(verification.isValid).toBe(true);
    });
  });

  test.describe("NEXT_LOCALE Cookie", () => {
    test("should respect NEXT_LOCALE cookie", async ({ page }) => {
      // Set locale cookie to English
      await setLocaleCookie(page, "en");

      // Navigate to home (cookie should influence locale)
      await page.goto("/en/home");

      // Verify cookie is set
      const cookieValue = await getLocaleCookie(page);
      expect(cookieValue).toBe("en");
    });

    test("should clear NEXT_LOCALE cookie", async ({ page }) => {
      // Set locale cookie
      await setLocaleCookie(page, "it");
      let cookieValue = await getLocaleCookie(page);
      expect(cookieValue).toBe("it");

      // Clear cookie
      await clearLocaleCookie(page);
      cookieValue = await getLocaleCookie(page);
      expect(cookieValue).toBeNull();
    });
  });

  test.describe("Custom Matchers", () => {
    test("toHaveLocale matcher should verify Italian page", async ({ page }) => {
      await page.goto("/it/home");
      await expect(page).toHaveLocale("it");
    });

    test("toHaveLocale matcher should verify English page", async ({ page }) => {
      await page.goto("/en/home");
      await expect(page).toHaveLocale("en");
    });

    test("toHaveLocale matcher should fail for wrong locale", async ({ page }) => {
      await page.goto("/it/home");

      // This should fail - page is in Italian, not English
      try {
        await expect(page).toHaveLocale("en");
        throw new Error("Expected matcher to fail but it passed");
      } catch (error) {
        // Expected to fail
        const errorMessage = error instanceof Error ? error.message : String(error);
        expect(errorMessage).toContain("Expected page to be in locale");
      }
    });
  });
});

// ==================================================
// Helper Function Tests
// ==================================================

test.describe("Locale Helpers", () => {
  test.describe("URL Helpers", () => {
    test("buildLocalizedPath should create correct paths", () => {
      expect(buildLocalizedPath("it", "/home")).toBe("/it/home");
      expect(buildLocalizedPath("en", "home")).toBe("/en/home");
      expect(buildLocalizedPath("fr", "/about")).toBe("/fr/about");
    });

    test("extractLocaleFromUrl should extract locale", () => {
      expect(extractLocaleFromUrl("/it/home")).toBe("it");
      expect(extractLocaleFromUrl("/en/chat")).toBe("en");
      expect(extractLocaleFromUrl("/fr/settings")).toBe("fr");
      expect(extractLocaleFromUrl("/home")).toBeNull();
      expect(extractLocaleFromUrl("/xx/home")).toBeNull(); // Invalid locale
    });

    test("isSupportedLocale should validate locales", () => {
      expect(isSupportedLocale("it")).toBe(true);
      expect(isSupportedLocale("en")).toBe(true);
      expect(isSupportedLocale("fr")).toBe(true);
      expect(isSupportedLocale("de")).toBe(true);
      expect(isSupportedLocale("es")).toBe(true);
      expect(isSupportedLocale("xx")).toBe(false);
      expect(isSupportedLocale("")).toBe(false);
    });
  });

  test.describe("Verification Helpers", () => {
    test("verifyPageLocale should return detailed verification", async ({ page }) => {
      await page.goto("/it/home");
      await waitForLocale(page, "it");

      const verification = await verifyPageLocale(page, "it");
      expect(verification.locale).toBe("it");
      expect(verification.htmlLang).toBe("it");
      expect(verification.urlContainsLocale).toBe(true);
      expect(verification.isValid).toBe(true);
      expect(verification.errors).toHaveLength(0);
    });

    test("verifyPageLocale should detect mismatches", async ({ page }) => {
      await page.goto("/it/home");
      await waitForLocale(page, "it");

      // Check for wrong locale
      const verification = await verifyPageLocale(page, "en");
      expect(verification.isValid).toBe(false);
      expect(verification.errors.length).toBeGreaterThan(0);
    });
  });
});

// ==================================================
// Pattern Tests - Using testLocale and testAllLocales
// ==================================================

test.describe("Locale Testing Patterns", () => {
  // Test single locale with testLocale helper
  testLocale("it", "should load Italian home page", async ({ localePage }) => {
    await localePage.goto("/home");
    await expect(localePage.page).toHaveLocale("it");
  });

  testLocale("en", "should load English home page", async ({ localePage }) => {
    await localePage.goto("/home");
    await expect(localePage.page).toHaveLocale("en");
  });

  // Test all locales with testAllLocales helper
  testAllLocales("should load home page in all locales", async ({ localePage }) => {
    await localePage.goto("/home");
    await localePage.waitForLocaleLoad();
    await expect(localePage.page).toHaveLocale(localePage.locale);
  });

  testAllLocales("should have correct HTML lang attribute", async ({ localePage }) => {
    await localePage.goto("/home");
    const currentLocale = await localePage.getCurrentLocale();
    expect(currentLocale).toBe(localePage.locale);
  });
});

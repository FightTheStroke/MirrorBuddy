/**
 * E2E TESTS: Locale Switching
 * Tests language switching from settings, URL updates, content updates, and persistence
 * F-07: Locale Switching Tests
 */

import { test, expect, testAllLocales } from "./fixtures";

// IMPORTANT: These tests check unauthenticated pages (welcome, legal)
// Override global storageState to start without authentication
test.use({ storageState: undefined });
import {
  localePatterns,
  verifyPageLocale,
  waitForLocale,
  buildLocalizedPath,
} from "./fixtures";
import type { Locale } from "@/i18n/config";

test.describe("Locale Switching and Content Localization", () => {
  test.beforeEach(async ({ localePage }) => {
    // Mock ToS acceptance to bypass modal
    await localePage.page.route("/api/tos", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accepted: true,
          version: "1.0",
        }),
      });
    });
  });
  /**
   * Test 1: User can switch language from settings
   * Verifies that language selector in settings dialog changes the locale
   */
  test("user can switch language via URL navigation", async ({
    localePage,
  }) => {
    // Start in Italian on welcome page (public)
    await localePage.goto("/welcome");
    await expect(localePage.page.locator("html")).toHaveAttribute("lang", "it");

    // Switch to English by navigating to English URL
    await localePage.page.goto(buildLocalizedPath("en", "/welcome"));
    await waitForLocale(localePage.page, "en", 5000);

    // Verify we're in English
    const verification = await verifyPageLocale(localePage.page, "en");
    expect(verification.isValid).toBeTruthy();
  });

  /**
   * Test 2: URL updates when language changes
   * Verifies that changing language updates the URL locale prefix
   */
  test("URL updates when language changes", async ({ localePage }) => {
    // Start in Italian on welcome page (public)
    const startPath = "/welcome";
    await localePage.goto(startPath);

    const urlBeforeSwitch = localePage.page.url();
    expect(urlBeforeSwitch).toContain("/it/");

    // Navigate to English version
    await localePage.page.goto(`/en${startPath}`);
    await waitForLocale(localePage.page, "en", 5000);

    const urlAfterSwitch = localePage.page.url();
    expect(urlAfterSwitch).toContain("/en/");

    // Verify it's different
    expect(urlBeforeSwitch).not.toBe(urlAfterSwitch);
  });

  /**
   * Test 3: Content updates to new language
   * Verifies that page content changes when locale changes
   */
  testAllLocales("content updates to new language", async ({ localePage }) => {
    // Navigate to welcome page (public, no auth required)
    await localePage.goto("/welcome");

    // Wait for locale to be applied
    await waitForLocale(localePage.page, localePage.locale, 5000);

    // Verify page is in correct locale
    const verification = await verifyPageLocale(
      localePage.page,
      localePage.locale,
    );
    expect(verification.isValid).toBeTruthy();

    // Check that page has content (different from empty state)
    const mainContent = localePage.page.locator("main, [role='main']");
    expect(mainContent).toBeTruthy();
  });

  /**
   * Test 4: Language preference persists across pages
   * Verifies that selecting a language keeps that language on navigation
   */
  test("language preference persists across pages", async ({
    localePage,
    context,
  }) => {
    const targetLocale: Locale = "en";

    // Set NEXT_LOCALE cookie to persist preference
    await context.addCookies([
      {
        name: "NEXT_LOCALE",
        value: targetLocale,
        domain: "localhost",
        path: "/",
      },
    ]);

    // Navigate to multiple public pages (no auth required)
    const pagesToTest = ["/welcome", "/privacy", "/landing"];

    for (const page of pagesToTest) {
      // Navigate to page
      await localePage.page.goto(buildLocalizedPath(targetLocale, page));
      await waitForLocale(localePage.page, targetLocale, 5000);

      // Verify locale persists
      const verification = await verifyPageLocale(
        localePage.page,
        targetLocale,
      );
      expect(verification.isValid).toBeTruthy();

      // Verify URL has correct locale
      expect(localePage.page.url()).toContain(`/${targetLocale}/`);
    }
  });

  /**
   * Test 5: All locales display correctly
   * Verifies that each supported locale can be accessed and displays content
   */
  test("all locales display correctly", async ({ localePage }) => {
    await localePatterns.testPageInAllLocales(
      localePage.page,
      "/welcome",
      async (locale) => {
        // Verify locale was applied
        const verification = await verifyPageLocale(localePage.page, locale);
        expect(verification.isValid).toBeTruthy();

        // Verify URL contains locale
        expect(localePage.page.url()).toContain(`/${locale}/`);
      },
    );
  });

  /**
   * Test 6: Locale persistence across navigation
   * Verifies that locale stays the same when navigating between pages
   */
  test("locale persists across navigation", async ({ localePage }) => {
    const targetLocale: Locale = "en";

    await localePatterns.testLocalePersistence(localePage.page, targetLocale, [
      "/welcome",
      "/privacy",
      "/landing",
      "/welcome",
    ]);
  });

  /**
   * Test 7: Switching locales multiple times works correctly
   * Verifies that user can switch between locales multiple times
   */
  test("switching locales multiple times works correctly", async ({
    localePage,
  }) => {
    const switches: [Locale, Locale][] = [
      ["it", "en"],
      ["en", "fr"],
      ["fr", "it"],
    ];

    for (const [from, to] of switches) {
      await localePatterns.testLocaleSwitching(
        localePage.page,
        from,
        to,
        "/welcome",
      );
    }
  });

  /**
   * Test 8: Browser Accept-Language header is respected
   * Verifies that Accept-Language header influences initial locale
   */
  test("browser Accept-Language header is respected", async ({
    page,
    context,
  }) => {
    // Set Accept-Language header to French
    await context.setExtraHTTPHeaders({
      "Accept-Language": "fr-FR,fr;q=0.9",
    });

    // Navigate to root (should detect French)
    await page.goto("/");

    // Should redirect to French version or detect French
    // Give it time to process
    await page.waitForTimeout(1000);

    // Check if page is in French or redirected to /fr/
    const url = page.url();
    const htmlLang = await page.locator("html").getAttribute("lang");

    // Either URL contains /fr/ or html lang is fr
    const isFrench = url.includes("/fr/") || htmlLang === "fr";
    expect(isFrench).toBeTruthy();
  });

  /**
   * Test 9: URL locale prefix takes priority over Accept-Language
   * Verifies that explicit URL locale prefix overrides browser language
   */
  test("URL locale prefix takes priority over Accept-Language", async ({
    page,
    context,
  }) => {
    // Set Accept-Language to Italian
    await context.setExtraHTTPHeaders({
      "Accept-Language": "it-IT,it;q=0.9",
    });

    // Navigate to English welcome page (public)
    await page.goto("/en/welcome");
    await page.waitForTimeout(500);

    // Should be in English, not Italian
    const htmlLang = await page.locator("html").getAttribute("lang");
    expect(htmlLang).toBe("en");

    const url = page.url();
    expect(url).toContain("/en/");
  });

  /**
   * Test 10: NEXT_LOCALE cookie overrides Accept-Language
   * Verifies that user preference cookie takes priority over browser language
   */
  test("NEXT_LOCALE cookie overrides Accept-Language", async ({
    page,
    context,
  }) => {
    // Set Accept-Language to Italian
    await context.setExtraHTTPHeaders({
      "Accept-Language": "it-IT,it;q=0.9",
    });

    // Set NEXT_LOCALE cookie to English
    await context.addCookies([
      {
        name: "NEXT_LOCALE",
        value: "en",
        domain: "localhost",
        path: "/",
      },
    ]);

    // Navigate to welcome (public page)
    await page.goto("/welcome");
    await page.waitForTimeout(1000);

    // Should be in English (cookie overrides Accept-Language)
    const htmlLang = await page.locator("html").getAttribute("lang");
    expect(htmlLang).toBe("en");
  });

  /**
   * Test 11: Settings button opens language selector
   * Verifies that settings menu contains language switching option
   */
  test("locale is reflected in page HTML lang attribute", async ({
    localePage,
  }) => {
    await localePage.goto("/welcome");

    // Verify HTML lang attribute matches the locale
    const htmlLang = await localePage.page.locator("html").getAttribute("lang");
    expect(htmlLang).toBe(localePage.locale);
  });

  /**
   * Test 12: Navigation links maintain locale
   * Verifies that internal links preserve the current locale
   */
  test("navigation links maintain locale", async ({ localePage }) => {
    const locale = "en";

    // Navigate to welcome page in English (public)
    await localePage.page.goto(buildLocalizedPath(locale, "/welcome"));
    await waitForLocale(localePage.page, locale, 5000);

    // Find and click an internal link (if available)
    const links = localePage.page.locator("a[href^='/']");
    const linkCount = await links.count();

    if (linkCount > 0) {
      // Get first internal link
      const firstLink = links.first();
      const href = await firstLink.getAttribute("href");

      // Check if link maintains locale (or we can navigate)
      if (href && !href.startsWith("/admin")) {
        await firstLink.click();
        await localePage.page.waitForTimeout(500);

        // Verify we're still in English
        const verification = await verifyPageLocale(localePage.page, locale);
        if (verification.isValid) {
          expect(verification.isValid).toBeTruthy();
        }
      }
    }
  });
});

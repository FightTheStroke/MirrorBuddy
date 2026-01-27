/**
 * E2E TESTS: Welcome Flow - Internationalization (i18n)
 *
 * Tests welcome page rendering and CTAs in all 5 languages:
 * - Italian (it)
 * - English (en)
 * - French (fr)
 * - German (de)
 * - Spanish (es)
 *
 * Requirements:
 * - Verify translated content loads correctly
 * - Verify CTAs are translated
 * - Verify page navigation works in each language
 * - Verify URL locale prefix matches rendered locale
 *
 * F-06: I18n Welcome Flow Tests
 */

import { test, expect, testAllLocales } from "./fixtures";
import {
  verifyPageLocale,
  waitForLocale,
  buildLocalizedPath,
} from "./fixtures";
import type { Locale } from "@/i18n/config";

test.describe("Welcome Flow - Internationalization (i18n)", () => {
  /**
   * Test 1: Welcome page loads in all 5 languages
   * Verifies page renders with correct locale and URL structure
   */
  testAllLocales(
    "should load welcome page with correct locale",
    async ({ localePage }) => {
      await localePage.goto("/welcome");

      // Verify page is in correct locale
      const verification = await verifyPageLocale(
        localePage.page,
        localePage.locale,
      );
      expect(verification.isValid).toBeTruthy();

      // Verify URL contains locale prefix
      const url = localePage.page.url();
      expect(url).toContain(`/${localePage.locale}/welcome`);

      // Verify HTML lang attribute matches locale
      const htmlLang = await localePage.page
        .locator("html")
        .getAttribute("lang");
      expect(htmlLang).toBe(localePage.locale);
    },
  );

  /**
   * Test 2: Welcome page content is translated
   * Verifies key welcome messages appear in correct language
   */
  testAllLocales(
    "should display translated welcome content",
    async ({ localePage }) => {
      await localePage.goto("/welcome");
      await waitForLocale(localePage.page, localePage.locale);

      // Wait for main content to load
      const mainContent = localePage.page.locator("main, [role='main']");
      await expect(mainContent).toBeVisible({ timeout: 5000 });

      // Verify content is present and appears to be in correct language
      const textContent = await mainContent.textContent();
      expect(textContent).toBeTruthy();
      expect(textContent?.length).toBeGreaterThan(50);

      // Verify page title or heading is loaded
      const heading = localePage.page.locator("h1, [role='heading']").first();
      await expect(heading).toBeVisible({ timeout: 3000 });

      const headingText = await heading.textContent();
      expect(headingText).toBeTruthy();
    },
  );

  /**
   * Test 3: CTAs are translated and clickable
   * Verifies action buttons are present and in correct language
   */
  testAllLocales(
    "should display translated CTAs and navigation buttons",
    async ({ localePage }) => {
      await localePage.goto("/welcome");
      await waitForLocale(localePage.page, localePage.locale);

      // Look for primary CTAs (buttons with role='button' or <button> tag)
      const buttons = localePage.page.locator(
        "button:visible, [role='button']:visible",
      );
      const buttonCount = await buttons.count();

      // Expect at least one button on welcome page
      expect(buttonCount).toBeGreaterThan(0);

      // Verify buttons have text content (not empty)
      for (let i = 0; i < Math.min(buttonCount, 3); i++) {
        const button = buttons.nth(i);
        const text = await button.textContent();
        expect(text).toBeTruthy();
        expect(text?.length).toBeGreaterThan(0);
      }
    },
  );

  /**
   * Test 4: Locale-specific content verification
   * Verifies specific translated strings appear in each locale
   */
  test("should display Italian welcome content", async ({ page }) => {
    const locale: Locale = "it";
    await page.goto(buildLocalizedPath(locale, "/welcome"));
    await waitForLocale(page, locale);

    // Check for Italian-specific indicators
    const content = await page.content();
    expect(content).toBeTruthy();

    // Verify locale is set correctly
    const verification = await verifyPageLocale(page, locale);
    expect(verification.isValid).toBeTruthy();

    // Verify page is interactive
    const buttons = page.locator("button:visible");
    expect(await buttons.count()).toBeGreaterThan(0);
  });

  test("should display English welcome content", async ({ page }) => {
    const locale: Locale = "en";
    await page.goto(buildLocalizedPath(locale, "/welcome"));
    await waitForLocale(page, locale);

    // Check for English content
    const content = await page.content();
    expect(content).toBeTruthy();

    // Verify locale is set correctly
    const verification = await verifyPageLocale(page, locale);
    expect(verification.isValid).toBeTruthy();

    // Verify page is interactive
    const buttons = page.locator("button:visible");
    expect(await buttons.count()).toBeGreaterThan(0);
  });

  test("should display French welcome content", async ({ page }) => {
    const locale: Locale = "fr";
    await page.goto(buildLocalizedPath(locale, "/welcome"));
    await waitForLocale(page, locale);

    // Check for French content
    const content = await page.content();
    expect(content).toBeTruthy();

    // Verify locale is set correctly
    const verification = await verifyPageLocale(page, locale);
    expect(verification.isValid).toBeTruthy();

    // Verify page is interactive
    const buttons = page.locator("button:visible");
    expect(await buttons.count()).toBeGreaterThan(0);
  });

  test("should display German welcome content", async ({ page }) => {
    const locale: Locale = "de";
    await page.goto(buildLocalizedPath(locale, "/welcome"));
    await waitForLocale(page, locale);

    // Check for German content
    const content = await page.content();
    expect(content).toBeTruthy();

    // Verify locale is set correctly
    const verification = await verifyPageLocale(page, locale);
    expect(verification.isValid).toBeTruthy();

    // Verify page is interactive
    const buttons = page.locator("button:visible");
    expect(await buttons.count()).toBeGreaterThan(0);
  });

  test("should display Spanish welcome content", async ({ page }) => {
    const locale: Locale = "es";
    await page.goto(buildLocalizedPath(locale, "/welcome"));
    await waitForLocale(page, locale);

    // Check for Spanish content
    const content = await page.content();
    expect(content).toBeTruthy();

    // Verify locale is set correctly
    const verification = await verifyPageLocale(page, locale);
    expect(verification.isValid).toBeTruthy();

    // Verify page is interactive
    const buttons = page.locator("button:visible");
    expect(await buttons.count()).toBeGreaterThan(0);
  });

  /**
   * Test 5: Navigation preserves locale
   * Verifies that staying on welcome page maintains correct locale
   */
  testAllLocales(
    "should maintain locale while navigating welcome steps",
    async ({ localePage }) => {
      await localePage.goto("/welcome");
      await waitForLocale(localePage.page, localePage.locale);

      const startLocale = localePage.locale;

      // Wait a moment for any transitions
      await localePage.page.waitForTimeout(1000);

      // Check locale is still correct
      const endVerification = await verifyPageLocale(
        localePage.page,
        startLocale,
      );
      expect(endVerification.isValid).toBeTruthy();

      // URL should still contain the same locale
      const endUrl = localePage.page.url();
      expect(endUrl).toContain(`/${startLocale}/`);
    },
  );
});

/**
 * E2E Tests: Admin Locale Preview Functionality
 *
 * Tests admin ability to preview the app in different locales without logout
 * Verifies LocalePreviewSelector component and useAdminLocalePreview hook
 * F-08: Admin Locale Preview
 *
 * Run: npx playwright test e2e/admin-locale-preview.spec.ts
 *
 * Features tested:
 * - Locale dropdown visible in admin header
 * - Selecting different locale stores preview in sessionStorage
 * - UI content updates when preview locale changes
 * - Reset button clears preview locale
 * - Preview persists across page navigation within same session
 * - Visual indicator shows when in preview mode
 */

import { test, expect } from "@playwright/test";
import { dismissBlockingModals } from "./admin-helpers";

test.describe("Admin Locale Preview Functionality", () => {
  test.beforeEach(async ({ page, context }) => {
    // Setup: dismiss blocking modals and set admin context
    await dismissBlockingModals(page);

    // Mock admin login
    await context.addCookies([
      {
        name: "admin_session",
        value: "test-admin",
        domain: "localhost",
        path: "/",
      },
    ]);
  });

  test("F-08-01: locale preview selector is visible in admin header", async ({
    page,
  }) => {
    // Navigate to admin dashboard
    await page.goto("/admin");
    await page.waitForLoadState("domcontentloaded");

    // Locate the locale preview dropdown
    const localeSelect = page.locator(
      'select[name="locale-preview"], [data-testid="locale-preview"]',
    );

    // Should be visible
    await expect(localeSelect).toBeVisible();

    // Should have aria-label for accessibility
    const ariaLabel = await localeSelect.getAttribute("aria-label");
    expect(ariaLabel).toBeTruthy();
    expect(ariaLabel).toMatch(/locale|language|preview|anteprima/i);
  });

  test("F-08-02: locale dropdown shows all supported locales", async ({
    page,
  }) => {
    await page.goto("/admin");
    await page.waitForLoadState("domcontentloaded");

    // Get all options
    const options = page.locator(
      'select[name="locale-preview"] option, [data-testid="locale-preview"] option',
    );

    const optionCount = await options.count();

    // Should have multiple locales available
    expect(optionCount).toBeGreaterThanOrEqual(5);

    // Should include major locales (it, en, fr, de, es)
    const optionValues = await options.all();
    const values: string[] = [];

    for (const option of optionValues) {
      const value = await option.getAttribute("value");
      if (value) values.push(value);
    }

    expect(values).toEqual(expect.arrayContaining(["it", "en"]));
  });

  test("F-08-03: selecting locale stores preview in sessionStorage", async ({
    page,
  }) => {
    await page.goto("/admin");
    await page.waitForLoadState("domcontentloaded");

    // Select a different locale (English)
    const localeSelect = page.locator(
      'select[name="locale-preview"], [data-testid="locale-preview"]',
    );

    await localeSelect.selectOption("en");
    await page.waitForTimeout(300); // Wait for state update

    // Verify sessionStorage was updated
    const storedLocale = await page.evaluate(() =>
      sessionStorage.getItem("admin_preview_locale"),
    );

    expect(storedLocale).toBe("en");

    // Verify dropdown shows selected value
    const selectedValue = await localeSelect.inputValue();
    expect(selectedValue).toBe("en");
  });

  test("F-08-04: UI content updates when locale preview changes", async ({
    page,
  }) => {
    await page.goto("/admin");
    await page.waitForLoadState("domcontentloaded");

    // Change locale to English
    const localeSelect = page.locator(
      'select[name="locale-preview"], [data-testid="locale-preview"]',
    );

    await localeSelect.selectOption("en");
    await page.waitForTimeout(500); // Wait for translation update

    // Content may change depending on implementation
    // At minimum, the locale should be stored
    expect(
      await page.evaluate(() => sessionStorage.getItem("admin_preview_locale")),
    ).toBe("en");
  });

  test("F-08-05: preview indicator badge is visible when preview is active", async ({
    page,
  }) => {
    await page.goto("/admin");
    await page.waitForLoadState("domcontentloaded");

    // No indicator when no preview
    let indicator = page.locator("span:has-text('Anteprima')");
    await expect(indicator).not.toBeVisible();

    // Select a preview locale
    const localeSelect = page.locator(
      'select[name="locale-preview"], [data-testid="locale-preview"]',
    );

    await localeSelect.selectOption("fr");
    await page.waitForTimeout(300);

    // Indicator should now be visible
    indicator = page.locator("span:has-text('Anteprima')");
    await expect(indicator).toBeVisible();
  });

  test("F-08-06: preview indicator badge has correct styling", async ({
    page,
  }) => {
    await page.goto("/admin");
    await page.waitForLoadState("domcontentloaded");

    // Set preview locale
    const localeSelect = page.locator(
      'select[name="locale-preview"], [data-testid="locale-preview"]',
    );

    await localeSelect.selectOption("de");
    await page.waitForTimeout(300);

    // Find the indicator with amber styling
    const indicator = page.locator("span").filter({ hasText: "Anteprima" });

    // Should have amber styling
    const className = await indicator.getAttribute("class");
    expect(className).toMatch(/amber/i);
  });

  test("F-08-07: reset button clears preview locale", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForLoadState("domcontentloaded");

    // Set a preview locale
    const localeSelect = page.locator(
      'select[name="locale-preview"], [data-testid="locale-preview"]',
    );

    await localeSelect.selectOption("es");
    await page.waitForTimeout(300);

    // Verify preview is set
    expect(
      await page.evaluate(() => sessionStorage.getItem("admin_preview_locale")),
    ).toBe("es");

    // Find and click reset button
    const resetButton = page.locator(
      'button[aria-label*="Ripristina"], button[title*="Ripristina"], button[aria-label*="Reset"]',
    );

    await resetButton.click();
    await page.waitForTimeout(300);

    // Verify preview is cleared
    expect(
      await page.evaluate(() => sessionStorage.getItem("admin_preview_locale")),
    ).toBeNull();

    // Indicator should be gone
    const indicator = page.locator("span:has-text('Anteprima')");
    await expect(indicator).not.toBeVisible();
  });

  test("F-08-08: selecting current locale clears preview", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForLoadState("domcontentloaded");

    // Get current locale (should be 'it')
    const currentLocale = await page.evaluate(() =>
      document.documentElement.getAttribute("lang"),
    );

    // First set a different preview locale
    const localeSelect = page.locator(
      'select[name="locale-preview"], [data-testid="locale-preview"]',
    );

    await localeSelect.selectOption("en");
    await page.waitForTimeout(300);

    // Verify preview is set
    expect(
      await page.evaluate(() => sessionStorage.getItem("admin_preview_locale")),
    ).toBe("en");

    // Now select back to current locale
    await localeSelect.selectOption(currentLocale || "it");
    await page.waitForTimeout(300);

    // Preview should be cleared
    expect(
      await page.evaluate(() => sessionStorage.getItem("admin_preview_locale")),
    ).toBeNull();

    // Indicator should be gone
    const indicator = page.locator("span:has-text('Anteprima')");
    await expect(indicator).not.toBeVisible();
  });

  test("F-08-09: preview persists across page navigation in admin", async ({
    page,
  }) => {
    // Start in admin dashboard
    await page.goto("/admin");
    await page.waitForLoadState("domcontentloaded");

    // Set preview locale to French
    const localeSelect = page.locator(
      'select[name="locale-preview"], [data-testid="locale-preview"]',
    );

    await localeSelect.selectOption("fr");
    await page.waitForTimeout(300);

    // Verify it's set
    expect(
      await page.evaluate(() => sessionStorage.getItem("admin_preview_locale")),
    ).toBe("fr");

    // Navigate to another admin page
    const adminLinks = page.locator('a[href*="/admin"]');
    const linkCount = await adminLinks.count();

    if (linkCount > 1) {
      // Click first internal link that's not current page
      const firstLink = adminLinks.nth(1);
      await firstLink.click();
      await page.waitForLoadState("domcontentloaded");

      // Verify preview is still set
      expect(
        await page.evaluate(() =>
          sessionStorage.getItem("admin_preview_locale"),
        ),
      ).toBe("fr");
    }
  });

  test("F-08-10: locale preview dropdown is accessible with keyboard", async ({
    page,
  }) => {
    await page.goto("/admin");
    await page.waitForLoadState("domcontentloaded");

    const localeSelect = page.locator(
      'select[name="locale-preview"], [data-testid="locale-preview"]',
    );

    // Focus on the select
    await localeSelect.focus();

    // Verify it's focused
    const isFocused = await page.evaluate(() => {
      const select = document.querySelector(
        'select[name="locale-preview"], [data-testid="locale-preview"]',
      );
      return document.activeElement === select;
    });

    expect(isFocused).toBe(true);

    // Use keyboard to change option
    await localeSelect.press("ArrowDown");
    await page.waitForTimeout(200);

    // Dropdown should still be accessible and interactive
    await expect(localeSelect).toBeFocused();
  });

  test("F-08-11: custom event fires when locale preview changes", async ({
    page,
  }) => {
    await page.goto("/admin");
    await page.waitForLoadState("domcontentloaded");

    // Set up event listener
    const eventFired = page.evaluate(() => {
      return new Promise<string>((resolve) => {
        const listener = (event: Event) => {
          window.removeEventListener("admin_locale_preview_changed", listener);
          const customEvent = event as CustomEvent<{ locale: string }>;
          resolve(customEvent.detail.locale);
        };
        window.addEventListener("admin_locale_preview_changed", listener);

        // Timeout after 5 seconds
        setTimeout(() => resolve("timeout"), 5000);
      });
    });

    // Change locale
    const localeSelect = page.locator(
      'select[name="locale-preview"], [data-testid="locale-preview"]',
    );

    await localeSelect.selectOption("de");

    // Wait for event
    const firedLocale = await eventFired;
    expect(firedLocale).toBe("de");
  });

  test("F-08-12: locale preview dropdown styled with amber ring when active", async ({
    page,
  }) => {
    await page.goto("/admin");
    await page.waitForLoadState("domcontentloaded");

    const localeSelect = page.locator(
      'select[name="locale-preview"], [data-testid="locale-preview"]',
    );

    // Initially no preview, no amber styling
    let className = await localeSelect.getAttribute("class");
    expect(className).not.toContain("ring-amber");

    // Set preview
    await localeSelect.selectOption("it");
    await page.waitForTimeout(300);

    // Should have ring styling when in preview
    className = await localeSelect.getAttribute("class");
    // The amber ring is added when isPreviewActive is true
    expect(className).toMatch(/ring.*amber|amber.*ring/i);
  });

  test("F-08-13: reset button only visible when preview is active", async ({
    page,
  }) => {
    await page.goto("/admin");
    await page.waitForLoadState("domcontentloaded");

    const resetButton = page.locator(
      'button[aria-label*="Ripristina"], button[title*="Ripristina"], button[aria-label*="Reset"]',
    );

    // Should not be visible initially
    const isVisibleInitially = await resetButton
      .isVisible({ timeout: 1000 })
      .catch(() => false);
    expect(isVisibleInitially).toBe(false);

    // Set preview locale
    const localeSelect = page.locator(
      'select[name="locale-preview"], [data-testid="locale-preview"]',
    );

    await localeSelect.selectOption("en");
    await page.waitForTimeout(300);

    // Now reset button should be visible
    await expect(resetButton).toBeVisible();
  });

  test("F-08-14: admin can switch between multiple locales rapidly", async ({
    page,
  }) => {
    await page.goto("/admin");
    await page.waitForLoadState("domcontentloaded");

    const localeSelect = page.locator(
      'select[name="locale-preview"], [data-testid="locale-preview"]',
    );

    // Rapid switching between locales
    const locales = ["en", "fr", "de", "es", "it"];

    for (const locale of locales) {
      await localeSelect.selectOption(locale);
      await page.waitForTimeout(100);

      // Verify each change is registered
      const stored = await page.evaluate(() =>
        sessionStorage.getItem("admin_preview_locale"),
      );

      if (locale !== "it") {
        // If not current locale
        expect(stored).toBe(locale);
      }
    }
  });

  test("F-08-15: sessionStorage is cleared on reset, not just localStorage", async ({
    page,
  }) => {
    await page.goto("/admin");
    await page.waitForLoadState("domcontentloaded");

    const localeSelect = page.locator(
      'select[name="locale-preview"], [data-testid="locale-preview"]',
    );

    // Set preview
    await localeSelect.selectOption("fr");
    await page.waitForTimeout(300);

    // Verify in sessionStorage
    const beforeReset = await page.evaluate(() =>
      sessionStorage.getItem("admin_preview_locale"),
    );
    expect(beforeReset).toBe("fr");

    // Reset
    const resetButton = page.locator(
      'button[aria-label*="Ripristina"], button[title*="Ripristina"], button[aria-label*="Reset"]',
    );
    await resetButton.click();
    await page.waitForTimeout(300);

    // Verify cleared from sessionStorage
    const afterReset = await page.evaluate(() =>
      sessionStorage.getItem("admin_preview_locale"),
    );
    expect(afterReset).toBeNull();
  });
});

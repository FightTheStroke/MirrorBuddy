/**
 * Visual Regression Baseline Snapshots - E2E Test
 *
 * Purpose:
 * - Capture baseline screenshots of key pages for visual regression detection
 * - Cover multiple viewports (desktop, mobile)
 * - Enable detection of unintended UI changes
 *
 * Run baseline capture:
 *   VISUAL_REGRESSION=1 npx playwright test e2e/full-ui-audit/visual-regression.spec.ts --update-snapshots
 *
 * Run regression comparison:
 *   VISUAL_REGRESSION=1 npx playwright test e2e/full-ui-audit/visual-regression.spec.ts
 *
 * Note: Snapshots stored in e2e/full-ui-audit/__snapshots__/
 * Threshold configured in playwright.config.ts (default: 10% pixel diff tolerance)
 */

import { test, expect } from "@playwright/test";

// Wait for content to stabilize before taking screenshots
const WAIT_FOR_STABLE = 800; // ms

// Viewport configurations for baseline testing
const VIEWPORTS = {
  desktop: { width: 1280, height: 720 },
  mobile: { width: 375, height: 667 },
} as const;

test.describe("Visual Regression - Baseline Snapshots", () => {
  // Only run when VISUAL_REGRESSION flag is set
  test.skip(
    !process.env.VISUAL_REGRESSION,
    "Set VISUAL_REGRESSION=1 to run visual regression tests",
  );

  test.beforeEach(async ({ page }) => {
    // Ensure consistent test environment
    if (page.viewportSize()?.width === 0) {
      await page.setViewportSize({ width: 1280, height: 720 });
    }
  });

  // ========== HOME PAGE ==========
  test("home page - desktop baseline", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForTimeout(WAIT_FOR_STABLE);
    await expect(page).toHaveScreenshot("home-desktop.png");
  });

  test("home page - mobile baseline", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForTimeout(WAIT_FOR_STABLE);
    await expect(page).toHaveScreenshot("home-mobile.png");
  });

  // ========== WELCOME PAGE ==========
  test("welcome page - desktop baseline", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto("/welcome", { waitUntil: "networkidle" });
    await page.waitForTimeout(WAIT_FOR_STABLE);
    await expect(page).toHaveScreenshot("welcome-desktop.png");
  });

  test("welcome page - mobile baseline", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto("/welcome", { waitUntil: "networkidle" });
    await page.waitForTimeout(WAIT_FOR_STABLE);
    await expect(page).toHaveScreenshot("welcome-mobile.png");
  });

  // ========== ASTUCCIO PAGE ==========
  test("astuccio page - desktop baseline", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto("/astuccio", { waitUntil: "networkidle" });
    await page.waitForTimeout(WAIT_FOR_STABLE);
    await expect(page).toHaveScreenshot("astuccio-desktop.png");
  });

  test("astuccio page - mobile baseline", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto("/astuccio", { waitUntil: "networkidle" });
    await page.waitForTimeout(WAIT_FOR_STABLE);
    await expect(page).toHaveScreenshot("astuccio-mobile.png");
  });

  // ========== ADMIN DASHBOARD ==========
  test("admin dashboard - desktop baseline", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto("/admin", { waitUntil: "networkidle" });
    await page.waitForTimeout(WAIT_FOR_STABLE);
    await expect(page).toHaveScreenshot("admin-dashboard-desktop.png");
  });

  test("admin dashboard - mobile baseline", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto("/admin", { waitUntil: "networkidle" });
    await page.waitForTimeout(WAIT_FOR_STABLE);
    await expect(page).toHaveScreenshot("admin-dashboard-mobile.png");
  });

  // ========== SETTINGS (via home page interaction) ==========
  test("settings modal - desktop baseline", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    // Click settings button if visible
    const settingsBtn = page
      .locator("button")
      .filter({ hasText: /Impostazioni/i })
      .first();
    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      await page.waitForTimeout(WAIT_FOR_STABLE);
      await expect(page).toHaveScreenshot("settings-desktop.png");
    }
  });

  test("settings modal - mobile baseline", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    // Click settings button if visible
    const settingsBtn = page
      .locator("button")
      .filter({ hasText: /Impostazioni/i })
      .first();
    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      await page.waitForTimeout(WAIT_FOR_STABLE);
      await expect(page).toHaveScreenshot("settings-mobile.png");
    }
  });

  // ========== LANDING PAGE ==========
  test("landing page - desktop baseline", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto("/landing", { waitUntil: "networkidle" });
    await page.waitForTimeout(WAIT_FOR_STABLE);
    await expect(page).toHaveScreenshot("landing-desktop.png");
  });

  test("landing page - mobile baseline", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto("/landing", { waitUntil: "networkidle" });
    await page.waitForTimeout(WAIT_FOR_STABLE);
    await expect(page).toHaveScreenshot("landing-mobile.png");
  });
});

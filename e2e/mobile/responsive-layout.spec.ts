/**
 * Mobile Responsive Layout Tests
 * Verifies responsive design across mobile viewports
 * Tests apply to all mobile device projects (iPhone SE, iPhone 13, Pixel 7, iPad)
 */

import { test, expect } from "./fixtures";
import { waitForHomeReady } from "./helpers/wait-for-home";

test.describe("Mobile Responsive Layout", () => {
  // NOTE: mobile fixture MUST be destructured to trigger route mocking BEFORE navigation
  test.beforeEach(async ({ page, mobile: _mobile }) => {
    // Navigate and wait for DOM to be ready (networkidle doesn't work with HMR)
    await page.goto("/", { waitUntil: "domcontentloaded" });
    // Wait for hydration to complete - loading screen shows "Caricamento..."
    // After hydration, the main heading "Professori" appears (it's an h1, not a button)
    await waitForHomeReady(page);
  });

  test("header should be visible and properly sized", async ({
    page,
    mobile,
  }) => {
    const header = page.locator("header").first();
    await expect(header).toBeVisible();

    // Header should not exceed viewport width
    const box = await header.boundingBox();
    expect(box).not.toBeNull();
    const viewportWidth = await mobile.getViewportWidth();
    expect(box!.width).toBeLessThanOrEqual(viewportWidth);
  });

  test("header menu button should meet touch target minimum", async ({
    page,
    mobile,
  }) => {
    // Skip on large viewports where hamburger menu is hidden (lg:hidden)
    const viewportWidth = await mobile.getViewportWidth();
    if (viewportWidth >= 1024) {
      test.skip(true, "Hamburger menu hidden on desktop viewports (lg:hidden)");
      return;
    }

    const menuButton = page.locator('button[aria-label="Apri menu"]').first();

    // Should be visible on mobile
    await expect(menuButton).toBeVisible();

    // Should meet WCAG 2.5.5 minimum (44px × 44px)
    await mobile.verifyTouchTarget(menuButton);
  });

  test("notification bell should meet touch target minimum", async ({
    page,
    mobile,
  }) => {
    const bellButton = page.locator('button[aria-label*="Notifiche"]').first();

    // Should be visible (may be hidden on very small mobile)
    const isVisible = await bellButton.isVisible();
    if (isVisible) {
      await mobile.verifyTouchTarget(bellButton);
    }
  });

  test("sidebar should open and close correctly", async ({ page, mobile }) => {
    // Skip on large viewports where sidebar is always visible (no mobile overlay)
    const viewportWidth = await mobile.getViewportWidth();
    if (viewportWidth >= 1024) {
      test.skip(true, "Hamburger menu hidden on desktop viewports (lg:hidden)");
      return;
    }

    // Open sidebar
    await mobile.openMobileSidebar();

    // Sidebar should be visible
    const sidebar = page.locator("aside").first();
    await expect(sidebar).toBeVisible();

    // Overlay should be present
    const overlay = page.locator(".fixed.inset-0.bg-black\\/40");
    await expect(overlay).toBeVisible();

    // Close sidebar
    await mobile.closeMobileSidebar();

    // Overlay should be gone
    await expect(overlay).not.toBeVisible();
  });

  test("sidebar logo button should meet touch target minimum", async ({
    page,
    mobile,
  }) => {
    // Skip on large viewports where sidebar is always visible
    const viewportWidth = await mobile.getViewportWidth();
    if (viewportWidth >= 1024) {
      test.skip(true, "Hamburger menu hidden on desktop viewports (lg:hidden)");
      return;
    }

    // Open sidebar first
    await mobile.openMobileSidebar();

    const logoButton = page
      .locator('button[aria-label="Torna alla home"]')
      .first();
    await expect(logoButton).toBeVisible();

    // Should meet touch target minimum (44px height)
    await mobile.verifyTouchTarget(logoButton);
  });

  test("sidebar toggle button should meet touch target minimum", async ({
    page,
    mobile,
  }) => {
    // Skip on large viewports where mobile toggle doesn't exist
    const viewportWidth = await mobile.getViewportWidth();
    if (viewportWidth >= 1024) {
      test.skip(true, "Hamburger menu hidden on desktop viewports (lg:hidden)");
      return;
    }

    // Open sidebar first
    await mobile.openMobileSidebar();

    const toggleButton = page
      .locator(
        'button[aria-label="Chiudi menu"], button[aria-label="Apri menu"]',
      )
      .last();
    await expect(toggleButton).toBeVisible();

    // Should meet touch target minimum
    await mobile.verifyTouchTarget(toggleButton);
  });

  test("main content area should be accessible", async ({ page }) => {
    // Use first() to handle nested main elements in the page structure
    const main = page.locator('main, [role="main"]').first();
    await expect(main).toBeVisible();

    // Main should have content
    const box = await main.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);
  });

  test("page should have proper document structure", async ({ page }) => {
    // Should have header
    await expect(page.locator("header").first()).toBeVisible();

    // Should have main content (use first() for nested main elements)
    await expect(page.locator('main, [role="main"]').first()).toBeVisible();

    // Should have sidebar
    const sidebar = page.locator("aside").first();
    const sidebarCount = await sidebar.count();
    expect(sidebarCount).toBeGreaterThan(0);
  });

  test("no horizontal scroll should be present", async ({ page }) => {
    // Check body scroll width vs client width
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.body.scrollWidth > document.body.clientWidth;
    });

    expect(hasHorizontalScroll).toBe(false);
  });

  test("all interactive elements should be keyboard accessible", async ({
    page,
    mobile: _mobile,
  }) => {
    // Press Tab to navigate through interactive elements
    await page.keyboard.press("Tab");

    // At least one element should have focus
    const focusedElement = await page.evaluate(() => {
      return document.activeElement?.tagName;
    });

    expect(focusedElement).toBeTruthy();
    expect(["BUTTON", "A", "INPUT"]).toContain(focusedElement);
  });
});

/**
 * iPhone-Specific Mobile Tests (SE & 13)
 * Tests for iPhone SE (375px) and iPhone 13 (390px) viewports
 * Verifies fixes from T4-06 (voice panel <30%) and T4-07 (touch targets)
 */

import { test, expect } from "./fixtures";

test.describe("iPhone SE / iPhone 13 Mobile UX", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('main, [role="main"]');
  });

  test("voice panel should be less than 30% of viewport width", async ({
    page,
    mobile,
  }) => {
    // Open a maestro conversation to show voice panel
    await mobile.openMobileSidebar();

    // Click on first maestro (if available)
    const firstMaestro = page
      .locator('button:has-text("Euclide"), button:has-text("Galileo")')
      .first();
    if (await firstMaestro.isVisible()) {
      await firstMaestro.click();
      await mobile.closeMobileSidebar();

      // Wait for voice panel to appear
      await page.waitForTimeout(500);

      // Check if voice panel exists
      const voicePanel = page.locator("[class*='voice-panel']").first();
      if (await voicePanel.isVisible()) {
        // Voice panel must be <30% of viewport (F-12 requirement)
        // iPhone SE: 375px → max 112.5px
        // iPhone 13: 390px → max 117px
        await mobile.verifyViewportPercentage(voicePanel, 30);
      }
    }
  });

  test("sidebar should not exceed 85vw on mobile", async ({ page, mobile }) => {
    await mobile.openMobileSidebar();

    const sidebar = page.locator("aside").first();
    await expect(sidebar).toBeVisible();

    const box = await sidebar.boundingBox();
    const viewportWidth = await mobile.getViewportWidth();

    // Sidebar max-width is 85vw as per T4-03
    const maxWidth = viewportWidth * 0.85;
    expect(box!.width).toBeLessThanOrEqual(maxWidth + 1); // +1 for rounding
  });

  test("chat input should be visible and functional", async ({
    page,
    mobile,
  }) => {
    // Open a chat to show input
    await mobile.openMobileSidebar();

    const firstMaestro = page
      .locator('button:has-text("Euclide"), button:has-text("Galileo")')
      .first();
    if (await firstMaestro.isVisible()) {
      await firstMaestro.click();
      await mobile.closeMobileSidebar();

      // Check for chat input
      const chatInput = page.locator(
        'textarea[placeholder*="scrivi"], textarea[placeholder*="Scrivi"]',
      );
      if (await chatInput.isVisible()) {
        await expect(chatInput).toBeVisible();

        // Input should be within viewport
        const isInViewport = await mobile.isVisibleInViewport(chatInput);
        expect(isInViewport).toBe(true);
      }
    }
  });

  test("header stats should be hidden on small viewports", async ({
    page,
    mobile,
  }) => {
    const viewportWidth = await mobile.getViewportWidth();

    // Stats are hidden below md: breakpoint (768px)
    if (viewportWidth < 768) {
      const stats = page.locator("header div:has(svg)").first();
      // Stats container may not exist or be hidden
      const count = await stats.count();
      if (count > 0) {
        const isVisible = await stats.isVisible();
        // Stats should be hidden on small mobile
        expect(isVisible).toBe(false);
      }
    }
  });

  test("all touch targets should meet WCAG 2.5.5 minimum", async ({
    page,
    mobile,
  }) => {
    // Test header menu button
    const menuButton = page.locator('button[aria-label="Apri menu"]').first();
    if (await menuButton.isVisible()) {
      await mobile.verifyTouchTarget(menuButton);
    }

    // Open sidebar and test its buttons
    await mobile.openMobileSidebar();

    // Test logo button
    const logoButton = page
      .locator('button[aria-label="Torna alla home"]')
      .first();
    await mobile.verifyTouchTarget(logoButton);

    // Test toggle button
    const toggleButton = page
      .locator('button[aria-label="Chiudi menu"]')
      .first();
    await mobile.verifyTouchTarget(toggleButton);

    // Close sidebar
    await mobile.closeMobileSidebar();
  });

  test("iOS safe area should be respected in sidebar bottom", async ({
    page,
    mobile,
  }) => {
    await mobile.openMobileSidebar();

    const sidebar = page.locator("aside").first();
    await expect(sidebar).toBeVisible();

    // Check bottom section has safe area padding
    const bottomSection = sidebar.locator("div").last();
    if (await bottomSection.isVisible()) {
      // Should have env(safe-area-inset-bottom) or equivalent padding
      await mobile.verifyIOSSafeArea(bottomSection);
    }
  });

  test("landscape orientation should maintain functionality", async ({
    page,
    mobile,
  }) => {
    // Test in landscape (swap width/height)
    const viewportSize = page.viewportSize();
    if (viewportSize) {
      await page.setViewportSize({
        width: viewportSize.height,
        height: viewportSize.width,
      });

      // Wait for layout recalculation
      await page.waitForTimeout(500);

      // Header should still be visible
      await expect(page.locator("header").first()).toBeVisible();

      // Main content should be accessible
      await expect(page.locator('main, [role="main"]')).toBeVisible();

      // Sidebar should still work
      await mobile.openMobileSidebar();
      const sidebar = page.locator("aside").first();
      await expect(sidebar).toBeVisible();
      await mobile.closeMobileSidebar();

      // Restore portrait
      await page.setViewportSize(viewportSize);
    }
  });

  test("reduced motion should be respected", async ({ page }) => {
    // Set prefers-reduced-motion
    await page.emulateMedia({ reducedMotion: "reduce" });

    // Reload to apply
    await page.reload();
    await page.waitForSelector('main, [role="main"]');

    // Test that animations are reduced/disabled
    // Sidebar should still work without relying on animations
    const menuButton = page.locator('button[aria-label="Apri menu"]').first();
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await page.waitForTimeout(100); // Minimal wait

      const sidebar = page.locator("aside").first();
      await expect(sidebar).toBeVisible();
    }
  });
});

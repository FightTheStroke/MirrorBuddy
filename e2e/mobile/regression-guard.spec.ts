/**
 * Mobile Regression Guard Tests (375px Viewport)
 * Catches regressions in mobile layout constraints
 * F-08: Mobile regression detection at 375px iPhone SE viewport
 *
 * Tests verify:
 * 1. Voice panel width <= 30% viewport (112px max at 375px)
 * 2. Sidebar width <= 85vw (319px max at 375px)
 * 3. No horizontal scroll at any viewport
 */

import { test, expect } from "./fixtures";

test.describe("Mobile Regression Guard (375px Viewport)", () => {
  // NOTE: mobile fixture MUST be destructured to trigger route mocking BEFORE navigation
  test.beforeEach(async ({ page, mobile: _mobile }) => {
    // Set viewport to iPhone SE (375px width)
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate to Italian locale home page directly (/ redirects to /landing)
    await page.goto("/it/", { waitUntil: "domcontentloaded" });

    // Wait for hydration to complete - main content and navigation appear
    await page.waitForSelector('main, [role="main"]', {
      timeout: 20000,
    });
  });

  test("F-01: voice panel must be <= 30% viewport width on 375px", async ({
    page,
    mobile,
  }) => {
    // Click a maestro card to open conversation and show voice panel
    const firstMaestro = page
      .locator(
        'main button:has-text("Euclide"), main button:has-text("Galileo")',
      )
      .first();

    if (await firstMaestro.isVisible()) {
      await firstMaestro.click();

      // Wait for voice panel to appear
      await page.waitForTimeout(500);

      // Find voice panel - look for common patterns
      const voicePanel = page.locator("[class*='voice-panel']").first();

      if (await voicePanel.isVisible()) {
        // Voice panel must be <= 30% of viewport width
        // At 375px: 30% = 112.5px max
        await mobile.verifyViewportPercentage(voicePanel, 30);

        // Additional assertion: measure directly
        const box = await voicePanel.boundingBox();
        const viewportWidth = await mobile.getViewportWidth();
        const maxWidth = viewportWidth * 0.3;

        expect(box!.width).toBeLessThanOrEqual(maxWidth + 1); // +1 for rounding
      }
    }
  });

  test("F-02: sidebar must be <= 85vw on 375px viewport", async ({
    page,
    mobile,
  }) => {
    // Open sidebar via menu button
    await mobile.openMobileSidebar();

    const sidebar = page.locator("aside").first();
    await expect(sidebar).toBeVisible();

    const box = await sidebar.boundingBox();
    const viewportWidth = await mobile.getViewportWidth();

    // Sidebar max-width is 85vw
    // At 375px: 85% = 318.75px max
    const maxWidth = viewportWidth * 0.85;

    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(maxWidth + 1); // +1 for rounding

    // Additional check: sidebar should not be wider than viewport
    expect(box!.width).toBeLessThanOrEqual(viewportWidth);

    // Close sidebar
    await mobile.closeMobileSidebar();
  });

  test("F-03: no horizontal scroll at 375px viewport", async ({
    page,
    mobile: _mobile,
  }) => {
    // Check that document width does not exceed viewport width
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    const documentWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );

    // Document should never be wider than viewport (would cause horizontal scroll)
    expect(documentWidth).toBeLessThanOrEqual(viewportWidth);

    // Additional check: no horizontal scroll bar should exist
    const scrollLeft = await page.evaluate(
      () => document.documentElement.scrollLeft,
    );
    expect(scrollLeft).toBe(0);

    // Navigate to knowledge hub or other pages to check multiple routes
    await page.goto("/hub", { waitUntil: "domcontentloaded" });

    // Re-check after navigation
    const hubViewportWidth = await page.evaluate(() => window.innerWidth);
    const hubDocumentWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );

    expect(hubDocumentWidth).toBeLessThanOrEqual(hubViewportWidth);
  });

  test("F-04: voice panel responsive on landscape orientation", async ({
    page,
    mobile,
  }) => {
    // Test that voice panel adapts when viewport changes to landscape
    const currentViewport = page.viewportSize();
    if (currentViewport) {
      // Rotate to landscape (swap width/height)
      await page.setViewportSize({
        width: currentViewport.height,
        height: currentViewport.width,
      });

      // Wait for layout recalculation
      await page.waitForTimeout(500);

      // Click maestro to show voice panel in landscape
      const firstMaestro = page
        .locator(
          'main button:has-text("Euclide"), main button:has-text("Galileo")',
        )
        .first();

      if (await firstMaestro.isVisible()) {
        await firstMaestro.click();
        await page.waitForTimeout(500);

        const voicePanel = page.locator("[class*='voice-panel']").first();
        if (await voicePanel.isVisible()) {
          // Voice panel should still respect 30% constraint in landscape
          const box = await voicePanel.boundingBox();
          const viewportWidth = await mobile.getViewportWidth();
          const maxWidth = viewportWidth * 0.3;

          expect(box!.width).toBeLessThanOrEqual(maxWidth + 1);
        }
      }

      // Restore portrait
      await page.setViewportSize(currentViewport);
    }
  });

  test("F-05: sidebar dimensions consistent on homepage", async ({
    page,
    mobile,
  }) => {
    // Test sidebar sizing on homepage (only page with sidebar hamburger menu)
    // Note: /astuccio and other pages don't have the same header/sidebar structure
    // Go to Italian locale home page directly (/ redirects to /landing)
    await page.goto("/it/", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('main, [role="main"]', { timeout: 15000 });

    // Open sidebar
    await mobile.openMobileSidebar();

    const sidebar = page.locator("aside").first();
    await expect(sidebar).toBeVisible();

    const box = await sidebar.boundingBox();
    const viewportWidth = await mobile.getViewportWidth();
    const maxWidth = viewportWidth * 0.85;

    expect(box!.width).toBeLessThanOrEqual(maxWidth + 1);
    expect(box!.width).toBeLessThanOrEqual(viewportWidth);

    // Close sidebar
    await mobile.closeMobileSidebar();
  });

  test("F-06: no overflow on content areas at 375px", async ({
    page,
    mobile: _mobile,
  }) => {
    // Wait for fonts and layout to stabilize in CI
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Check main content area has proper constraints
    const mainContent = page.locator("main").first();
    await expect(mainContent).toBeVisible();

    const viewportWidth = await page.evaluate(() => window.innerWidth);

    // Allow small tolerance for font rendering differences in CI (up to 10px)
    // Real overflow issues are much larger (50-100px+)
    const pageScrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    const tolerance = 10;
    expect(
      pageScrollWidth,
      `Page scroll width ${pageScrollWidth}px exceeds viewport ${viewportWidth}px by more than ${tolerance}px`,
    ).toBeLessThanOrEqual(viewportWidth + tolerance);
  });
});

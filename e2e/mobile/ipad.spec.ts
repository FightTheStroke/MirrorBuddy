/**
 * iPad Mobile Tests
 * Tests for iPad Mini viewport (768px × 1024px portrait, 1024px × 768px landscape)
 * Verifies tablet-specific responsive behavior
 */

import { test, expect } from "./fixtures";

test.describe("iPad Mini Responsive UX", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('main, [role="main"]');
  });

  test("sidebar should be persistent on tablet viewport", async ({
    page,
    mobile,
  }) => {
    const viewportWidth = await mobile.getViewportWidth();

    // On iPad (768px+), sidebar should be visible by default (lg: breakpoint 1024px)
    const sidebar = page.locator("aside").first();

    if (viewportWidth >= 1024) {
      // Desktop-like behavior: sidebar always visible
      await expect(sidebar).toBeVisible();

      // No overlay should be present
      const overlay = page.locator(".fixed.inset-0.bg-black\\/40");
      const overlayVisible = await overlay.isVisible();
      expect(overlayVisible).toBe(false);
    } else {
      // 768px-1023px: still mobile behavior
      // Sidebar hidden by default
      const sidebarVisible = await sidebar.isVisible();
      expect(sidebarVisible).toBe(false);

      // Can open with menu button
      await mobile.openMobileSidebar();
      await expect(sidebar).toBeVisible();
    }
  });

  test("voice panel should have appropriate width on tablet", async ({
    page,
    mobile,
  }) => {
    await mobile.openMobileSidebar();

    const firstMaestro = page
      .locator('button:has-text("Euclide"), button:has-text("Galileo")')
      .first();
    if (await firstMaestro.isVisible()) {
      await firstMaestro.click();

      // Close sidebar if in mobile mode
      const viewportWidth = await mobile.getViewportWidth();
      if (viewportWidth < 1024) {
        await mobile.closeMobileSidebar();
      }

      await page.waitForTimeout(500);

      const voicePanel = page.locator("[class*='voice-panel']").first();
      if (await voicePanel.isVisible()) {
        // On sm: breakpoint (640px+), voice panel uses w-64 (256px)
        // iPad portrait: 768px → 256px = 33.3% (above 30% is acceptable for tablet)
        // iPad landscape: 1024px → 256px = 25% ✅
        const box = await voicePanel.boundingBox();
        expect(box).not.toBeNull();

        // Voice panel should be visible but not dominate
        expect(box!.width).toBeGreaterThan(100);
        expect(box!.width).toBeLessThan(400);
      }
    }
  });

  test("header stats should be visible on tablet", async ({ page, mobile }) => {
    const viewportWidth = await mobile.getViewportWidth();

    // Stats are visible at md: breakpoint (768px+)
    if (viewportWidth >= 768) {
      // Look for stat icons (flame, book, clock, star)
      const statContainer = page.locator("header div:has(svg)").first();

      // At least one stat should be visible
      const isVisible = await statContainer.isVisible();
      expect(isVisible).toBe(true);
    }
  });

  test("touch targets should meet WCAG even with larger viewport", async ({
    page,
    mobile,
  }) => {
    // Even on tablet, touch targets should meet 44px minimum

    // Test visible buttons
    const menuButton = page.locator('button[aria-label="Apri menu"]').first();
    if (await menuButton.isVisible()) {
      await mobile.verifyTouchTarget(menuButton);
    }

    // Test sidebar buttons
    await mobile.openMobileSidebar();

    const logoButton = page
      .locator('button[aria-label="Torna alla home"]')
      .first();
    if (await logoButton.isVisible()) {
      await mobile.verifyTouchTarget(logoButton);
    }

    const toggleButton = page
      .locator(
        'button[aria-label="Chiudi menu"], button[aria-label="Apri menu"]',
      )
      .last();
    if (await toggleButton.isVisible()) {
      await mobile.verifyTouchTarget(toggleButton);
    }
  });

  test("portrait to landscape rotation should maintain layout", async ({
    page,
    mobile: _mobile,
  }) => {
    // Start in portrait (768px × 1024px)
    const portraitSize = { width: 768, height: 1024 };
    await page.setViewportSize(portraitSize);
    await page.waitForTimeout(300);

    // Verify portrait layout
    await expect(page.locator("header").first()).toBeVisible();
    await expect(page.locator('main, [role="main"]')).toBeVisible();

    // Rotate to landscape (1024px × 768px)
    const landscapeSize = { width: 1024, height: 768 };
    await page.setViewportSize(landscapeSize);
    await page.waitForTimeout(300);

    // Verify landscape layout still works
    await expect(page.locator("header").first()).toBeVisible();
    await expect(page.locator('main, [role="main"]')).toBeVisible();

    // Sidebar should be visible in landscape (>= 1024px)
    const sidebar = page.locator("aside").first();
    await expect(sidebar).toBeVisible();

    // Restore portrait
    await page.setViewportSize(portraitSize);
  });

  test("iPad should use hover states appropriately", async ({
    page,
    mobile,
  }) => {
    // iPad supports hover with Apple Pencil / Magic Keyboard
    await mobile.openMobileSidebar();

    const logoButton = page
      .locator('button[aria-label="Torna alla home"]')
      .first();
    await expect(logoButton).toBeVisible();

    // Hover should work (button has hover:opacity-80)
    await logoButton.hover();
    await page.waitForTimeout(100);

    // Button should still be visible and functional
    await expect(logoButton).toBeVisible();
    await logoButton.click();

    // Should navigate (though we don't verify destination in this test)
  });

  test("iPad should handle multitasking split view", async ({
    page,
    mobile,
  }) => {
    // Simulate iPad split view (1/3 width = ~341px)
    const splitViewSize = { width: 341, height: 1024 };
    await page.setViewportSize(splitViewSize);
    await page.waitForTimeout(300);

    // Should still render correctly at narrow width
    await expect(page.locator("header").first()).toBeVisible();
    await expect(page.locator('main, [role="main"]')).toBeVisible();

    // Sidebar should behave like mobile (hidden by default)
    const sidebar = page.locator("aside").first();
    const sidebarVisible = await sidebar.isVisible();
    expect(sidebarVisible).toBe(false);

    // Can still open sidebar
    await mobile.openMobileSidebar();
    await expect(sidebar).toBeVisible();

    // Restore full size
    await page.setViewportSize({ width: 768, height: 1024 });
  });

  test("iPad should respect accessibility text size", async ({
    page,
    mobile: _mobile,
  }) => {
    // Set larger text size preference
    // This would normally come from iOS settings, but we can test CSS zoom

    // Get base font size
    const baseFontSize = await page.evaluate(() => {
      const body = document.body;
      return parseFloat(window.getComputedStyle(body).fontSize);
    });

    expect(baseFontSize).toBeGreaterThan(0);

    // Apply zoom (simulates larger text)
    await page.evaluate(() => {
      document.body.style.zoom = "1.2";
    });

    await page.waitForTimeout(200);

    // Layout should still be functional
    await expect(page.locator("header").first()).toBeVisible();
    await expect(page.locator('main, [role="main"]')).toBeVisible();

    // No horizontal scroll should appear
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.body.scrollWidth > document.body.clientWidth;
    });
    expect(hasHorizontalScroll).toBe(false);
  });

  test("iPad keyboard shortcuts should work", async ({ page }) => {
    // Test Command+K or other keyboard shortcuts (if implemented)
    // For now, test basic keyboard navigation

    // Press Tab to navigate
    await page.keyboard.press("Tab");

    // Should focus first interactive element
    const focusedTag = await page.evaluate(
      () => document.activeElement?.tagName,
    );
    expect(focusedTag).toBeTruthy();

    // Escape should close modals/panels
    await page.keyboard.press("Escape");
    await page.waitForTimeout(100);

    // No modal overlays should be visible
    const overlay = page.locator(".fixed.inset-0.bg-black\\/40");
    const overlayVisible = await overlay.isVisible();
    expect(overlayVisible).toBe(false);
  });

  test("iPad should support Pointer/Apple Pencil interactions", async ({
    page,
    mobile,
  }) => {
    // Test precise pointer interactions
    await mobile.openMobileSidebar();

    // Click small UI elements precisely
    const toggleButton = page
      .locator('button[aria-label="Chiudi menu"]')
      .first();

    // Get button center
    const box = await toggleButton.boundingBox();
    expect(box).not.toBeNull();

    // Click at exact center (like Apple Pencil tap)
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);

    // Should close sidebar
    await mobile.waitForSidebarAnimation();
    const sidebar = page.locator("aside").first();

    // Sidebar should be hidden after close
    const sidebarVisible = await sidebar.isVisible();
    expect(sidebarVisible).toBe(false);
  });
});

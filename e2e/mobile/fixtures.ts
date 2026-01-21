/**
 * Mobile Test Fixtures
 * Provides utilities for mobile-specific testing
 * ADR 0064: Mobile UX responsive design testing
 */

/* eslint-disable react-hooks/rules-of-hooks */

import { test as base, expect, type Locator } from "@playwright/test";

/**
 * Viewport dimensions for mobile devices
 */
export const VIEWPORTS = {
  iphone_se: { width: 375, height: 667 },
  iphone_13: { width: 390, height: 844 },
  pixel_7: { width: 412, height: 915 },
  ipad_mini_portrait: { width: 768, height: 1024 },
  ipad_mini_landscape: { width: 1024, height: 768 },
} as const;

/**
 * Touch target size requirements (WCAG 2.5.5 Level AA)
 */
export const TOUCH_TARGET_MIN_SIZE = 44; // 44px × 44px minimum

/**
 * Mobile-specific test utilities
 */
export interface MobileTestHelpers {
  /**
   * Verify element meets WCAG 2.5.5 touch target minimum (44px × 44px)
   */
  verifyTouchTarget: (locator: Locator) => Promise<void>;

  /**
   * Verify element width as percentage of viewport
   */
  verifyViewportPercentage: (
    locator: Locator,
    maxPercentage: number,
  ) => Promise<void>;

  /**
   * Wait for sidebar animation to complete
   */
  waitForSidebarAnimation: () => Promise<void>;

  /**
   * Open mobile sidebar (clicks hamburger menu)
   */
  openMobileSidebar: () => Promise<void>;

  /**
   * Close mobile sidebar (clicks overlay)
   */
  closeMobileSidebar: () => Promise<void>;

  /**
   * Verify iOS safe area handling
   */
  verifyIOSSafeArea: (locator: Locator) => Promise<void>;

  /**
   * Get current viewport width
   */
  getViewportWidth: () => Promise<number>;

  /**
   * Check if element is visible in viewport (not obscured)
   */
  isVisibleInViewport: (locator: Locator) => Promise<boolean>;
}

/**
 * Extended test fixture with mobile helpers
 */
export const test = base.extend<{ mobile: MobileTestHelpers }>({
  mobile: async ({ page }, use) => {
    const helpers: MobileTestHelpers = {
      verifyTouchTarget: async (locator: Locator) => {
        const box = await locator.boundingBox();
        if (!box) {
          throw new Error("Element not found or not visible");
        }

        expect(box.width).toBeGreaterThanOrEqual(TOUCH_TARGET_MIN_SIZE);
        expect(box.height).toBeGreaterThanOrEqual(TOUCH_TARGET_MIN_SIZE);
      },

      verifyViewportPercentage: async (
        locator: Locator,
        maxPercentage: number,
      ) => {
        const box = await locator.boundingBox();
        if (!box) {
          throw new Error("Element not found or not visible");
        }

        const viewportSize = page.viewportSize();
        if (!viewportSize) {
          throw new Error("Viewport size not available");
        }

        const elementPercentage = (box.width / viewportSize.width) * 100;
        expect(elementPercentage).toBeLessThanOrEqual(maxPercentage);
      },

      waitForSidebarAnimation: async () => {
        // Wait for CSS transition (300ms as per home-sidebar.tsx)
        await page.waitForTimeout(350);
      },

      openMobileSidebar: async () => {
        // Click hamburger menu button
        const menuButton = page.locator(
          'button[aria-label="Apri menu"], button[aria-label*="menu"]',
        );
        await menuButton.click();
        await helpers.waitForSidebarAnimation();
      },

      closeMobileSidebar: async () => {
        // Click overlay to close
        const overlay = page.locator(".fixed.inset-0.bg-black\\/40");
        if (await overlay.isVisible()) {
          await overlay.click();
          await helpers.waitForSidebarAnimation();
        }
      },

      verifyIOSSafeArea: async (locator: Locator) => {
        // Check if element has safe-area-inset padding
        const element = await locator.elementHandle();
        if (!element) {
          throw new Error("Element not found");
        }

        const paddingBottom = await element.evaluate((el) => {
          const style = window.getComputedStyle(el);
          return style.paddingBottom;
        });

        // Should have either fixed padding or env(safe-area-inset-bottom)
        expect(paddingBottom).not.toBe("0px");
      },

      getViewportWidth: async () => {
        const viewportSize = page.viewportSize();
        if (!viewportSize) {
          throw new Error("Viewport size not available");
        }
        return viewportSize.width;
      },

      isVisibleInViewport: async (locator: Locator) => {
        const box = await locator.boundingBox();
        if (!box) return false;

        const viewportSize = page.viewportSize();
        if (!viewportSize) return false;

        // Check if element is within viewport bounds
        return (
          box.x >= 0 &&
          box.y >= 0 &&
          box.x + box.width <= viewportSize.width &&
          box.y + box.height <= viewportSize.height
        );
      },
    };

    await use(helpers);
  },
});

export { expect };

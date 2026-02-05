/**
 * Mobile Test Fixtures
 * Provides utilities for mobile-specific testing
 * ADR 0064: Mobile UX responsive design testing
 */

/* eslint-disable react-hooks/rules-of-hooks */

import { test as base, expect } from "../fixtures/base-fixtures";
import type { Locator } from "@playwright/test";

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
 *
 * IMPORTANT: This fixture mocks the /api/onboarding endpoint to return
 * completed onboarding state. This is necessary because:
 * 1. global-setup.ts sets localStorage with onboarding completed
 * 2. But the app's onboarding store hydrates from the API, not localStorage
 * 3. Without the mock, users get redirected to /welcome (not /home)
 *
 * See ADR 0059 for details on E2E test setup requirements.
 */
export const test = base.extend<{ mobile: MobileTestHelpers }>({
  mobile: async ({ page }, use) => {
    // Mock /api/onboarding to return completed onboarding state
    // This prevents redirect to /welcome and shows the authenticated home page
    await page.route("**/api/onboarding", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          hasExistingData: true,
          data: {
            name: "Test User",
            age: 12,
            schoolLevel: "media",
          },
          onboardingState: {
            hasCompletedOnboarding: true,
            onboardingCompletedAt: new Date().toISOString(),
            currentStep: "ready",
            isReplayMode: false,
          },
        }),
      });
    });

    // Mock /api/tos to return TOS accepted
    // TosGateProvider checks BOTH localStorage AND this API on mount (ADR 0059)
    await page.route("**/api/tos", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accepted: true,
          version: "1.0",
        }),
      });
    });

    // Mock /api/user/usage to return trial usage data
    // TrialUsageDashboard calls this on mount and crashes if data is missing
    await page.route("**/api/user/usage", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          chat: { used: 2, limit: 10, percentage: 20 },
          voice: { used: 60, limit: 300, percentage: 20, unit: "seconds" },
          tools: { used: 3, limit: 10, percentage: 30 },
          docs: { used: 0, limit: 1, percentage: 0 },
          maestri: { selected: 1, limit: 3 },
        }),
      });
    });

    // Mock /api/user/settings to prevent 401 errors
    // Settings are loaded on mount and missing data causes hydration issues
    await page.route("**/api/user/settings", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            studentProfile: {
              preferredCoach: "melissa",
              preferredBuddy: "mario",
            },
          }),
        });
      } else {
        await route.fulfill({ status: 200, body: "{}" });
      }
    });

    // Mock /api/progress to prevent gamification errors
    await page.route("**/api/progress", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          xp: 100,
          level: 1,
          streak: 1,
          totalStudyMinutes: 30,
          sessionsThisWeek: 1,
          questionsAsked: 5,
        }),
      });
    });

    const helpers: MobileTestHelpers = {
      verifyTouchTarget: async (locator: Locator) => {
        // Re-wait for element to ensure hydration is complete
        await locator.waitFor({ state: "visible", timeout: 5000 });
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
        // Click hamburger menu button in header (not sidebar)
        const menuButton = page
          .locator("header")
          .locator('button[aria-label="Apri menu"]');
        await menuButton.click();
        await helpers.waitForSidebarAnimation();
      },

      closeMobileSidebar: async () => {
        // Click overlay at center-right to avoid toast/footer blocking
        // Sidebar is 64px wide on left, so click at 80% x, 50% y of viewport
        const viewportSize = page.viewportSize();
        if (viewportSize) {
          const x = viewportSize.width * 0.8; // Right side of screen
          const y = viewportSize.height * 0.5; // Middle height
          await page.mouse.click(x, y);
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

    // Dismiss PWA install banner if present (blocks clicks at bottom of screen)
    // Key from ios-install-banner.tsx: BANNER_DISMISSED_KEY = 'ios-install-banner-dismissed'
    await page.addInitScript(() => {
      localStorage.setItem(
        "ios-install-banner-dismissed",
        new Date().toISOString(),
      );
    });

    await use(helpers);
  },
});

export { expect };

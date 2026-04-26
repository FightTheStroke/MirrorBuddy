/**
 * Production Smoke Test Fixtures
 *
 * Lightweight fixtures for production read-only tests.
 * Bypasses consent walls via route mocking and localStorage —
 * same pattern as base-fixtures.ts but without DB dependencies.
 *
 * These tests NEVER write data to production. They only:
 * - Navigate pages
 * - Verify UI renders
 * - Check API responses (GET only)
 * - Validate accessibility features
 */

/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, expect } from '@playwright/test';
import {
  mockTOS,
  mockConsentStorage,
  mockTrialConsentCookie,
  mockTrialSession,
  mockOnboarding,
  mockTracking,
  mockHomePageAPIs,
  setVisitorCookie,
} from '../fixtures/api-mocks';

export const PROD_URL = process.env.PROD_URL || 'https://mirrorbuddy.vercel.app';

const PROD_VISITOR = '00000000-0000-4000-a000-000000000001';
const IOS_INSTALL_BANNER_DISMISSED_KEY = 'ios-install-banner-dismissed';

export const test = base.extend({
  // Clear global storageState so production smoke tests start without auth cookies.
  storageState: async ({}, use) => {
    await use({ cookies: [], origins: [] });
  },
  page: async ({ page, context }, use) => {
    const domain = new URL(PROD_URL).hostname;

    // Force Italian locale so selectors are predictable
    await context.setExtraHTTPHeaders({ 'Accept-Language': 'it-IT,it;q=0.9' });
    // Prevent iOS install banner from intercepting clicks on mobile checks.
    await context.addInitScript((dismissKey: string) => {
      localStorage.setItem(dismissKey, new Date().toISOString());
    }, IOS_INSTALL_BANNER_DISMISSED_KEY);

    // Bypass all consent walls
    await mockTOS(page);
    await mockConsentStorage(context);
    await mockTrialConsentCookie(context, domain);
    await setVisitorCookie(context, PROD_VISITOR, domain);
    await mockTrialSession(page, PROD_VISITOR);
    await mockOnboarding(page);
    await mockTracking(page);
    await mockHomePageAPIs(page);

    await use(page);
  },
});

/**
 * Open the mobile sidebar hamburger menu if present.
 * On desktop viewports the sidebar is always visible, so this is a no-op.
 */
export async function openMobileMenu(page: import('@playwright/test').Page) {
  const menuButton = page.getByRole('button', { name: /Apri menu/i }).first();
  if (await menuButton.isVisible({ timeout: 5000 }).catch(() => false)) {
    await menuButton.click();
    // Wait for sidebar animation and verify it opened
    await page
      .locator('aside, nav')
      .first()
      .waitFor({ state: 'visible', timeout: 3000 })
      .catch(() => {});
  }
}

export { expect };

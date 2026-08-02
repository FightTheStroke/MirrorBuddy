/**
 * Production Smoke Test Fixtures
 *
 * Lightweight fixtures for production read-only tests.
 * Public tests use unmodified production routing. Authenticated tests log in
 * with local-only credentials and mock mutable user-state APIs.
 *
 * These tests NEVER write data to production. They only:
 * - Navigate pages
 * - Verify UI renders
 * - Check API responses (GET only)
 * - Validate accessibility features
 */

/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, expect, request as playwrightRequest } from '@playwright/test';
import type { APIResponse, StorageState } from '@playwright/test';
import {
  mockTOS,
  mockConsentStorage,
  mockOnboarding,
  mockTracking,
  mockHomePageAPIs,
} from '../fixtures/api-mocks';

export const PROD_URL = process.env.PROD_URL || 'https://mirrorbuddy.vercel.app';
const PROD_TEST_USER_ID = process.env.PROD_TEST_USER_ID;
const PROD_TEST_USER_EMAIL = process.env.PROD_TEST_USER_EMAIL;
const PROD_TEST_USER_USERNAME = process.env.PROD_TEST_USER_USERNAME;
const PROD_TEST_USER_PASSWORD = process.env.PROD_TEST_USER_PASSWORD;

export const hasProdTestCredentials = Boolean(
  PROD_TEST_USER_ID && PROD_TEST_USER_EMAIL && PROD_TEST_USER_USERNAME && PROD_TEST_USER_PASSWORD,
);

const IOS_INSTALL_BANNER_DISMISSED_KEY = 'ios-install-banner-dismissed';

export const test = base.extend({
  // Clear global storageState so production smoke tests start without auth cookies.
  storageState: async ({}, use) => {
    await use({ cookies: [], origins: [] });
  },
  page: async ({ page, context }, use) => {
    // Force Italian locale so selectors are predictable
    await context.setExtraHTTPHeaders({ 'Accept-Language': 'it-IT,it;q=0.9' });
    // Prevent iOS install banner from intercepting clicks on mobile checks.
    await context.addInitScript((dismissKey: string) => {
      localStorage.setItem(dismissKey, new Date().toISOString());
    }, IOS_INSTALL_BANNER_DISMISSED_KEY);

    await use(page);
  },
});

type AuthWorkerFixtures = {
  prodAuthStorageState: StorageState;
};

const authenticatedBase = base.extend<Record<string, never>, AuthWorkerFixtures>({
  prodAuthStorageState: [
    async ({}, use) => {
      if (!hasProdTestCredentials) {
        await use({ cookies: [], origins: [] });
        return;
      }

      const api = await playwrightRequest.newContext({ baseURL: PROD_URL });
      let response: APIResponse | undefined;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          response = await api.post('/api/auth/login', {
            data: {
              email: PROD_TEST_USER_EMAIL,
              password: PROD_TEST_USER_PASSWORD,
            },
            timeout: 30000,
          });
          break;
        } catch (error) {
          if (attempt === 1) throw error;
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
      if (!response) {
        await api.dispose();
        throw new Error('Production test login did not return a response');
      }
      if (!response.ok()) {
        await api.dispose();
        throw new Error(`Production test login failed with status ${response.status()}`);
      }

      const body = (await response.json()) as { user?: { id?: string } };
      if (body.user?.id !== PROD_TEST_USER_ID) {
        await api.dispose();
        throw new Error('Production test login returned an unexpected user');
      }

      const storageState = await api.storageState();
      await api.dispose();
      await use(storageState);
    },
    { scope: 'worker', timeout: 90000 },
  ],
  storageState: async ({ prodAuthStorageState }, use) => {
    await use(prodAuthStorageState);
  },
  page: async ({ page, context }, use) => {
    await context.setExtraHTTPHeaders({ 'Accept-Language': 'it-IT,it;q=0.9' });
    await context.addInitScript((dismissKey: string) => {
      localStorage.setItem(dismissKey, new Date().toISOString());
    }, IOS_INSTALL_BANNER_DISMISSED_KEY);

    await mockTOS(page);
    await mockConsentStorage(context);
    await mockOnboarding(page);
    await mockTracking(page);
    await mockHomePageAPIs(page);

    await use(page);
  },
});

export const authenticatedTest = authenticatedBase;

export async function openHomeworkSession(page: import('@playwright/test').Page) {
  await page.goto('/it');
  await expect(page).toHaveURL(/\/it\/?$/);
  await expect(page.getByTestId('intent-card-homework')).toBeVisible({ timeout: 15000 });
  await page.getByTestId('intent-card-homework').click();
  await expect(page.locator('#intent-subject-heading')).toBeVisible();
  await page.getByTestId('subject-mathematics').click();
  await expect(page.getByTestId('maestro-session-handoff')).toBeVisible({ timeout: 30000 });
}

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

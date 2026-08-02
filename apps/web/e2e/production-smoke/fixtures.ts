/**
 * Production Smoke Test Fixtures
 *
 * Lightweight fixtures for production read-only tests.
 * Public tests use unmodified production routing. Authenticated tests inject a
 * dedicated pre-signed isTestData user cookie, then verify it against the
 * read-only /api/user endpoint before mocking mutable user-state APIs.
 *
 * Shared authenticated fixtures do not write production data. They only:
 * - Navigate pages
 * - Verify UI renders
 * - Check API responses (GET only)
 * - Validate accessibility features
 *
 * The isolated login-flow regression performs one real login and may emit
 * bounded, deduplicated FIRST_LOGIN telemetry.
 */

/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, expect, request as playwrightRequest } from '@playwright/test';
import type { BrowserContext, StorageState } from '@playwright/test';
import { AUTH_COOKIE_CLIENT, AUTH_COOKIE_NAME } from '@/lib/auth/cookie-constants';
import {
  mockTOS,
  mockConsentStorage,
  mockOnboarding,
  mockTracking,
  mockHomePageAPIs,
  mockAccessibilitySettings,
} from '../fixtures/api-mocks';

export const PROD_URL = process.env.PROD_URL || 'https://mirrorbuddy.vercel.app';
export const ADMIN_READONLY_COOKIE_NAME = AUTH_COOKIE_NAME;
export const ADMIN_READONLY_COOKIE_VALUE = process.env.ADMIN_READONLY_COOKIE_VALUE;
const PROD_TEST_USER_ID = process.env.PROD_TEST_USER_ID;
const PROD_TEST_USER_COOKIE_VALUE = process.env.PROD_TEST_USER_COOKIE_VALUE;

export const hasProdTestAuthCookie = Boolean(PROD_TEST_USER_ID && PROD_TEST_USER_COOKIE_VALUE);

export async function addAdminReadOnlyCookie(context: BrowserContext) {
  if (!ADMIN_READONLY_COOKIE_VALUE) {
    throw new Error('ADMIN_READONLY_COOKIE_VALUE is not available');
  }
  await context.addCookies([
    {
      name: ADMIN_READONLY_COOKIE_NAME,
      value: ADMIN_READONLY_COOKIE_VALUE,
      domain: new URL(PROD_URL).hostname,
      path: '/',
      httpOnly: true,
      secure: true,
    },
  ]);
}

export function adminReadOnlyCookieHeader() {
  if (!ADMIN_READONLY_COOKIE_VALUE) {
    throw new Error('ADMIN_READONLY_COOKIE_VALUE is not available');
  }
  return `${ADMIN_READONLY_COOKIE_NAME}=${ADMIN_READONLY_COOKIE_VALUE}`;
}

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
      if (!hasProdTestAuthCookie) {
        await use({ cookies: [], origins: [] });
        return;
      }

      const hostname = new URL(PROD_URL).hostname;
      const storageState: StorageState = {
        cookies: [
          {
            name: AUTH_COOKIE_NAME,
            value: PROD_TEST_USER_COOKIE_VALUE!,
            domain: hostname,
            path: '/',
            expires: -1,
            httpOnly: true,
            secure: true,
            sameSite: 'Lax',
          },
          {
            name: AUTH_COOKIE_CLIENT,
            value: PROD_TEST_USER_ID!,
            domain: hostname,
            path: '/',
            expires: -1,
            httpOnly: false,
            secure: true,
            sameSite: 'Lax',
          },
        ],
        origins: [],
      };

      const api = await playwrightRequest.newContext({ baseURL: PROD_URL, storageState });
      const userResponse = await api.get('/api/user', { timeout: 30000 });
      if (!userResponse.ok()) {
        await api.dispose();
        throw new Error(
          `Production test user verification failed with status ${userResponse.status()}`,
        );
      }
      const user = (await userResponse.json()) as { id?: string; isTestData?: boolean };
      if (user.id !== PROD_TEST_USER_ID || user.isTestData !== true) {
        await api.dispose();
        throw new Error(
          'Production test authentication is not using the dedicated isTestData user',
        );
      }

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
    await mockAccessibilitySettings(
      page,
      PROD_TEST_USER_ID ?? 'production-smoke-user',
      'production-smoke-accessibility',
    );

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

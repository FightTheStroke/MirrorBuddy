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
import { resolve } from 'node:path';
import { AUTH_COOKIE_CLIENT, AUTH_COOKIE_NAME } from '@/lib/auth/cookie-constants';
import {
  mockTOS,
  mockConsentStorage,
  mockOnboarding,
  mockTracking,
  mockHomePageAPIs,
  mockAccessibilitySettings,
} from '../fixtures/api-mocks';
import { readRosterCounts } from '../../../../scripts/lib/roster-counts';

export type { APIRequestContext } from '@playwright/test';

export const PROD_URL = process.env.PROD_URL || 'https://mirrorbuddy.vercel.app';
const REPO_ROOT = resolve(__dirname, '../../../..');
export const EXPECTED_MAESTRI_COUNT = readRosterCounts(REPO_ROOT).maestri;
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
    await page.route('**/api/telemetry/activity', async (route) => {
      await route.fulfill({ status: 204 });
    });
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
 * Open the mobile sidebar hamburger menu.
 *
 * On desktop viewports (>= the `lg` breakpoint the sidebar itself uses) the
 * sidebar is always expanded and there is no hamburger, so this is correctly a
 * no-op. On mobile it must actually open the menu, and say so if it cannot.
 *
 * Do NOT reach for `isVisible()` here. `isVisible()` performs an immediate
 * check and never waits — its `timeout` option does nothing — so on a cold load
 * it returns `false` before the button has rendered, the caller skips the click,
 * and the menu stays shut. The test then asserts against a closed sidebar,
 * which renders its nav labels as empty strings, and fails with a confusing
 * "expected /Casa/i, received ''". A check that reports "nothing to do" when it
 * simply looked too early is worse than no check: it does not merely miss the
 * problem, it authorises the assertions that follow. Use the auto-waiting
 * `waitFor`, and let a genuine failure surface.
 */
const MOBILE_BREAKPOINT = 1024;

export async function openMobileMenu(page: import('@playwright/test').Page) {
  const viewport = page.viewportSize();
  if (viewport && viewport.width >= MOBILE_BREAKPOINT) return;

  // Two buttons carry this label: the header hamburger, and the sidebar's own
  // toggle, which sits inside the off-screen drawer while it is closed. An
  // off-screen element still has a bounding box, so it reads as "visible" —
  // pick by position rather than by DOM order.
  const menuButtons = page.getByRole('button', { name: /Apri menu/i });
  await menuButtons.first().waitFor({ state: 'visible', timeout: 30000 });

  const count = await menuButtons.count();
  let target = menuButtons.first();
  for (let i = 0; i < count; i++) {
    const candidate = menuButtons.nth(i);
    const box = await candidate.boundingBox();
    if (box && box.x >= 0 && box.y >= 0) {
      target = candidate;
      break;
    }
  }

  await target.click();

  // The menu is open only once the drawer renders its labels; the sidebar omits
  // the label span entirely while collapsed, so a non-empty label is the honest
  // signal that it opened, and an animation delay is not.
  await expect(page.getByTestId('home-nav-intent')).not.toBeEmpty({ timeout: 15000 });
}

export { expect };

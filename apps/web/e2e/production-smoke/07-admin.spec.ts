/**
 * Production Smoke Tests — Admin Panel
 *
 * Verifies admin routes require authentication.
 * Tests navigation structure WITH auth (using ADMIN_READONLY_COOKIE_VALUE if set).
 *
 * To test admin navigation, set env vars:
 *   ADMIN_READONLY_COOKIE_VALUE=<signed-cookie-value>
 *
 * Without credentials, tests verify access is properly blocked.
 */

import { test, expect, PROD_URL } from './fixtures';
import { AUTH_COOKIE_NAME } from '@/lib/auth/cookie-constants';

const ADMIN_COOKIE = process.env.ADMIN_READONLY_COOKIE_VALUE;
const ADMIN_COOKIE_NAME = process.env.ADMIN_COOKIE_NAME || AUTH_COOKIE_NAME;

test.describe('PROD-SMOKE: Admin Panel', () => {
  test('Admin routes redirect unauthenticated users', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForURL(/\/(it|en|fr|de|es)\/login/, { timeout: 15000 });
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
  });

  // Authenticated admin tests — only run if ADMIN_COOKIE is set
  const adminTest = ADMIN_COOKIE ? test : test.skip;

  adminTest('Admin dashboard loads with navigation', async ({ page, context }) => {
    // Set admin auth cookie
    await context.addCookies([
      {
        name: ADMIN_COOKIE_NAME,
        value: ADMIN_COOKIE!,
        domain: new URL(PROD_URL).hostname,
        path: '/',
        httpOnly: true,
        secure: true,
      },
    ]);

    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/?$/);
    await expect(page.getByText('Dashboard', { exact: true }).first()).toBeVisible({
      timeout: 15000,
    });
  });
});

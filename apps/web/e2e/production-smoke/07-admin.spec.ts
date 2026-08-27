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

import {
  test,
  expect,
  ADMIN_READONLY_COOKIE_NAME,
  ADMIN_READONLY_COOKIE_VALUE,
  addAdminReadOnlyCookie,
} from './fixtures';

test.describe('PROD-SMOKE: Admin Panel', () => {
  test('Admin routes redirect unauthenticated users', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForURL(/\/(it|en|fr|de|es)\/login/, { timeout: 15000 });
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
  });

  // Authenticated admin tests — only run if ADMIN_COOKIE is set
  const adminTest = ADMIN_READONLY_COOKIE_VALUE ? test : test.skip;

  adminTest('Read-only admin cookie uses the standard auth cookie name', async () => {
    expect(ADMIN_READONLY_COOKIE_NAME).toBe('mirrorbuddy-user-id');
  });

  adminTest('Admin dashboard loads with read-only authentication', async ({ page, context }) => {
    await addAdminReadOnlyCookie(context);
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/?$/);
    // The admin shell shows its "Dashboard" identity in a different element per
    // viewport: an `sm:hidden` <h1> in the mobile header, and the expanded
    // sidebar item on desktop. The previous `.first()` picked by DOM order and
    // so selected the sidebar item even on mobile, where it is hidden — failing
    // on a page that had in fact loaded. Ask for the visible one instead.
    await expect(
      page.getByText('Dashboard', { exact: true }).filter({ visible: true }).first(),
    ).toBeVisible({ timeout: 15000 });
  });
});

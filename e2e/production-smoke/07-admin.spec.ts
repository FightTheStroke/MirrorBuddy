/**
 * Production Smoke Tests — Admin Panel
 *
 * Verifies admin routes require authentication.
 * Tests navigation structure WITH auth (using ADMIN_COOKIE if set).
 *
 * To test admin navigation, set env vars:
 *   ADMIN_COOKIE_NAME=mirrorbuddy-user-id
 *   ADMIN_COOKIE_VALUE=<signed-cookie-value>
 *
 * Without credentials, tests verify access is properly blocked.
 */

import { test, expect } from './fixtures';

const ADMIN_COOKIE = process.env.ADMIN_COOKIE_VALUE;
const ADMIN_COOKIE_NAME = process.env.ADMIN_COOKIE_NAME || 'mirrorbuddy-user-id';

test.describe('PROD-SMOKE: Admin Panel', () => {
  test('Admin routes redirect unauthenticated users', async ({ page }) => {
    await page.goto('/admin');
    // Should NOT show admin dashboard content
    const url = page.url();
    const body = await page.textContent('body');
    // Either redirects to login or shows auth wall
    const isProtected =
      url.includes('login') ||
      body?.includes('Accedi') ||
      body?.includes('non autorizzato') ||
      !body?.includes('Admin Dashboard');
    expect(isProtected).toBe(true);
  });

  // Authenticated admin tests — only run if ADMIN_COOKIE is set
  const adminTest = ADMIN_COOKIE ? test : test.skip;

  adminTest('Admin dashboard loads with navigation', async ({ page, context }) => {
    // Set admin auth cookie
    await context.addCookies([
      {
        name: ADMIN_COOKIE_NAME,
        value: ADMIN_COOKIE!,
        domain: new URL(page.url() || 'https://mirrorbuddy.vercel.app').hostname,
        path: '/',
        httpOnly: true,
        secure: true,
      },
    ]);

    await page.goto('/admin');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 });
  });

  adminTest('Admin sub-pages are accessible', async ({ page, context }) => {
    await context.addCookies([
      {
        name: ADMIN_COOKIE_NAME,
        value: ADMIN_COOKIE!,
        domain: 'mirrorbuddy.vercel.app',
        path: '/',
        httpOnly: true,
        secure: true,
      },
    ]);

    const adminPages = [
      '/admin/users',
      '/admin/characters',
      '/admin/analytics',
      '/admin/audit',
      '/admin/safety',
      '/admin/invites',
      '/admin/tiers',
      '/admin/knowledge',
    ];

    for (const adminPage of adminPages) {
      await page.goto(adminPage);
      // Should not be a 404 or error page
      const title = await page.title();
      expect(title).not.toContain('404');
      expect(title).not.toContain('Error');
    }
  });
});

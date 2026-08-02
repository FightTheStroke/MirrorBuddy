/**
 * Production Smoke Tests — Admin Console (Extended)
 *
 * Comprehensive admin API endpoint verification + deep page content checks.
 * Verifies ALL admin endpoints reject unauthenticated access.
 * Validates each admin page renders meaningful content (not just status 200).
 * Read-only, no data mutations even with valid auth.
 */

import { randomBytes } from 'node:crypto';
import {
  test,
  expect,
  PROD_URL,
  ADMIN_READONLY_COOKIE_VALUE,
  addAdminReadOnlyCookie,
} from './fixtures';
import { CSRF_TOKEN_COOKIE, CSRF_TOKEN_HEADER } from '@/lib/auth/cookie-constants';

test.describe('PROD-SMOKE: Admin API Security', () => {
  const adminGetEndpoints = [
    '/api/admin/counts',
    '/api/admin/analytics/locales',
    '/api/admin/audit-logs',
    '/api/admin/audit',
    '/api/admin/business-kpi',
    '/api/admin/characters',
    '/api/admin/control-panel',
    '/api/admin/cost-tracking',
    '/api/admin/email-campaigns',
    '/api/admin/email-stats',
    '/api/admin/email-templates',
    '/api/admin/env-audit',
    '/api/admin/feature-flags',
    '/api/admin/funnel/metrics',
    '/api/admin/funnel/users',
    '/api/admin/grafana',
    '/api/admin/health-aggregator',
    '/api/admin/infra-panel',
    '/api/admin/key-vault',
    '/api/admin/safety',
  ];

  for (const endpoint of adminGetEndpoints) {
    test(`${endpoint} rejects unauthenticated GET`, async ({ request }) => {
      const res = await request.get(endpoint);
      expect(res.status()).toBeGreaterThanOrEqual(400);
    });
  }

  test('Admin character seed rejects unauthenticated POST', async ({ request }) => {
    const res = await request.post('/api/admin/characters/seed');
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('Admin email test rejects unauthenticated POST', async ({ request }) => {
    const res = await request.post('/api/admin/email-test');
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });
});

test.describe('PROD-SMOKE: Admin Pages Content Verification', () => {
  const adminTest = ADMIN_READONLY_COOKIE_VALUE ? test : test.skip;

  /** Checks no error boundaries, stack traces, or crash indicators */
  const assertNoErrors = async (page: import('@playwright/test').Page) => {
    const body = (await page.textContent('body')) || '';
    expect(body).not.toMatch(/Application error/i);
    expect(body).not.toMatch(/Unhandled Runtime Error/i);
    expect(body).not.toContain('TypeError');
    expect(body).not.toContain('ReferenceError');
    expect(body).not.toMatch(/500.*Internal Server/i);
  };

  adminTest('Dashboard shows KPI cards and panels', async ({ page, context }) => {
    await addAdminReadOnlyCookie(context);
    await page.goto('/admin');
    await expect(page.locator('main')).toBeVisible({ timeout: 15000 });
    await assertNoErrors(page);
    // Dashboard should show stat cards or panels
    const body = (await page.textContent('body')) || '';
    expect(body.length).toBeGreaterThan(200);
    // Check for refresh/action buttons
    const buttons = page.getByRole('button');
    expect(await buttons.count()).toBeGreaterThan(0);
  });

  adminTest('Analytics page shows metric cards and charts', async ({ page, context }) => {
    await addAdminReadOnlyCookie(context);
    await page.goto('/admin/analytics');
    await expect(page.locator('main')).toBeVisible({ timeout: 15000 });
    await assertNoErrors(page);
    // Should have stat/KPI cards
    const body = (await page.textContent('body')) || '';
    // Analytics pages always show some metrics
    expect(body.length).toBeGreaterThan(200);
    // Should have refresh button
    const refreshBtn = page.getByRole('button', { name: /refresh|aggiorna/i });
    if ((await refreshBtn.count()) > 0) {
      await expect(refreshBtn.first()).toBeVisible();
    }
  });

  adminTest('Safety page shows safety dashboard with events', async ({ page, context }) => {
    await addAdminReadOnlyCookie(context);
    await page.goto('/admin/safety');
    await expect(page.locator('main')).toBeVisible({ timeout: 15000 });
    await assertNoErrors(page);
    // Safety page should show overview cards or event table
    const body = (await page.textContent('body')) || '';
    expect(body.length).toBeGreaterThan(200);
  });

  adminTest('Funnel page shows conversion metrics', async ({ page, context }) => {
    await addAdminReadOnlyCookie(context);
    await page.goto('/admin/funnel');
    await expect(page.locator('main')).toBeVisible({ timeout: 15000 });
    await assertNoErrors(page);
    // Funnel page should show period selectors and KPI cards
    const buttons = page.getByRole('button');
    expect(await buttons.count()).toBeGreaterThan(0);
    const body = (await page.textContent('body')) || '';
    expect(body.length).toBeGreaterThan(200);
  });

  adminTest('Infrastructure page shows service health', async ({ page, context }) => {
    await addAdminReadOnlyCookie(context);
    await page.goto('/admin/mission-control/infra');
    await expect(page.locator('main')).toBeVisible({ timeout: 15000 });
    await assertNoErrors(page);
    // Should show Service Health Summary with status indicators
    await expect(page.getByText(/Service Health Summary/i)).toBeVisible({ timeout: 10000 });
    const body = (await page.textContent('body')) || '';
    expect(body).toMatch(/healthy|degraded|down|unknown/i);
  });

  adminTest('Read-only admin cannot execute cleanup dry-run DELETE', async ({ page, context }) => {
    await addAdminReadOnlyCookie(context);
    const csrfToken = randomBytes(32).toString('base64url');
    await context.addCookies([
      {
        name: CSRF_TOKEN_COOKIE,
        value: csrfToken,
        domain: new URL(PROD_URL).hostname,
        path: '/',
        httpOnly: true,
        secure: true,
      },
    ]);

    const res = await page.request.delete('/api/admin/cleanup-users?dryRun=true', {
      headers: { [CSRF_TOKEN_HEADER]: csrfToken },
      timeout: 30000,
    });
    expect(res.status()).toBe(403);
    expect(await res.json()).toMatchObject({
      error: expect.stringMatching(/admin access required/i),
    });
  });

  test('Cleanup endpoint rejects unauthenticated dry-run DELETE', async ({ request }) => {
    const csrfToken = randomBytes(32).toString('base64url');
    const res = await request.delete('/api/admin/cleanup-users?dryRun=true', {
      headers: {
        Cookie: `${CSRF_TOKEN_COOKIE}=${csrfToken}`,
        [CSRF_TOKEN_HEADER]: csrfToken,
      },
    });
    expect(res.status()).toBe(401);
  });

  const adminOnlyPages = [
    '/admin/users',
    '/admin/characters',
    '/admin/audit',
    '/admin/tiers',
    '/admin/knowledge',
  ];

  for (const adminOnlyPage of adminOnlyPages) {
    adminTest(
      `Read-only admin cannot access ADMIN-only page: ${adminOnlyPage}`,
      async ({ page, context }) => {
        await addAdminReadOnlyCookie(context);
        await page.goto(adminOnlyPage, { waitUntil: 'commit', timeout: 30000 });
        await expect(page).toHaveURL(/\/(it|en|fr|de|es)\/(?:auth\/)?login/, {
          timeout: 15000,
        });
      },
    );
  }
});

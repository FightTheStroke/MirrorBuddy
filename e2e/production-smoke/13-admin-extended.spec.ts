/**
 * Production Smoke Tests — Admin Console (Extended)
 *
 * Comprehensive admin API endpoint verification + deep page content checks.
 * Verifies ALL admin endpoints reject unauthenticated access.
 * Validates each admin page renders meaningful content (not just status 200).
 * Read-only, no data mutations even with valid auth.
 */

import { test, expect } from './fixtures';
import { ADMIN_COOKIE_NAME as DEFAULT_ADMIN_COOKIE_NAME } from '@/lib/auth/cookie-constants';

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

  test('Admin cleanup-users rejects unauthenticated POST', async ({ request }) => {
    const res = await request.post('/api/admin/cleanup-users');
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

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
  const ADMIN_COOKIE = process.env.ADMIN_READONLY_COOKIE_VALUE;
  const ADMIN_COOKIE_NAME = process.env.ADMIN_COOKIE_NAME || DEFAULT_ADMIN_COOKIE_NAME;
  const adminTest = ADMIN_COOKIE ? test : test.skip;

  const setAdminCookie = async (context: import('@playwright/test').BrowserContext) => {
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
  };

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
    await setAdminCookie(context);
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

  adminTest('Users page shows table with user data', async ({ page, context }) => {
    await setAdminCookie(context);
    await page.goto('/admin/users');
    await expect(page.locator('main')).toBeVisible({ timeout: 15000 });
    await assertNoErrors(page);
    // Should have a table or list of users
    const tableOrList = page.locator('table, [role="table"], [role="grid"]');
    await expect(tableOrList.first()).toBeVisible({ timeout: 10000 });
  });

  adminTest('Characters page shows character grid', async ({ page, context }) => {
    await setAdminCookie(context);
    await page.goto('/admin/characters');
    await expect(page.locator('main')).toBeVisible({ timeout: 15000 });
    await assertNoErrors(page);
    // Should show character cards or grid items
    const body = (await page.textContent('body')) || '';
    // At least some professor/character names should be visible
    expect(body.length).toBeGreaterThan(300);
    // Page heading
    const heading = page.getByRole('heading').first();
    await expect(heading).toBeVisible();
  });

  adminTest('Analytics page shows metric cards and charts', async ({ page, context }) => {
    await setAdminCookie(context);
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

  adminTest('Audit page shows log viewer', async ({ page, context }) => {
    await setAdminCookie(context);
    await page.goto('/admin/audit');
    await expect(page.locator('main')).toBeVisible({ timeout: 15000 });
    await assertNoErrors(page);
    const heading = page.getByRole('heading').first();
    await expect(heading).toBeVisible();
  });

  adminTest('Safety page shows safety dashboard with events', async ({ page, context }) => {
    await setAdminCookie(context);
    await page.goto('/admin/safety');
    await expect(page.locator('main')).toBeVisible({ timeout: 15000 });
    await assertNoErrors(page);
    // Safety page should show overview cards or event table
    const body = (await page.textContent('body')) || '';
    expect(body.length).toBeGreaterThan(200);
  });

  adminTest('Invites page shows tabs and invite list', async ({ page, context }) => {
    await setAdminCookie(context);
    await page.goto('/admin/invites');
    await expect(page.locator('main')).toBeVisible({ timeout: 15000 });
    await assertNoErrors(page);
    // Should have tab navigation (PENDING, APPROVED, etc.)
    const tabs = page.getByRole('tab');
    if ((await tabs.count()) > 0) {
      expect(await tabs.count()).toBeGreaterThanOrEqual(2);
    }
  });

  adminTest('Tiers page shows tier table', async ({ page, context }) => {
    await setAdminCookie(context);
    await page.goto('/admin/tiers');
    await expect(page.locator('main')).toBeVisible({ timeout: 15000 });
    await assertNoErrors(page);
    // Should show a table with tier data
    const tableOrList = page.locator('table, [role="table"], [role="grid"]');
    await expect(tableOrList.first()).toBeVisible({ timeout: 10000 });
  });

  adminTest('Knowledge page shows maestri content', async ({ page, context }) => {
    await setAdminCookie(context);
    await page.goto('/admin/knowledge');
    await expect(page.locator('main')).toBeVisible({ timeout: 15000 });
    await assertNoErrors(page);
    const body = (await page.textContent('body')) || '';
    expect(body.length).toBeGreaterThan(200);
  });

  adminTest('Campaigns page shows campaign list with status', async ({ page, context }) => {
    await setAdminCookie(context);
    await page.goto('/admin/communications/campaigns');
    await expect(page.locator('main')).toBeVisible({ timeout: 15000 });
    await assertNoErrors(page);
    // Should have "New Campaign" button or similar action
    const body = (await page.textContent('body')) || '';
    expect(body.length).toBeGreaterThan(100);
  });

  adminTest('Feature Flags page shows flags list', async ({ page, context }) => {
    await setAdminCookie(context);
    await page.goto('/admin/feature-flags');
    await expect(page.locator('main')).toBeVisible({ timeout: 15000 });
    await assertNoErrors(page);
    const body = (await page.textContent('body')) || '';
    expect(body.length).toBeGreaterThan(100);
  });

  adminTest('Funnel page shows conversion metrics', async ({ page, context }) => {
    await setAdminCookie(context);
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
    await setAdminCookie(context);
    await page.goto('/admin/mission-control/infra');
    await expect(page.locator('main')).toBeVisible({ timeout: 15000 });
    await assertNoErrors(page);
    // Should show Service Health Summary with status indicators
    await expect(page.getByText(/Service Health Summary/i)).toBeVisible({ timeout: 10000 });
    const body = (await page.textContent('body')) || '';
    expect(body).toMatch(/healthy|degraded|down|unknown/i);
  });

  adminTest('Read-only admin cannot execute destructive mutations', async ({ request }) => {
    const cookieHeader = `${ADMIN_COOKIE_NAME}=${ADMIN_COOKIE}`;
    const res = await request.post('/api/admin/cleanup-users', {
      headers: { Cookie: cookieHeader },
    });
    expect(res.status()).toBe(403);
  });
});

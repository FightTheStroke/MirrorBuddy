/**
 * E2E Tests: Admin Mission Control - UI Pages
 *
 * Tests page rendering and UI elements for mission control panels.
 * Panels: key-vault, health, stripe, ops-dashboard,
 *         infra, ai-email, business-kpi, control-panel, grafana
 *
 * F-XX: Mission Control Admin Panels (Plan 100 W0)
 */

import { test, expect } from './fixtures/auth-fixtures';
import { dismissBlockingModals, ADMIN_IGNORE_ERRORS } from './admin-helpers';

// Mission control page routes (only pages that are currently implemented)
const MISSION_CONTROL_PAGES = [
  { path: '/admin/mission-control/key-vault', name: 'Key Vault' },
  { path: '/admin/mission-control/health', name: 'Health Monitor' },
  { path: '/admin/mission-control/infra', name: 'Infrastructure' },
  { path: '/admin/mission-control/ai-email', name: 'AI & Email' },
] as const;

test.describe('Mission Control UI - Page Load', () => {
  test('unauthenticated users cannot access mission control pages', async ({ browser }) => {
    // Create a fresh context with NO cookies (no global storageState, no fixtures)
    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();

    // Mock ToS API (required by project rules)
    await page.route('**/api/tos', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ accepted: true, version: '1.0' }),
      });
    });

    // Try to access a mission control page without auth
    await page.goto('/admin/mission-control/key-vault');
    await page.waitForLoadState('domcontentloaded');

    // Proxy redirects unauthenticated users away from /admin paths.
    // Redirect chain: /admin/... → /login → /landing → /welcome
    // Verify user is NOT on the admin page anymore.
    const url = page.url();
    const isRedirectedAway = !url.includes('/admin/mission-control/');
    const isOnLogin = url.includes('/login');
    const isOnLanding = url.includes('/landing') || url.includes('/welcome');

    expect(
      isRedirectedAway || isOnLogin || isOnLanding,
      `Should redirect away from admin, but got: ${url}`,
    ).toBe(true);

    await context.close();
  });
});

test.describe('Mission Control UI - Admin Access', () => {
  // Admin pages trigger SSR with validateAdminAuth() + auto-create test user in DB
  test.setTimeout(60000);

  test('all mission control pages load for admin users', async ({ adminPage }) => {
    const errors: string[] = [];

    // Capture console errors (filtered)
    adminPage.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!ADMIN_IGNORE_ERRORS.some((p) => p.test(text))) {
          errors.push(`${adminPage.url()}: ${text}`);
        }
      }
    });

    await dismissBlockingModals(adminPage);

    // Pre-flight: warm up admin user creation in DB with a single API call.
    // This prevents race conditions when multiple parallel requests from
    // the first page load all try to INSERT the same user simultaneously.
    await adminPage.request.get('/api/admin/health-aggregator').catch(() => {});
    await adminPage.waitForTimeout(500);

    // Test each page
    for (const pageInfo of MISSION_CONTROL_PAGES) {
      await adminPage.goto(pageInfo.path);
      await adminPage.waitForLoadState('domcontentloaded');

      // Wait for main content
      const main = adminPage.locator("main, [role='main']").first();
      await expect(main).toBeVisible({ timeout: 10000 });

      // Verify we're on the expected page (not redirected)
      const url = adminPage.url();
      expect(url, `Should be on ${pageInfo.path}, but got ${url}`).toContain(pageInfo.path);

      await adminPage.waitForTimeout(300);
    }

    // Report any errors
    if (errors.length > 0) {
      console.log('\nMission Control UI Errors:');
      errors.forEach((err) => console.log(`  ${err}`));
    }

    expect(errors, `Found ${errors.length} console errors in mission control UI`).toHaveLength(0);
  });

  test('key-vault page displays secrets table', async ({ adminPage }) => {
    await dismissBlockingModals(adminPage);
    await adminPage.goto('/admin/mission-control/key-vault');
    await adminPage.waitForLoadState('domcontentloaded');

    // Look for table or list of secrets
    const hasTable =
      (await adminPage
        .locator('table')
        .isVisible({ timeout: 5000 })
        .catch(() => false)) ||
      (await adminPage
        .locator('[role="table"]')
        .isVisible({ timeout: 5000 })
        .catch(() => false));

    const hasCards =
      (await adminPage.locator('[class*="card"]').count()) > 0 ||
      (await adminPage.locator('[class*="Card"]').count()) > 0;

    // Should have either a table or cards display
    expect(hasTable || hasCards, 'Key vault should display secrets in table or cards').toBe(true);
  });

  test('health page displays service status', async ({ adminPage }) => {
    await dismissBlockingModals(adminPage);
    await adminPage.goto('/admin/mission-control/health');
    await adminPage.waitForLoadState('domcontentloaded');

    // Look for health status indicators
    const hasStatusIndicators =
      (await adminPage.locator('[class*="status"]').count()) > 0 ||
      (await adminPage.locator('[class*="Status"]').count()) > 0 ||
      (await adminPage.locator('[role="status"]').count()) > 0;

    const hasCards =
      (await adminPage.locator('[class*="card"]').count()) > 0 ||
      (await adminPage.locator('[class*="Card"]').count()) > 0;

    expect(hasStatusIndicators || hasCards, 'Health page should display service status').toBe(true);
  });

  // NOTE: stripe, ops-dashboard, business-kpi, control-panel, grafana
  // pages are planned but not yet implemented. Tests will be added
  // when the pages are created.
});

test.describe('Mission Control UI - Navigation', () => {
  test.setTimeout(60000);

  test('mission control pages have back/navigation links', async ({ adminPage }) => {
    await dismissBlockingModals(adminPage);
    await adminPage.goto('/admin/mission-control/key-vault');
    await adminPage.waitForLoadState('domcontentloaded');

    // Look for navigation elements
    const hasNav =
      (await adminPage
        .locator('nav')
        .isVisible({ timeout: 3000 })
        .catch(() => false)) ||
      (await adminPage
        .locator('[role="navigation"]')
        .isVisible({ timeout: 3000 })
        .catch(() => false)) ||
      (await adminPage.locator('a[href*="/admin"]').count()) > 0;

    expect(hasNav, 'Page should have navigation elements').toBe(true);
  });

  test('can navigate between mission control pages', async ({ adminPage }) => {
    await dismissBlockingModals(adminPage);

    // Start at one page
    await adminPage.goto('/admin/mission-control/key-vault');
    await adminPage.waitForLoadState('domcontentloaded');

    // Verify we're on an admin page (may include locale prefix)
    const startUrl = adminPage.url();
    expect(
      startUrl.includes('key-vault') || startUrl.includes('/admin'),
      `Should be on admin page, got: ${startUrl}`,
    ).toBe(true);

    // Navigate to another (if there's a link)
    const healthLink = adminPage.locator('a[href*="health"]').first();
    if (await healthLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await healthLink.click();
      await adminPage.waitForURL('**/health**', { timeout: 10000 });
      expect(adminPage.url()).toContain('health');
    }
  });
});

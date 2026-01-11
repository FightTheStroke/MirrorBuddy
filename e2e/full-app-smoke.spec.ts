/**
 * Smoke Test - Minimal verification that app loads correctly
 *
 * Tests: homepage, key routes, API health, no critical errors
 * Run: npx playwright test e2e/full-app-smoke.spec.ts
 */

import { test, expect } from '@playwright/test';

const CRITICAL_ROUTES = ['/', '/welcome', '/astuccio', '/supporti', '/showcase'];

const IGNORE_ERRORS = [
  /ResizeObserver loop/i,
  /Download the React DevTools/i,
  /favicon\.ico/i,
  /401.*Unauthorized/i,
  /429.*Too Many Requests/i,
  /net::ERR_/i,
  /Failed to load resource/i,
  /hydrat/i,
  /WebSocket/i,
  /realtime.*token/i,
];

test.describe('Smoke Test', () => {
  test('homepage loads without critical errors', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!IGNORE_ERRORS.some(p => p.test(text))) {
          errors.push(text);
        }
      }
    });

    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('main').first()).toBeVisible();

    expect(errors, `Console errors: ${errors.join(', ')}`).toHaveLength(0);
  });

  test('critical routes load', async ({ page }) => {
    for (const route of CRITICAL_ROUTES) {
      await page.goto(route, { timeout: 15000 });
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('API health check', async ({ request }) => {
    const response = await request.get('/api/health');
    // Accept 200 (ok), 503 (degraded), or even 401 (unauth) - just verify endpoint exists
    expect([200, 401, 503]).toContain(response.status());
  });

  test('navigation has expected elements', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should have main navigation buttons
    const navButtons = page.locator('button').filter({ hasText: /Professori|Astuccio|Zaino|Impostazioni/i });
    const btnCount = await navButtons.count();
    expect(btnCount).toBeGreaterThanOrEqual(3);
  });

  test('navigation sidebar works', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click astuccio nav - should show astuccio content
    const astuccioBtn = page.locator('button').filter({ hasText: /Astuccio/i }).first();
    if (await astuccioBtn.isVisible()) {
      await astuccioBtn.click();
      await page.waitForTimeout(500);
      // Verify content changed (Astuccio has "Il Tuo Astuccio" heading)
      await expect(page.locator('h1, h2').filter({ hasText: /Astuccio/i })).toBeVisible();
    }
  });

  test('settings page loads', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const settingsBtn = page.locator('button').filter({ hasText: /Impostazioni/i }).first();
    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      await page.waitForTimeout(500);
      // Settings should show some content
      await expect(page.locator('main').first()).toBeVisible();
    }
  });
});

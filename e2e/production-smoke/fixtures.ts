/**
 * Production Smoke Test Fixtures
 *
 * Lightweight fixtures for production read-only tests.
 * Bypasses consent walls via route mocking and localStorage —
 * same pattern as base-fixtures.ts but without DB dependencies.
 *
 * These tests NEVER write data to production. They only:
 * - Navigate pages
 * - Verify UI renders
 * - Check API responses (GET only)
 * - Validate accessibility features
 */

import { test as base, expect } from '@playwright/test';

export const test = base.extend({
  page: async ({ page, context }, use) => {
    // Mock TOS API to bypass TosGateProvider
    await page.route('**/api/tos', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ accepted: true, version: '1.0' }),
      });
    });

    // Mock trial session to prevent 401 noise
    await page.route('**/api/trial/session', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          visitorId: 'smoke-test-visitor',
          createdAt: new Date().toISOString(),
        }),
      });
    });

    // Mock tracking endpoints to prevent 401 noise
    await page.route('**/api/funnel/track', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
    await page.route('**/api/user/consent', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });

    // Set consent in localStorage before navigation
    await context.addInitScript(() => {
      const consent = JSON.stringify({
        essential: true,
        analytics: false,
        marketing: false,
        timestamp: new Date().toISOString(),
        version: '1.0',
      });
      try {
        localStorage.setItem('mirrorbuddy-consent', consent);
        localStorage.setItem(
          'mirrorbuddy-unified-consent',
          JSON.stringify({
            tos: { accepted: true, version: '1.0' },
            cookies: { essential: true, analytics: false },
            trial: { accepted: true, version: '1.0' },
          }),
        );
      } catch {
        // localStorage may not be available
      }
    });

    // Set trial consent cookie
    const baseUrl = process.env.PROD_URL || 'https://mirrorbuddy.vercel.app';
    await context.addCookies([
      {
        name: 'mirrorbuddy-trial-consent',
        value: JSON.stringify({ accepted: true, version: '1.0' }),
        domain: new URL(baseUrl).hostname,
        path: '/',
      },
    ]);

    await use(page);
  },
});

export { expect };

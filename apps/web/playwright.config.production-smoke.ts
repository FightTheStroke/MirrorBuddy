/**
 * Playwright Config — Production Smoke Tests
 *
 * Standalone config for read-only smoke tests against production.
 * NO database required, NO local server, NO data mutations.
 *
 * Usage:
 *   npm run test:smoke:prod
 *   npm run test:smoke:prod -- --headed   # watch in browser
 *   PROD_URL=https://mirrorbuddy.org npx playwright test --config playwright.config.production-smoke.ts
 *
 * Admin tests (54 tests):
 *   Without ADMIN_READONLY_COOKIE_VALUE, admin panel tests are SKIPPED.
 *   Set it from .env to run full coverage:
 *
 *   ADMIN_READONLY_COOKIE_VALUE="<value-from-.env>" \
 *   PROD_URL=https://mirrorbuddy.org \
 *   npx playwright test --config playwright.config.production-smoke.ts
 *
 *   The value is a signed cookie (HMAC-SHA256) for the read-only admin user.
 *   See .env line ADMIN_READONLY_COOKIE_VALUE for the current production value.
 *   Without it: ~193 tests run, ~57 skipped. With it: ~247 tests run, ~3 skipped.
 */

import { defineConfig, devices } from '@playwright/test';

const PROD_URL = process.env.PROD_URL || 'https://mirrorbuddy.vercel.app';

export default defineConfig({
  testDir: './e2e/production-smoke',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  timeout: 30000,
  retries: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report/production-smoke' }],
  ],
  use: {
    baseURL: PROD_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 15000,
    launchOptions: {
      args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
    },
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'] },
    },
  ],
});

/**
 * Playwright Config — Production Smoke Tests
 *
 * Standalone config for read-only smoke tests against production.
 * NO database required, NO local server, NO data mutations.
 *
 * Usage:
 *   npm run test:smoke:prod
 *   npm run test:smoke:prod -- --headed   # watch in browser
 *   PLAYWRIGHT_CHANNEL=msedge pnpm test:smoke:prod --project=desktop
 *   PROD_URL=https://mirrorbuddy.org npx playwright test --config playwright.config.production-smoke.ts
 *
 * Authenticated student tests use PROD_TEST_USER_ID and the pre-signed
 * PROD_TEST_USER_COOKIE_VALUE. Credential login verification runs separately
 * via `pnpm verify:smoke:prod:login`, outside the Playwright test runner.
 *
 * Admin tests require ADMIN_READONLY_COOKIE_VALUE; without it they are skipped.
 * The trusted post-promotion job supplies a private, run-specific native session
 * for the existing read-only account, with a fixed 60-minute lifetime. It revokes
 * that session after smoke and uploads only sanitized failure outcomes.
 * Local invocations must supply independently authorized access; never print or
 * retain a bearer in browser artifacts. See docs/readonly-smoke-access.md.
 */

import { defineConfig, devices } from '@playwright/test';

const PROD_URL = process.env.PROD_URL || 'https://mirrorbuddy.vercel.app';
// Locally we drive the installed Microsoft Edge (same Chromium engine) so a
// developer machine never needs Playwright's ~130MB bundled browser download.
// CI runners have no Edge, so they keep the bundled Chromium.
const PLAYWRIGHT_CHANNEL =
  process.env.PLAYWRIGHT_CHANNEL ?? (process.env.CI ? undefined : 'msedge');
const browserUse = {
  browserName: 'chromium' as const,
  ...(PLAYWRIGHT_CHANNEL ? { channel: PLAYWRIGHT_CHANNEL } : {}),
};

export default defineConfig({
  testDir: './e2e/production-smoke',
  fullyParallel: false,
  // Keep production load predictable. Test-runner coverage uses only
  // pre-signed storage state and never submits login credentials.
  workers: 1,
  forbidOnly: !!process.env.CI,
  timeout: 30000,
  retries: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report/production-smoke' }],
  ],
  use: {
    baseURL: PROD_URL,
    // Authenticated cookies must never be serialized into retained artifacts.
    trace: 'off',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 10000,
    navigationTimeout: 15000,
    launchOptions: {
      args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
    },
  },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        ...browserUse,
      },
    },
    {
      name: 'mobile',
      use: {
        ...devices['iPhone 13'],
        ...browserUse,
      },
    },
  ],
});

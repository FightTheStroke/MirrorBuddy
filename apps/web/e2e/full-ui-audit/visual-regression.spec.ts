/**
 * Visual Regression Baseline Snapshots - E2E Test
 *
 * Purpose:
 * - Capture baseline screenshots of key pages for visual regression detection
 * - Cover multiple viewports (desktop, mobile)
 * - Enable detection of unintended UI changes
 *
 * Run baseline capture:
 *   VISUAL_REGRESSION=1 npx playwright test e2e/full-ui-audit/visual-regression.spec.ts --update-snapshots
 *
 * Run regression comparison:
 *   VISUAL_REGRESSION=1 npx playwright test e2e/full-ui-audit/visual-regression.spec.ts
 *
 * Note: Snapshots stored in e2e/full-ui-audit/__snapshots__/
 * Threshold configured in playwright.config.ts (default: 10% pixel diff tolerance)
 */

import { test, expect } from '../fixtures/base-fixtures';
import type { Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const expectedVersion = readFileSync(resolve(__dirname, '../../../../VERSION'), 'utf8').trim();

async function expectScreenshot(page: Page, name: string) {
  const versions = page.getByText(/^v\d+\.\d+\.\d+$/);
  for (const label of await versions.all()) {
    await expect(label).toHaveText(`v${expectedVersion}`);
  }
  // Release numbers intentionally differ; verify them separately before masking.
  await expect(page).toHaveScreenshot(name, { mask: [versions] });
}

// Wait for content to stabilize before taking screenshots
const WAIT_FOR_STABLE = 800; // ms

// Viewport configurations for baseline testing
const VIEWPORTS = {
  desktop: { width: 1280, height: 720 },
  mobile: { width: 375, height: 667 },
} as const;

test.describe('Visual Regression - Baseline Snapshots', () => {
  // Only run when VISUAL_REGRESSION flag is set
  test.skip(
    !process.env.VISUAL_REGRESSION,
    'Set VISUAL_REGRESSION=1 to run visual regression tests',
  );

  test.beforeEach(async ({ page }) => {
    // Ensure consistent test environment
    if (page.viewportSize()?.width === 0) {
      await page.setViewportSize({ width: 1280, height: 720 });
    }
  });

  test('rejects an incorrect release label before masking it', async ({ page }) => {
    await page.goto('/welcome', { waitUntil: 'domcontentloaded' });
    const version = page.getByText(/^v\d+\.\d+\.\d+$/).first();
    await expect(version).toBeVisible();
    await version.evaluate((element) => {
      element.textContent = 'v0.0.0';
    });
    await expect(expectScreenshot(page, 'invalid-version-must-not-exist.png')).rejects.toThrow(
      /toHaveText/,
    );
  });

  // ========== HOME PAGE ==========
  test('home page - desktop baseline', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(WAIT_FOR_STABLE);
    await expectScreenshot(page, 'home-desktop.png');
  });

  test('home page - mobile baseline', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(WAIT_FOR_STABLE);
    await expectScreenshot(page, 'home-mobile.png');
  });

  // ========== WELCOME PAGE ==========
  test('welcome page - desktop baseline', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto('/welcome', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(WAIT_FOR_STABLE);
    await expectScreenshot(page, 'welcome-desktop.png');
  });

  test('welcome page - mobile baseline', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/welcome', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(WAIT_FOR_STABLE);
    await expectScreenshot(page, 'welcome-mobile.png');
  });

  // ========== ASTUCCIO PAGE ==========
  test('astuccio page - desktop baseline', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto('/astuccio', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(WAIT_FOR_STABLE);
    await expectScreenshot(page, 'astuccio-desktop.png');
  });

  test('astuccio page - mobile baseline', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/astuccio', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(WAIT_FOR_STABLE);
    await expectScreenshot(page, 'astuccio-mobile.png');
  });

  // ========== ADMIN DASHBOARD ==========
  test('admin dashboard - desktop baseline', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(WAIT_FOR_STABLE);
    await expectScreenshot(page, 'admin-dashboard-desktop.png');
  });

  test('admin dashboard - mobile baseline', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(WAIT_FOR_STABLE);
    await expectScreenshot(page, 'admin-dashboard-mobile.png');
  });

  // ========== SETTINGS (via home page interaction) ==========
  test('settings modal - desktop baseline', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    // Click settings button if visible
    const settingsBtn = page
      .locator('button')
      .filter({ hasText: /Impostazioni/i })
      .first();
    test.skip(
      !(await settingsBtn.isVisible()),
      'Settings action is absent in this fixture; no visual comparison',
    );
    await settingsBtn.click();
    await page.waitForTimeout(WAIT_FOR_STABLE);
    await expectScreenshot(page, 'settings-desktop.png');
  });

  test('settings modal - mobile baseline', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    // Click settings button if visible
    const settingsBtn = page
      .locator('button')
      .filter({ hasText: /Impostazioni/i })
      .first();
    test.skip(
      !(await settingsBtn.isVisible()),
      'Settings action is absent in this fixture; no visual comparison',
    );
    await settingsBtn.click();
    await page.waitForTimeout(WAIT_FOR_STABLE);
    await expectScreenshot(page, 'settings-mobile.png');
  });

  // ========== LANDING PAGE ==========
  test('landing page - desktop baseline', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto('/landing', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(WAIT_FOR_STABLE);
    await expectScreenshot(page, 'landing-desktop.png');
  });

  test('landing page - mobile baseline', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/landing', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(WAIT_FOR_STABLE);
    await expectScreenshot(page, 'landing-mobile.png');
  });
});

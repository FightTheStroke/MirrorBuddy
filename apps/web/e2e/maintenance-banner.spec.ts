/**
 * E2E: the maintenance banner warns a student before the service is suspended.
 *
 * These tests prove, in a real browser, the two things a unit test in jsdom
 * cannot: the "learn more" link keeps the active locale prefix
 * (localePrefix: "always"), and the fixed banner reserves space above the fixed
 * site header instead of covering it. Both run on the child home (/it), where a
 * student would actually lose work.
 *
 * Run: npx playwright test e2e/maintenance-banner.spec.ts --project=chromium
 */

import { test, expect } from './fixtures/auth-fixtures';
import type { Page } from '@playwright/test';

// Trial mode (unauthenticated child space); large screen for the full header.
test.use({ storageState: undefined, viewport: { width: 1920, height: 1080 } });

const UPCOMING_START = new Date(Date.now() + 90 * 60 * 1000).toISOString();

async function setupHomeMocks(page: Page): Promise<void> {
  await page.route('**/api/user/trial-status', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ isTrialUser: true }),
    }),
  );
  await page.route('**/api/onboarding', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        onboardingState: {
          hasCompletedOnboarding: true,
          onboardingCompletedAt: new Date().toISOString(),
          currentStep: 'ready',
          isReplayMode: false,
        },
        hasExistingData: true,
        data: {
          name: 'Trial User',
          age: 15,
          schoolLevel: 'media',
          learningDifferences: [],
          gender: 'other',
        },
      }),
    }),
  );
  await page.route('**/api/tos', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ accepted: true, version: '1.0' }),
    }),
  );
}

async function mockMaintenance(page: Page, payload: Record<string, unknown>): Promise<void> {
  await page.route('**/api/maintenance', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload),
    }),
  );
}

test.describe('Maintenance banner', () => {
  test.setTimeout(60000);

  test('does not render when no window is scheduled', async ({ trialPage }) => {
    await setupHomeMocks(trialPage);
    await mockMaintenance(trialPage, { status: 'none' });

    await trialPage.goto('/it');
    await expect(trialPage.getByTestId('intent-card-homework')).toBeVisible({ timeout: 20000 });

    await expect(trialPage.getByTestId('maintenance-banner')).toHaveCount(0);
  });

  test('warns before an upcoming window: keeps the locale and never covers the header', async ({
    trialPage,
  }) => {
    await setupHomeMocks(trialPage);
    await mockMaintenance(trialPage, {
      status: 'upcoming',
      severity: 'medium',
      startTime: UPCOMING_START,
    });

    await trialPage.goto('/it');
    await expect(trialPage.getByTestId('intent-card-homework')).toBeVisible({ timeout: 20000 });

    const banner = trialPage.getByTestId('maintenance-banner');
    await expect(banner).toBeVisible();

    // Locale is preserved on the link (localePrefix: "always").
    const learnMore = banner.getByRole('link');
    await expect(learnMore).toHaveAttribute('href', '/it/maintenance');

    // The banner sits at the very top and the header sits fully below it.
    const bannerBox = await banner.boundingBox();
    const header = trialPage.locator('header').first();
    await expect(header).toBeVisible();
    const headerBox = await header.boundingBox();

    expect(bannerBox).not.toBeNull();
    expect(headerBox).not.toBeNull();
    if (bannerBox && headerBox) {
      expect(bannerBox.y).toBeLessThanOrEqual(1);
      // Header top must start at or below the banner's bottom edge (no overlap).
      expect(headerBox.y).toBeGreaterThanOrEqual(bannerBox.y + bannerBox.height - 1);
    }
  });

  test('dismissal lasts only for the browser session', async ({ trialPage }) => {
    await setupHomeMocks(trialPage);
    await mockMaintenance(trialPage, { status: 'active', severity: 'medium' });

    await trialPage.goto('/it');
    await expect(trialPage.getByTestId('intent-card-homework')).toBeVisible({ timeout: 20000 });

    const banner = trialPage.getByTestId('maintenance-banner');
    await expect(banner).toBeVisible();

    await banner.getByRole('button').click();
    await expect(banner).toHaveCount(0);

    // Persisted in sessionStorage, never localStorage (GDPR).
    const storage = await trialPage.evaluate(() => ({
      session: sessionStorage.getItem('maintenance-banner-dismissed'),
      local: localStorage.getItem('maintenance-banner-dismissed'),
    }));
    expect(storage.session).toBe('true');
    expect(storage.local).toBeNull();
  });
});

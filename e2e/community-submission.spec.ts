import { test, expect } from './fixtures/base-fixtures';
import { signCookieValue } from './fixtures/auth-fixtures-helpers';

async function authenticateUser(page: import('@playwright/test').Page) {
  const randomSuffix = crypto.randomUUID().replace(/-/g, '').substring(0, 9);
  const sessionId = `community-test-session-${Date.now()}-${randomSuffix}`;
  const signedCookie = signCookieValue(sessionId);

  await page.context().addCookies([
    {
      name: 'mirrorbuddy-user-id',
      value: signedCookie,
      domain: 'localhost',
      path: '/',
      sameSite: 'Lax',
    },
    {
      name: 'mirrorbuddy-user-id-client',
      value: sessionId,
      domain: 'localhost',
      path: '/',
      sameSite: 'Lax',
    },
  ]);

  await page.addInitScript(() => {
    localStorage.setItem(
      'mirrorbuddy-onboarding',
      JSON.stringify({
        state: {
          hasCompletedOnboarding: true,
          onboardingCompletedAt: new Date().toISOString(),
          currentStep: 'ready',
          isReplayMode: false,
          data: {
            name: 'Community User',
            age: 16,
            schoolLevel: 'superiore',
            learningDifferences: [],
            gender: 'other',
          },
        },
        version: 0,
      }),
    );
  });
}

test.describe('Community submission flow', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page);

    await page.route('**/api/community/list**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [] }),
      });
    });

    await page.route('**/api/community/submit', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'community-test-1', status: 'pending' }),
      });
    });
  });

  test('renders form and submits a contribution', async ({ page }) => {
    await page.goto('/it/community', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('#contribution-title')).toBeVisible();
    await expect(page.locator('#contribution-content')).toBeVisible();
    await expect(page.locator('#contribution-type')).toBeVisible();

    await page.fill('#contribution-title', 'Suggerimento E2E community');
    await page.fill(
      '#contribution-content',
      'Contenuto di test per verificare il flusso di invio contributi.',
    );
    await page.selectOption('#contribution-type', 'tip');

    await page.click('button[type="submit"]');

    await expect(page.getByText('Contribution submitted successfully.')).toBeVisible();
  });

  test('form is accessible and usable on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/it/community', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('#contribution-title')).toBeVisible();
    await expect(page.locator('#contribution-content')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    await page.fill('#contribution-title', 'Mobile contribution test');
    await page.fill('#contribution-content', 'Test contenuto mobile.');
    await page.selectOption('#contribution-type', 'resource');
    await page.click('button[type="submit"]');
    await expect(page.getByText('Contribution submitted successfully.')).toBeVisible();
  });
});

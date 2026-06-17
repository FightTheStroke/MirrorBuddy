/**
 * Parental gate (#432)
 *
 * The adult area ("Per i grandi": Settings, Parent area, Calendar) must be
 * gated behind a child-resistant challenge:
 * - a math challenge when no parent PIN is configured (covers trial users), and
 * - a PIN prompt once a parent PIN has been set.
 */

import { test, expect } from './fixtures/base-fixtures';
import type { Page } from '@playwright/test';

// Land on the authenticated home, bypassing welcome/onboarding.
async function mockHome(page: Page): Promise<void> {
  await page.route('/api/onboarding', (route) =>
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
        data: { name: 'Test', age: 12, schoolLevel: 'media', learningDifferences: [] },
      }),
    }),
  );
  await page.route('/api/user/settings', (route) =>
    route.request().method() === 'GET'
      ? route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            studentProfile: { preferredCoach: 'melissa', preferredBuddy: 'mario' },
          }),
        })
      : route.fulfill({ status: 200, body: '{}' }),
  );
  await page.route('/api/tos', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ accepted: true, version: '1.0' }),
    }),
  );
  await page.route('/api/progress', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        xp: 0,
        level: 1,
        streak: 0,
        totalStudyMinutes: 0,
        sessionsThisWeek: 0,
        questionsAsked: 0,
      }),
    }),
  );
}

const UNLOCK = /sblocca|unlock/i;

test.describe('Parental gate (#432)', () => {
  test('math challenge gates the adult Settings area', async ({ page }) => {
    await mockHome(page);
    await page.route('/api/user/parental-pin', (route) =>
      route.request().method() === 'GET'
        ? route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ isSet: false }),
          })
        : route.fulfill({ status: 200, body: '{}' }),
    );

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('home-nav-settings').click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const labelText = await page.locator('label[for="parental-math"]').innerText();
    const match = labelText.match(/(\d+)\s*\+\s*(\d+)/);
    expect(match).not.toBeNull();
    const sum = Number(match![1]) + Number(match![2]);

    // Wrong answer keeps the gate closed.
    await page.locator('#parental-math').fill(String(sum + 1));
    await dialog.getByRole('button', { name: UNLOCK }).click();
    await expect(dialog).toBeVisible();

    // Correct answer unlocks and dismisses the gate.
    await page.locator('#parental-math').fill(String(sum));
    await dialog.getByRole('button', { name: UNLOCK }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('cancelling the gate keeps the child on the safe area', async ({ page }) => {
    await mockHome(page);
    await page.route('/api/user/parental-pin', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ isSet: false }),
      }),
    );

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('home-nav-settings').click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: /annulla|cancel/i }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('PIN challenge gates the adult area when a PIN is configured', async ({ page }) => {
    await mockHome(page);
    await page.route('/api/session', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ csrfToken: 'test-token' }),
      }),
    );
    await page.route('/api/user/parental-pin', (route) =>
      route.request().method() === 'GET'
        ? route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ isSet: true }),
          })
        : route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ valid: true }),
          }),
    );

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('home-nav-settings').click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await page.locator('#parental-pin').fill('1234');
    await dialog.getByRole('button', { name: UNLOCK }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
  });
});

import { test, expect } from './fixtures/base-fixtures';
import { mockOnboarding, mockHomePageAPIs, mockTracking } from './fixtures/api-mocks';

/**
 * E2E coverage for the intention-based home (PR #430).
 *
 * Guards the child-first UX that replaced the 26-Maestri grid:
 *  - three intents, with study/quizMe gated for trial users;
 *  - homework routes through a child-safe subject picker (no adult subjects)
 *    plus an "I don't know" generalist option;
 *  - the sidebar exposes only 3 child destinations + a separated grown-ups
 *    group (no coach/buddy/tools launcher);
 *  - the PII '[decryption-failed]' placeholder never reaches the greeting.
 *
 * Runs in Italian (forced) so text-based assertions are stable; structural
 * assertions use data-testid.
 */

test.beforeEach(async ({ page, context }) => {
  await context.setExtraHTTPHeaders({ 'Accept-Language': 'it-IT,it;q=0.9' });
  await context.addCookies([{ name: 'NEXT_LOCALE', value: 'it', domain: 'localhost', path: '/' }]);
  await mockOnboarding(page);
  await mockHomePageAPIs(page);
  await mockTracking(page);
});

async function gotoHome(page: import('@playwright/test').Page, width = 1280) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/');
  await expect(page.locator('#intent-heading')).toBeVisible({ timeout: 20000 });
}

test('shows three intents — homework unlocked, study/quizMe gated for trial', async ({ page }) => {
  await gotoHome(page);
  // Homework is always available; wait for it to settle (tier finished loading).
  await expect(page.getByTestId('intent-card-homework')).toBeEnabled();
  // Trial-locked cards stay focusable (A11Y-03): they are NOT natively `disabled`
  // but expose aria-disabled so screen-reader / keyboard users can reach them
  // and hear why they are locked.
  await expect(page.getByTestId('intent-card-study')).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByTestId('intent-card-quizMe')).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByTestId('intent-card-study')).toBeEnabled();
});

test('homework opens a child-safe subject picker with an "I do not know" option', async ({
  page,
}) => {
  await gotoHome(page);
  await page.getByTestId('intent-card-homework').click();
  await expect(page.locator('#intent-subject-heading')).toBeVisible();
  await expect(page.getByTestId('intent-subject-any')).toBeVisible();
  await expect(page.getByTestId('subject-mathematics')).toBeVisible();
  // Adult / abstract / joke subjects must never appear in the child picker.
  await expect(page.getByTestId('subject-supercazzola')).toHaveCount(0);
  await expect(page.getByTestId('subject-economics')).toHaveCount(0);
  await expect(page.getByTestId('subject-philosophy')).toHaveCount(0);
  await expect(page.getByTestId('subject-internationalLaw')).toHaveCount(0);
});

test('sidebar shows 3 child destinations + a separated grown-ups group', async ({ page }) => {
  await gotoHome(page);
  // Child space
  await expect(page.getByTestId('home-nav-intent')).toBeVisible();
  await expect(page.getByTestId('home-nav-supporti')).toBeVisible();
  await expect(page.getByTestId('home-nav-progress')).toBeVisible();
  // Grown-ups group still reachable, just separated
  await expect(page.getByTestId('home-nav-maestri')).toBeVisible();
  await expect(page.getByTestId('home-nav-calendar')).toBeVisible();
  await expect(page.getByTestId('home-nav-settings')).toBeVisible();
  // Removed from the child nav entirely
  await expect(page.getByTestId('home-nav-coach')).toHaveCount(0);
  await expect(page.getByTestId('home-nav-buddy')).toHaveCount(0);
  await expect(page.getByTestId('home-nav-astuccio')).toHaveCount(0);
});

test('picking a subject advances out of the intent chooser into a session', async ({ page }) => {
  await gotoHome(page);
  await page.getByTestId('intent-card-homework').click();
  await expect(page.locator('#intent-subject-heading')).toBeVisible();
  await page.getByTestId('subject-mathematics').click();
  // The chooser unmounts once a session opens (currentView !== 'intent').
  await expect(page.locator('#intent-subject-heading')).toHaveCount(0);
  await expect(page.locator('#intent-heading')).toHaveCount(0);
});

test('never shows the PII decryption placeholder as the student name', async ({ page }) => {
  // Server returns the placeholder when name decryption fails; the UI must
  // fall back to a generic greeting, never render "Ciao [decryption-failed]!".
  await page.route('**/api/user/profile', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ name: '[decryption-failed]', schoolLevel: 'media' }),
    });
  });
  await gotoHome(page);
  await expect(page.getByText('[decryption-failed]')).toHaveCount(0);
  // Generic (nameless) greeting is shown instead.
  await expect(page.locator('#intent-heading')).toContainText('Cosa facciamo oggi?');
});

import { test, expect } from './fixtures/base-fixtures';
import {
  mockOnboarding,
  mockHomePageAPIs,
  mockTracking,
  mockTrialTier,
} from './fixtures/api-mocks';

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
  // The global storageState authenticates every context as a registered
  // (Base) user; these specs cover the anonymous Trial child UX, so force
  // the Trial tier response (see mockTrialTier docs).
  await mockTrialTier(page);
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
  // (which would drop them from the Tab order) but expose aria-disabled so
  // screen-reader / keyboard users can reach them and hear why they are locked.
  const study = page.getByTestId('intent-card-study');
  await expect(study).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByTestId('intent-card-quizMe')).toHaveAttribute('aria-disabled', 'true');
  expect(await study.evaluate((el) => (el as HTMLButtonElement).disabled)).toBe(false);
  await study.focus();
  await expect(study).toBeFocused();
});

test('tapping a locked intent opens the child-friendly "ask a grown-up" dialog (UX-03)', async ({
  page,
}) => {
  await gotoHome(page);
  const study = page.getByTestId('intent-card-study');
  await expect(study).toHaveAttribute('aria-disabled', 'true');
  // The card is not natively disabled (A11Y-03) but exposes aria-disabled, which
  // Playwright treats as "disabled" and refuses to auto-click. Dispatch the DOM
  // click directly — aria-disabled does not block React's onClick handler. We
  // poll the dispatch so the very first render (tier still settling its closure)
  // can't swallow a single one-shot event.
  const dialog = page.getByTestId('intent-locked-dialog');
  await expect(async () => {
    await study.dispatchEvent('click');
    await expect(dialog).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 10000 });
  // Child-first copy, no prices / Stripe / upgrade CTA in the child space.
  await expect(dialog).toContainText('Chiedi a un grande');
  await expect(dialog).not.toContainText('9.99');
  await expect(dialog).not.toContainText('Pro');
  // It does NOT open a session.
  await expect(page.locator('#intent-subject-heading')).toHaveCount(0);
  // And it is dismissible.
  await page.getByTestId('intent-locked-dialog-close').click();
  await expect(dialog).toHaveCount(0);
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

test('the subject picker is grouped into labelled areas, sorted by localized label (DEC-03)', async ({
  page,
}) => {
  await gotoHome(page);
  await page.getByTestId('intent-card-homework').click();
  await expect(page.locator('#intent-subject-heading')).toBeVisible();

  // The flat 18-item list is now grouped into labelled areas (focus-group #1/#2
  // found the flat list overwhelming for every DSA profile).
  await expect(page.locator('#subject-area-numbersScience')).toBeVisible();
  await expect(page.locator('#subject-area-languages')).toBeVisible();
  await expect(page.locator('#subject-area-worldHistory')).toBeVisible();
  await expect(page.locator('#subject-area-artBody')).toBeVisible();

  // Maths lives in its area; every subject is still one tap away.
  await expect(
    page
      .locator('section[aria-labelledby="subject-area-numbersScience"]')
      .getByTestId('subject-mathematics'),
  ).toBeVisible();

  // Subjects are sorted by the LOCALIZED label, so the order is predictable for
  // keyboard users (fixes the "Inglese before Francese" English-key order):
  // within Languages, Francese must come before Inglese in DOM order.
  const languageIds = await page
    .locator('section[aria-labelledby="subject-area-languages"] [data-testid^="subject-"]')
    .evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')));
  expect(languageIds.indexOf('subject-french')).toBeLessThan(
    languageIds.indexOf('subject-english'),
  );
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

test('the grown-up area is gated behind a child-resistant challenge (COMP-01 / #432)', async ({
  page,
}) => {
  await gotoHome(page);
  // A child destination must NOT trigger the gate.
  await page.getByTestId('home-nav-progress').click();
  await expect(page.getByTestId('grown-up-gate')).toHaveCount(0);

  // A grown-up destination DOES — the view does not change until an adult passes.
  await page.getByTestId('home-nav-settings').click();
  await expect(page.getByTestId('grown-up-gate')).toBeVisible();

  // Solve the arithmetic challenge → the gate dismisses (session verified).
  const q = (await page.getByText(/\d+\s*\+\s*\d+/).textContent()) ?? '';
  const [a, b] = q.match(/\d+/g)!.map(Number);
  await page.getByTestId('grown-up-gate-input').fill(String(a + b));
  await page.getByTestId('grown-up-gate-submit').click();
  await expect(page.getByTestId('grown-up-gate')).toHaveCount(0);

  // Verified for the session: a second grown-up destination opens without re-gating.
  await page.getByTestId('home-nav-calendar').click();
  await expect(page.getByTestId('grown-up-gate')).toHaveCount(0);
});

test('the invite-request PII form is gated behind the grown-up challenge (COMP-01 / #431)', async ({
  page,
}) => {
  await page.goto('/invite/request');
  // The child sees the gate, NOT the email/name form.
  await expect(page.getByTestId('grown-up-gate')).toBeVisible();
  await expect(page.locator('#email')).toHaveCount(0);

  const q = (await page.getByText(/\d+\s*\+\s*\d+/).textContent()) ?? '';
  const [a, b] = q.match(/\d+/g)!.map(Number);
  await page.getByTestId('grown-up-gate-input').fill(String(a + b));
  await page.getByTestId('grown-up-gate-submit').click();

  // After a grown-up passes, the form is available.
  await expect(page.locator('#email')).toBeVisible();
});

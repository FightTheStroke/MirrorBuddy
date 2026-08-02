/**
 * Production Smoke Tests — Welcome & Authenticated Home
 *
 * The public route is the welcome experience. The intent-based home is only
 * available after login and no longer exposes the legacy 26-professor grid.
 */

import { test, authenticatedTest, expect, hasProdTestAuthCookie } from './fixtures';

test.describe('PROD-SMOKE: Public welcome', () => {
  test('Localized welcome page renders from /it', async ({ page }) => {
    await page.goto('/it');
    await expect(page).toHaveURL(/\/it\/welcome\/?$/, { timeout: 15000 });
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/MirrorBuddy/i);
  });

  test('Welcome page exposes its current public actions', async ({ page }) => {
    await page.goto('/it/welcome');
    await expect(page.getByRole('link', { name: /Accedi/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Scopri di più/i }).first()).toBeVisible();
  });
});

authenticatedTest.describe('PROD-SMOKE: Authenticated intent home', () => {
  authenticatedTest.skip(!hasProdTestAuthCookie, 'Production test auth cookie is not available');

  authenticatedTest('Home renders the three current learning actions', async ({ page }) => {
    await page.goto('/it');
    await expect(page).toHaveURL(/\/it\/?$/);
    await expect(page.getByTestId('intent-card-homework')).toContainText('Fare i compiti');
    await expect(page.getByTestId('intent-card-study')).toContainText('Studiare');
    await expect(page.getByTestId('intent-card-quizMe')).toContainText('Mettiti alla prova');
  });

  authenticatedTest('Home does not render the retired professor landing grid', async ({ page }) => {
    await page.goto('/it');
    await expect(page.getByRole('button', { name: /Studia con /i })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Professori', level: 1 })).toHaveCount(0);
  });
});

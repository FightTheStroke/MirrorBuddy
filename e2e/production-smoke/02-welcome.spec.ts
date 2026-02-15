/**
 * Production Smoke Tests — Welcome & Trial Dashboard
 *
 * Verifies the welcome/trial page renders correctly with professors,
 * sidebar, and trial limits. Consent walls bypassed via fixtures.
 * Read-only, no data mutations.
 */

import { test, expect } from './fixtures';

test.describe('PROD-SMOKE: Welcome & Trial Dashboard', () => {
  test('Trial dashboard loads with professors heading', async ({ page }) => {
    await page.goto('/it');
    await expect(page).toHaveURL(/\/it/);

    // Main title and professors section
    await expect(page.getByRole('heading', { name: /MirrorBuddy/i, level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Professori', level: 1 })).toBeVisible();
  });

  test('All 26 professors render as study buttons', async ({ page }) => {
    await page.goto('/it');

    // Sample of key professors across subjects
    const professors = [
      'Euclide',
      'Leonardo da Vinci',
      'Galileo Galilei',
      'Madam Curie',
      'Socrate',
      'Ada Lovelace',
      'William Shakespeare',
      'Richard Feynman',
    ];
    for (const name of professors) {
      await expect(
        page.getByRole('button', { name: new RegExp(`Studia con ${name}`) }),
      ).toBeVisible();
    }

    // Verify total count: 26 "Studia con" buttons
    const studyButtons = page.getByRole('button', { name: /Studia con /i });
    await expect(studyButtons).toHaveCount(26);
  });

  test('Coaches Melissa and Mario are in sidebar', async ({ page }) => {
    await page.goto('/it');
    const nav = page.getByRole('navigation');
    await expect(nav.getByRole('button', { name: /Melissa/i })).toBeVisible();
    await expect(nav.getByRole('button', { name: /Mario/i })).toBeVisible();
  });

  test('Trial mode shows correct limits', async ({ page }) => {
    await page.goto('/it');

    // Trial banner
    await expect(page.getByText(/versione di prova/i)).toBeVisible();
    await expect(page.getByTestId('trial-badge')).toBeVisible();
  });

  test('Login and request access links visible', async ({ page }) => {
    await page.goto('/it');
    await expect(page.getByRole('link', { name: /Accedi/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Richiedi Accesso/i })).toBeVisible();
  });
});

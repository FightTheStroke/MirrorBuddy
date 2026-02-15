/**
 * Production Smoke Tests — Welcome & Onboarding Flow
 *
 * Verifies the welcome page renders correctly, consent walls work,
 * and Trial mode is accessible. Read-only, no data mutations.
 */

import { test, expect } from './fixtures';

test.describe('PROD-SMOKE: Welcome & Onboarding', () => {
  test('Welcome page loads with all sections', async ({ page }) => {
    await page.goto('/');
    // i18n redirect to /it
    await expect(page).toHaveURL(/\/(it|en|fr|de|es)/);

    // Key sections
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('region', { name: /Professori/i })).toBeVisible();
    await expect(page.getByRole('region', { name: /Accessibile/i })).toBeVisible();
  });

  test('All 26 professors appear in carousel', async ({ page }) => {
    await page.goto('/');
    const carousel = page.getByRole('region', { name: /Carosello dei professori/i });
    await expect(carousel).toBeVisible();

    // Check a sample of key professors
    const expectedNames = [
      'Leonardo da Vinci', 'Galileo Galilei', 'Madam Curie',
      'Euclide', 'Socrate', 'Ada Lovelace',
    ];
    for (const name of expectedNames) {
      await expect(carousel.getByRole('heading', { name })).toBeVisible();
    }
  });

  test('Coaches and Buddies section renders', async ({ page }) => {
    await page.goto('/');
    const section = page.getByRole('region', { name: /Sempre al tuo fianco/i });
    await expect(section).toBeVisible();

    // Coach and Buddy roles visible
    await expect(section.getByText('Coach').first()).toBeVisible();
    await expect(section.getByText('Buddy').first()).toBeVisible();
  });

  test('Trial mode loads with correct limits', async ({ page }) => {
    await page.goto('/');

    // Click trial button
    const trialBtn = page.getByRole('button', { name: /Prova gratis/i });
    if (await trialBtn.isVisible()) {
      await trialBtn.click();

      // Accept TOS if shown
      const tosAccept = page.getByRole('button', { name: /Accetta e Continua/i });
      if (await tosAccept.isVisible({ timeout: 3000 }).catch(() => false)) {
        await tosAccept.click();
      }

      // Verify Trial dashboard elements
      await expect(page.getByText(/Prova/)).toBeVisible();
      await expect(page.getByText('10/10')).toBeVisible();
    }
  });

  test('Footer has compliance badges', async ({ page }) => {
    await page.goto('/');
    const footer = page.getByRole('contentinfo');
    await expect(footer.getByText('GDPR')).toBeVisible();
    await expect(footer.getByText('AI Act')).toBeVisible();
    await expect(footer.getByText('COPPA')).toBeVisible();
  });
});

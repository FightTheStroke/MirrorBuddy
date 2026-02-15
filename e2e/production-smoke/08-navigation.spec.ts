/**
 * Production Smoke Tests — Navigation & UI
 *
 * Verifies the main app navigation works: sidebar, professor filters,
 * search, settings, and key pages.
 */

import { test, expect } from './fixtures';

test.describe('PROD-SMOKE: Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Enter trial mode
    const trialBtn = page.getByRole('button', { name: /Prova gratis/i });
    if (await trialBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await trialBtn.click();
    }
    const tos = page.getByRole('button', { name: /Accetta e Continua/i });
    if (await tos.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tos.click();
    }
  });

  test('Sidebar navigation has all sections', async ({ page }) => {
    const nav = page.getByRole('navigation');
    const sections = ['Professori', 'Astuccio', 'Zaino', 'Calendario', 'Progresso', 'Impostazioni'];
    for (const section of sections) {
      await expect(nav.getByRole('button', { name: section })).toBeVisible();
    }
  });

  test('Professor subject filters work', async ({ page }) => {
    // Click a subject filter
    await page.getByRole('button', { name: 'Matematica' }).click();

    // Should show Euclide
    await expect(page.getByRole('button', { name: /Studia con Euclide/i })).toBeVisible();
  });

  test('Professor search works', async ({ page }) => {
    const search = page.getByRole('searchbox', { name: /Cerca professore/i });
    await search.fill('Shakespeare');

    // Should filter to Shakespeare
    await expect(
      page.getByRole('button', { name: /Studia con.*Shakespeare/i }),
    ).toBeVisible();
  });

  test('Quick coaches are accessible in sidebar', async ({ page }) => {
    // Melissa and Mario should be in sidebar
    const nav = page.getByRole('navigation');
    await expect(nav.getByRole('button', { name: /Melissa/i })).toBeVisible();
    await expect(nav.getByRole('button', { name: /Mario/i })).toBeVisible();
  });

  test('Gamification bar shows level and stats', async ({ page }) => {
    const banner = page.getByRole('banner');
    await expect(banner.getByText(/Lv\.\d/)).toBeVisible();
    await expect(banner.getByText(/Serie/i)).toBeVisible();
  });

  test('Login link is visible for trial users', async ({ page }) => {
    await expect(page.getByRole('link', { name: /Accedi/i }).first()).toBeVisible();
  });
});

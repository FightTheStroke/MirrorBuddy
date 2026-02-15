/**
 * Production Smoke Tests — Navigation & UI
 *
 * Verifies the main app navigation works: sidebar, professor filters,
 * search, gamification, and key pages. Trial dashboard auto-loads
 * via fixture consent bypass.
 */

import { test, expect } from './fixtures';

test.describe('PROD-SMOKE: Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/it');
  });

  test('Sidebar navigation has all sections', async ({ page }) => {
    const nav = page.getByRole('navigation');
    const sections = ['Professori', 'Astuccio', 'Zaino', 'Calendario', 'Progresso', 'Impostazioni'];
    for (const section of sections) {
      await expect(nav.getByRole('button', { name: section })).toBeVisible();
    }
  });

  test('Professor subject filters work', async ({ page }) => {
    await page.getByRole('button', { name: 'Matematica' }).click();

    // Should still show Euclide (math professor)
    await expect(page.getByRole('button', { name: /Studia con Euclide/i })).toBeVisible();
  });

  test('Professor search works', async ({ page }) => {
    const search = page.getByRole('searchbox', {
      name: /Cerca professore/i,
    });
    await search.fill('Shakespeare');

    await expect(page.getByRole('button', { name: /Studia con.*Shakespeare/i })).toBeVisible();
  });

  test('Quick coaches are accessible in sidebar', async ({ page }) => {
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

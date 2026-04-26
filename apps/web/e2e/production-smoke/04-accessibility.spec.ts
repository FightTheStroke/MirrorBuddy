/**
 * Production Smoke Tests — Accessibility
 *
 * Verifies accessibility features work in production:
 * - 7 DSA profiles activate correctly
 * - Quick settings toggles work
 * - Skip-to-content link exists
 * - ARIA landmarks present
 */

import { test, expect } from './fixtures';

test.describe('PROD-SMOKE: Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/it');
  });

  test('Skip-to-content link exists', async ({ page }) => {
    const skipLink = page.getByRole('link', { name: /Vai al contenuto/i });
    await expect(skipLink).toBeAttached();
    expect(await skipLink.getAttribute('href')).toBe('#main-content');
  });

  test('Accessibility panel opens with 7 DSA profiles', async ({ page }) => {
    await page.getByRole('button', { name: /Impostazioni accessibilità/i }).click();

    const dialog = page.getByRole('dialog', { name: /Accessibilità/i });
    await expect(dialog).toBeVisible();

    const profiles = ['Dislessia', 'ADHD', 'Visivo', 'Autismo', 'Uditivo'];
    for (const profile of profiles) {
      await expect(
        dialog.getByRole('button', { name: new RegExp(`Attiva profilo ${profile}`) }),
      ).toBeVisible();
    }
    // Separate checks for Motorio/Motorio+ to avoid regex collision
    await expect(
      dialog.getByRole('button', { name: 'Attiva profilo Motorio', exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByRole('button', { name: 'Attiva profilo Motorio+', exact: true }),
    ).toBeVisible();
  });

  test('Dyslexia profile activates font and voice', async ({ page }) => {
    await page.getByRole('button', { name: /Impostazioni accessibilità/i }).click();

    const dialog = page.getByRole('dialog', { name: /Accessibilità/i });
    await dialog.getByRole('button', { name: /Attiva profilo Dislessia/i }).click();

    // Font switch should auto-enable
    const fontSwitch = dialog.getByRole('switch', { name: /Font dislessia/i });
    await expect(fontSwitch).toBeChecked();

    // Voice selector should change from default
    const voiceSelect = dialog.getByRole('combobox', { name: /voce/i });
    await expect(voiceSelect).not.toHaveValue('');

    // Reset
    await dialog.getByRole('button', { name: /Ripristina/i }).click();
    await expect(fontSwitch).not.toBeChecked();
  });

  test('Quick settings toggles work', async ({ page }) => {
    await page.getByRole('button', { name: /Impostazioni accessibilità/i }).click();

    const dialog = page.getByRole('dialog', { name: /Accessibilità/i });

    const largeText = dialog.getByRole('switch', { name: /Testo grande/i });
    await largeText.click();
    await expect(largeText).toBeChecked();

    const highContrast = dialog.getByRole('switch', { name: /Alto contrasto/i });
    await highContrast.click();
    await expect(highContrast).toBeChecked();

    const reducedMotion = dialog.getByRole('switch', { name: /Riduci animazioni/i });
    await reducedMotion.click();
    await expect(reducedMotion).toBeChecked();

    // Reset all
    await dialog.getByRole('button', { name: /Ripristina/i }).click();
    await expect(largeText).not.toBeChecked();
    await expect(highContrast).not.toBeChecked();
    await expect(reducedMotion).not.toBeChecked();
  });

  test('Page has proper ARIA landmarks', async ({ page }) => {
    // Trial dashboard auto-loads with full layout
    await expect(page.getByRole('main').first()).toBeVisible();
    await expect(page.getByRole('banner').first()).toBeVisible();
    await expect(page.getByRole('complementary').first()).toBeVisible();
    await expect(page.getByRole('navigation').first()).toBeVisible();
  });
});

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
    await page.goto('/');
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

    // All 7 profiles
    const profiles = [
      'Dislessia', 'ADHD', 'Visivo', 'Motorio',
      'Autismo', 'Uditivo', 'Motorio+',
    ];
    for (const profile of profiles) {
      await expect(
        dialog.getByRole('button', { name: new RegExp(profile) }),
      ).toBeVisible();
    }
  });

  test('Dyslexia profile activates font and voice', async ({ page }) => {
    await page.getByRole('button', { name: /Impostazioni accessibilità/i }).click();

    const dialog = page.getByRole('dialog', { name: /Accessibilità/i });
    await dialog.getByRole('button', { name: /Dislessia/i }).click();

    // Font switch should auto-enable
    const fontSwitch = dialog.getByRole('switch', { name: /Font dislessia/i });
    await expect(fontSwitch).toBeChecked();

    // Voice selector should change from default
    const voiceSelect = dialog.getByRole('combobox', { name: /voce/i });
    const selectedVoice = await voiceSelect.inputValue();
    expect(selectedVoice).not.toBe('');

    // Reset
    await dialog.getByRole('button', { name: /Ripristina/i }).click();
    await expect(
      dialog.getByRole('switch', { name: /Font dislessia/i }),
    ).not.toBeChecked();
  });

  test('Quick settings toggles work', async ({ page }) => {
    await page.getByRole('button', { name: /Impostazioni accessibilità/i }).click();

    const dialog = page.getByRole('dialog', { name: /Accessibilità/i });

    // Toggle large text
    const largeText = dialog.getByRole('switch', { name: /Testo grande/i });
    await largeText.click();
    await expect(largeText).toBeChecked();

    // Toggle high contrast
    const highContrast = dialog.getByRole('switch', { name: /Alto contrasto/i });
    await highContrast.click();
    await expect(highContrast).toBeChecked();

    // Toggle reduced motion
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
    // Enter trial to get full layout
    const trialBtn = page.getByRole('button', { name: /Prova gratis/i });
    if (await trialBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await trialBtn.click();
      const tos = page.getByRole('button', { name: /Accetta e Continua/i });
      if (await tos.isVisible({ timeout: 2000 }).catch(() => false)) {
        await tos.click();
      }
    }

    // Main landmarks
    await expect(page.getByRole('main').first()).toBeVisible();
    await expect(page.getByRole('banner').first()).toBeVisible();
    await expect(page.getByRole('complementary').first()).toBeVisible();
    await expect(page.getByRole('navigation').first()).toBeVisible();
  });
});

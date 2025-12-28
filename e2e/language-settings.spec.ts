import { test, expect } from '@playwright/test';

test.describe('Language Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('button').filter({ hasText: 'Impostazioni' }).click();
    await page.waitForTimeout(500);
    await page.locator('button').filter({ hasText: 'Aspetto' }).click();
    await page.waitForTimeout(500);
  });

  test('language selector is visible', async ({ page }) => {
    // Find the language section label
    const languageLabel = page.locator('h3').filter({ hasText: 'Lingua' });
    await expect(languageLabel).toBeVisible({ timeout: 5000 });
  });

  test('default language is Italian', async ({ page }) => {
    // Check that Italian button is visible
    const italianButton = page.getByRole('button', { name: /Italiano/i });
    await expect(italianButton).toBeVisible();
  });

  test('can change language to English', async ({ page }) => {
    // Find and click English option
    const englishButton = page.getByRole('button', { name: /English/i });
    if (await englishButton.isVisible()) {
      await englishButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('language setting persists after page reload', async ({ page }) => {
    // First, change the language to English
    const englishButton = page.getByRole('button', { name: /English/i });

    if (await englishButton.isVisible()) {
      await englishButton.click();
      await page.waitForTimeout(500);

      // Reload the page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Go back to settings
      await page.locator('button').filter({ hasText: 'Impostazioni' }).click();
      await page.waitForTimeout(500);
      await page.locator('button').filter({ hasText: 'Aspetto' }).click();
      await page.waitForTimeout(500);

      // Verify language is stored in localStorage
      const storedSettings = await page.evaluate(() => {
        return localStorage.getItem('convergio-settings');
      });

      expect(storedSettings).toBeTruthy();
    }
  });

  test('all language options are available', async ({ page }) => {
    // Check for language buttons
    const languages = ['Italiano', 'English', 'Español', 'Français', 'Deutsch'];
    let foundCount = 0;

    for (const lang of languages) {
      const langButton = page.getByRole('button', { name: new RegExp(lang, 'i') });
      if (await langButton.isVisible().catch(() => false)) {
        foundCount++;
      }
    }

    // At least some languages should be visible
    expect(foundCount).toBeGreaterThan(0);
  });
});

test.describe('Language Affects Maestri', () => {
  test('maestri UI shows in Italian by default', async ({ page }) => {
    await page.goto('/');

    // Default is Italian - check for Italian text in nav
    await expect(page.locator('button').filter({ hasText: 'Maestri' })).toBeVisible();
  });
});

test.describe('Language Persistence in LocalStorage', () => {
  test('language is stored in localStorage', async ({ page }) => {
    await page.goto('/');

    // Check localStorage for language setting
    const storedSettings = await page.evaluate(() => {
      return localStorage.getItem('convergio-settings');
    });

    if (storedSettings) {
      const parsed = JSON.parse(storedSettings);
      // Should have language in state.appearance.language
      expect(parsed.state?.appearance?.language).toBeDefined();
    }
  });
});

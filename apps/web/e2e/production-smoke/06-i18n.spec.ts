/**
 * Production Smoke Tests — i18n
 *
 * Verifies all 5 locales load correctly and the UI is translated.
 */

import { test, expect } from './fixtures';

test.describe('PROD-SMOKE: Internationalization', () => {
  const locales = [
    { code: 'it', lang: 'it', text: /Professori|Benvenuto/i },
    { code: 'en', lang: 'en', text: /Professors|Welcome/i },
    { code: 'fr', lang: 'fr', text: /Professeurs|Bienvenue/i },
    { code: 'de', lang: 'de', text: /Professoren|Willkommen/i },
    { code: 'es', lang: 'es', text: /Profesores|Bienvenido/i },
  ];

  for (const { code, lang, text } of locales) {
    test(`/${code} loads with correct lang attribute`, async ({ page }) => {
      await page.goto(`/${code}`);
      const html = page.locator('html');
      await expect(html).toHaveAttribute('lang', lang);

      const bodyText = await page.textContent('body');
      expect(bodyText).toMatch(text);
    });
  }

  test('Default redirect goes to a locale path', async ({ page }) => {
    // Server-side locale detection varies by CDN/edge — accept any valid locale
    await page.goto('/');
    await expect(page).toHaveURL(/\/(it|en|fr|de|es)/);
  });

  test('Accept-Language: en redirects to /en', async ({ page, context }) => {
    await context.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
    await page.goto('/');
    await expect(page).toHaveURL(/\/en/);
  });
});

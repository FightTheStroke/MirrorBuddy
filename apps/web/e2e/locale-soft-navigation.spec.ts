/**
 * E2E: document language follows soft locale navigation (R4)
 *
 * The existing locale specs navigate with `page.goto`, which reloads the
 * document and therefore always re-renders `<html lang>` from the server. The
 * reported defect only appears on client-side navigation: the welcome language
 * switcher calls `router.push('/welcome', { locale })`, the URL and the content
 * change, and the root layout — which owns `<html lang>` — stays mounted.
 *
 * This spec drives the real switcher and asserts, for every supported locale,
 * that the document language follows without a full page reload.
 */

import { test, expect } from './fixtures';
import { locales, localeNames, type Locale } from '@/i18n/config';

// Unauthenticated public welcome page.
test.use({ storageState: undefined });

const RELOAD_PROBE = '__mbSoftNavProbe';

async function markDocument(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate((probe) => {
    (window as unknown as Record<string, unknown>)[probe] = 'kept';
  }, RELOAD_PROBE);
}

async function documentWasNotReloaded(page: import('@playwright/test').Page): Promise<boolean> {
  return page.evaluate(
    (probe) => (window as unknown as Record<string, unknown>)[probe] === 'kept',
    RELOAD_PROBE,
  );
}

async function switchLocaleViaSwitcher(
  page: import('@playwright/test').Page,
  target: Locale,
): Promise<void> {
  const trigger = page.locator('button[aria-haspopup="menu"]').first();
  await expect(trigger).toBeVisible();
  await trigger.click();

  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();

  await menu.getByRole('menuitem', { name: localeNames[target] }).click();
  await page.waitForURL(new RegExp(`/${target}/welcome`));
}

test.describe('Document language follows soft locale navigation', () => {
  test.setTimeout(180000);

  test('html lang follows the switcher for all five locales without reloading', async ({
    page,
  }) => {
    await page.goto('/it/welcome', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('lang', 'it');

    await markDocument(page);

    // Visit every non-default locale, then return to Italian, in one document.
    const sequence: Locale[] = [...locales.filter((locale) => locale !== 'it'), 'it'] as Locale[];

    for (const target of sequence) {
      await switchLocaleViaSwitcher(page, target);

      await expect(page.locator('html')).toHaveAttribute('lang', target, {
        timeout: 15000,
      });
      expect(page.url()).toContain(`/${target}/welcome`);

      // A full reload would repair `lang` for the wrong reason; assert the
      // navigation really stayed inside the same document.
      expect(await documentWasNotReloaded(page)).toBe(true);
    }
  });

  test('full reload still renders the requested locale', async ({ page }) => {
    await page.goto('/fr/welcome', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  });
});

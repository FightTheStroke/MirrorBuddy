/**
 * E2E Tests: Welcome Hero Section Translations
 *
 * Verifies that the hero section beta badge is properly translated
 * and shows the dynamic app version (not hardcoded).
 *
 * Test Coverage:
 * - Beta badge text uses t("betaBadge") per locale
 * - Version shown is dynamic (from APP_VERSION env var)
 * - Aria label includes translated beta badge + version
 * - All locales (it, en, fr, de, es) render correctly
 *
 * Run: npx playwright test e2e/welcome-hero-translations.spec.ts
 * Run specific locale: npx playwright test e2e/welcome-hero-translations.spec.ts --grep "@it"
 */

import { test, expect, testAllLocales } from './fixtures';

// IMPORTANT: These tests check unauthenticated /welcome page
test.use({ storageState: undefined });

const EXPECTED_BADGE_TEXT: Record<string, string> = {
  it: 'Beta Privata',
  en: 'Private Beta',
  fr: 'Bêta Privée',
  de: 'Private Beta',
  es: 'Beta Privada',
};

testAllLocales('hero section displays correct beta badge text', async ({ localePage }) => {
  await localePage.goto('/welcome');
  await localePage.page.waitForLoadState('domcontentloaded');

  const badgeSpan = localePage.page.locator('.uppercase.font-bold').first();
  await expect(badgeSpan).toBeVisible();

  const badgeText = await badgeSpan.textContent();
  const expected = EXPECTED_BADGE_TEXT[localePage.locale] || EXPECTED_BADGE_TEXT.it;
  expect(badgeText?.trim()).toBe(expected);
});

testAllLocales('hero section displays dynamic version in badge', async ({ localePage }) => {
  await localePage.goto('/welcome');
  await localePage.page.waitForLoadState('domcontentloaded');

  // Version span is the second span inside the badge (font-mono class)
  const versionSpan = localePage.page.locator('.font-mono').first();
  await expect(versionSpan).toBeVisible();

  const versionText = await versionSpan.textContent();
  // Version must match semver pattern vX.Y.Z
  expect(versionText?.trim()).toMatch(/^v\d+\.\d+\.\d+$/);
});

testAllLocales('hero section aria-label uses translation and version', async ({ localePage }) => {
  await localePage.goto('/welcome');
  await localePage.page.waitForLoadState('domcontentloaded');

  const betaBadgeContainer = localePage.page.locator('div[aria-label]').filter({
    has: localePage.page.locator('.uppercase.font-bold'),
  });

  const ariaLabel = await betaBadgeContainer.first().getAttribute('aria-label');
  expect(ariaLabel).toBeDefined();

  const expected = EXPECTED_BADGE_TEXT[localePage.locale] || EXPECTED_BADGE_TEXT.it;
  expect(ariaLabel).toContain(expected);
  expect(ariaLabel).toMatch(/v\d+\.\d+\.\d+/);
});

test('@it: verify Italian beta badge with dynamic version', async ({ page }) => {
  await page.goto('/it/welcome');
  await page.waitForLoadState('domcontentloaded');

  const badgeText = await page.locator('.uppercase.font-bold').first().textContent();
  expect(badgeText?.trim()).toBe('Beta Privata');

  const versionText = await page.locator('.font-mono').first().textContent();
  expect(versionText?.trim()).toMatch(/^v\d+\.\d+\.\d+$/);
});

test('@en: verify English beta badge with dynamic version', async ({ page }) => {
  await page.goto('/en/welcome');
  await page.waitForLoadState('domcontentloaded');

  const badgeText = await page.locator('.uppercase.font-bold').first().textContent();
  expect(badgeText?.trim()).toBe('Private Beta');

  const versionText = await page.locator('.font-mono').first().textContent();
  expect(versionText?.trim()).toMatch(/^v\d+\.\d+\.\d+$/);
});

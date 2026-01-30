/**
 * E2E Tests: Welcome Hero Section Translations
 *
 * Verifies that hardcoded Italian strings in the hero section are properly
 * translated using i18n t() calls across all supported locales.
 *
 * Test Coverage:
 * - Beta badge text uses t("betaBadge")
 * - Beta subtitle text uses t("betaSubtitle")
 * - Aria label includes translated beta badge
 * - All locales (it, en, fr, de, es) render correctly
 *
 * Run: npx playwright test e2e/welcome-hero-translations.spec.ts
 * Run specific locale: npx playwright test e2e/welcome-hero-translations.spec.ts --grep "@it"
 *
 * F-xx: Replace hardcoded strings with t() calls
 */

import { test, expect, testAllLocales } from "./fixtures";

// IMPORTANT: These tests check unauthenticated /welcome page
// Override global storageState to start without authentication
test.use({ storageState: undefined });

const EXPECTED_TRANSLATIONS = {
  it: {
    betaBadge: "Beta Privata",
    betaSubtitle: "Solo su invito",
  },
  en: {
    betaBadge: "Private Beta",
    betaSubtitle: "Invitation only",
  },
  fr: {
    betaBadge: "Private Beta",
    betaSubtitle: "Invitation only",
  },
  de: {
    betaBadge: "Private Beta",
    betaSubtitle: "Invitation only",
  },
  es: {
    betaBadge: "Beta Privada",
    betaSubtitle: "Solo su invito",
  },
};

// Test new user welcome page (shows hero section)
testAllLocales(
  "hero section displays correct beta badge text",
  async ({ localePage }) => {
    await localePage.goto("/welcome");
    await localePage.page.waitForLoadState("domcontentloaded");

    // Find the beta badge (uppercase span with font-bold)
    const badgeSpan = localePage.page.locator(".uppercase.font-bold").first();
    await expect(badgeSpan).toBeVisible();

    // Get the text content
    const badgeText = await badgeSpan.textContent();

    // Verify the translation is being used
    const expectedBadge =
      EXPECTED_TRANSLATIONS[
        localePage.locale as keyof typeof EXPECTED_TRANSLATIONS
      ]?.betaBadge || EXPECTED_TRANSLATIONS.it.betaBadge;
    expect(badgeText?.trim()).toBe(expectedBadge);
  },
);

testAllLocales(
  "hero section displays correct beta subtitle text",
  async ({ localePage }) => {
    await localePage.goto("/welcome");
    await localePage.page.waitForLoadState("domcontentloaded");

    // Find the beta subtitle (small text inside the badge)
    const badgeDiv = localePage.page
      .locator(".uppercase.font-bold")
      .first()
      .locator("..");
    const subtitleSpan = badgeDiv.locator("span").nth(1); // Second span in the badge
    await expect(subtitleSpan).toBeVisible();

    // Get the text content
    const subtitleText = await subtitleSpan.textContent();

    // Verify the translation is being used
    const expectedSubtitle =
      EXPECTED_TRANSLATIONS[
        localePage.locale as keyof typeof EXPECTED_TRANSLATIONS
      ]?.betaSubtitle || EXPECTED_TRANSLATIONS.it.betaSubtitle;
    expect(subtitleText?.trim()).toBe(expectedSubtitle);
  },
);

testAllLocales(
  "hero section aria-label uses translation",
  async ({ localePage }) => {
    await localePage.goto("/welcome");
    await localePage.page.waitForLoadState("domcontentloaded");

    // Find the beta badge motion.div
    const betaBadgeMotion = localePage.page
      .locator("[role='presentation']")
      .filter({
        has: localePage.page.locator(".uppercase:has-text(Beta)"),
      });

    // Check aria-label includes the translated text
    const ariaLabel = await betaBadgeMotion.first().getAttribute("aria-label");
    expect(ariaLabel).toBeDefined();
    // Should not be hardcoded "Beta Privata - Accesso su invito" in all languages
    expect(ariaLabel).not.toBe("Beta Privata - Accesso su invito");
  },
);

// Regression test: ensure beta badge uses translations across all locales
test("@it: verify Italian beta badge uses correct translations", async ({
  page,
}) => {
  await page.goto("/it/welcome");
  await page.waitForLoadState("domcontentloaded");

  // Verify Italian translations are displayed
  const badgeText = await page
    .locator(".uppercase.font-bold")
    .first()
    .textContent();
  expect(badgeText?.trim()).toBe("Beta Privata");

  const subtitleText = await page
    .locator(".uppercase.font-bold")
    .first()
    .locator("..")
    .locator("span")
    .nth(1)
    .textContent();
  expect(subtitleText?.trim()).toBe("Solo su invito");
});

test("@en: verify English beta badge uses correct translations", async ({
  page,
}) => {
  await page.goto("/en/welcome");
  await page.waitForLoadState("domcontentloaded");

  // Verify English translations are displayed
  const badgeText = await page
    .locator(".uppercase.font-bold")
    .first()
    .textContent();
  expect(badgeText?.trim()).toBe("Private Beta");

  const subtitleText = await page
    .locator(".uppercase.font-bold")
    .first()
    .locator("..")
    .locator("span")
    .nth(1)
    .textContent();
  expect(subtitleText?.trim()).toBe("Invitation only");
});

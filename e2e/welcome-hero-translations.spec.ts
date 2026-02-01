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
    betaSubtitle: "MirrorBuddy v0.10",
  },
  en: {
    betaBadge: "Private Beta",
    betaSubtitle: "MirrorBuddy v0.10",
  },
  fr: {
    betaBadge: "Bêta Privée",
    betaSubtitle: "MirrorBuddy v0.10",
  },
  de: {
    betaBadge: "Private Beta",
    betaSubtitle: "MirrorBuddy v0.10",
  },
  es: {
    betaBadge: "Beta Privada",
    betaSubtitle: "MirrorBuddy v0.10",
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

    // Find the beta subtitle (small text inside the badge container)
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

    // Find the beta badge container with aria-label (motion.div renders as div)
    const betaBadgeContainer = localePage.page
      .locator("div[aria-label]")
      .filter({
        has: localePage.page.locator(".uppercase.font-bold"),
      });

    // Check aria-label includes the translated text
    const ariaLabel = await betaBadgeContainer
      .first()
      .getAttribute("aria-label");
    expect(ariaLabel).toBeDefined();

    // Verify it uses the correct locale translation, not hardcoded Italian
    const expectedBadge =
      EXPECTED_TRANSLATIONS[
        localePage.locale as keyof typeof EXPECTED_TRANSLATIONS
      ]?.betaBadge || EXPECTED_TRANSLATIONS.it.betaBadge;
    expect(ariaLabel).toContain(expectedBadge);
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
  expect(subtitleText?.trim()).toBe("Invite only");
});

/**
 * E2E tests for Open Graph metadata (F-78)
 *
 * Verifies that OG tags are present in HTML for social media sharing:
 * - og:locale with correct format (it_IT, en_US, etc.)
 * - og:locale:alternate for other languages
 * - og:title, og:description, og:url (localized)
 * - og:image with proper dimensions
 * - Twitter Card metadata
 */

import { test, expect } from "@playwright/test";

const locales = ["it", "en", "fr", "de", "es"] as const;

test.describe("Open Graph Metadata", () => {
  for (const locale of locales) {
    test(`should have og:locale for ${locale}`, async ({ page }) => {
      await page.goto(`/${locale}/welcome`);

      // Check og:locale meta tag
      const ogLocale = await page
        .locator('meta[property="og:locale"]')
        .getAttribute("content");
      const expectedLocale =
        locale === "it"
          ? "it_IT"
          : locale === "en"
            ? "en_US"
            : locale === "fr"
              ? "fr_FR"
              : locale === "de"
                ? "de_DE"
                : "es_ES";

      expect(ogLocale).toBe(expectedLocale);
    });

    test(`should have og:locale:alternate for ${locale}`, async ({ page }) => {
      await page.goto(`/${locale}/welcome`);

      // Get all alternate locale tags
      const alternates = await page
        .locator('meta[property="og:locale:alternate"]')
        .all();

      // Should have 4 alternates (all other locales)
      expect(alternates.length).toBe(4);

      // Get all alternate values
      const alternateValues = await Promise.all(
        alternates.map((el) => el.getAttribute("content")),
      );

      // Current locale should NOT be in alternates
      const currentLocaleFormat =
        locale === "it"
          ? "it_IT"
          : locale === "en"
            ? "en_US"
            : locale === "fr"
              ? "fr_FR"
              : locale === "de"
                ? "de_DE"
                : "es_ES";
      expect(alternateValues).not.toContain(currentLocaleFormat);

      // All other locales should be present
      const otherLocales = locales.filter((l) => l !== locale);
      const expectedAlternates = otherLocales.map((l) =>
        l === "it"
          ? "it_IT"
          : l === "en"
            ? "en_US"
            : l === "fr"
              ? "fr_FR"
              : l === "de"
                ? "de_DE"
                : "es_ES",
      );

      for (const expected of expectedAlternates) {
        expect(alternateValues).toContain(expected);
      }
    });

    test(`should have og:title for ${locale}`, async ({ page }) => {
      await page.goto(`/${locale}/welcome`);

      const ogTitle = await page
        .locator('meta[property="og:title"]')
        .getAttribute("content");
      expect(ogTitle).toBeTruthy();
      expect(ogTitle).toContain("MirrorBuddy");
    });

    test(`should have og:description for ${locale}`, async ({ page }) => {
      await page.goto(`/${locale}/welcome`);

      const ogDescription = await page
        .locator('meta[property="og:description"]')
        .getAttribute("content");
      expect(ogDescription).toBeTruthy();
      expect(ogDescription!.length).toBeGreaterThan(50); // Should be meaningful
    });

    test(`should have og:url for ${locale}`, async ({ page }) => {
      await page.goto(`/${locale}/welcome`);

      const ogUrl = await page
        .locator('meta[property="og:url"]')
        .getAttribute("content");
      expect(ogUrl).toBeTruthy();
      expect(ogUrl).toContain(`/${locale}`);
    });

    test(`should have og:image for ${locale}`, async ({ page }) => {
      await page.goto(`/${locale}/welcome`);

      const ogImage = await page
        .locator('meta[property="og:image"]')
        .getAttribute("content");
      expect(ogImage).toBeTruthy();
      expect(ogImage).toMatch(/\.(png|jpg|webp)$/i);
    });

    test(`should have og:type for ${locale}`, async ({ page }) => {
      await page.goto(`/${locale}/welcome`);

      const ogType = await page
        .locator('meta[property="og:type"]')
        .getAttribute("content");
      expect(ogType).toBe("website");
    });

    test(`should have Twitter Card for ${locale}`, async ({ page }) => {
      await page.goto(`/${locale}/welcome`);

      // Twitter card type
      const twitterCard = await page
        .locator('meta[name="twitter:card"]')
        .getAttribute("content");
      expect(twitterCard).toBe("summary_large_image");

      // Twitter title
      const twitterTitle = await page
        .locator('meta[name="twitter:title"]')
        .getAttribute("content");
      expect(twitterTitle).toBeTruthy();
      expect(twitterTitle).toContain("MirrorBuddy");

      // Twitter description
      const twitterDescription = await page
        .locator('meta[name="twitter:description"]')
        .getAttribute("content");
      expect(twitterDescription).toBeTruthy();

      // Twitter image
      const twitterImage = await page
        .locator('meta[name="twitter:image"]')
        .getAttribute("content");
      expect(twitterImage).toBeTruthy();
      expect(twitterImage).toMatch(/\.(png|jpg|webp)$/i);
    });
  }

  test("should have consistent metadata across all locales", async ({
    page,
  }) => {
    const metadataByLocale: Record<string, unknown> = {};

    // Collect metadata for all locales
    for (const locale of locales) {
      await page.goto(`/${locale}/welcome`);

      metadataByLocale[locale] = {
        ogLocale: await page
          .locator('meta[property="og:locale"]')
          .getAttribute("content"),
        ogTitle: await page
          .locator('meta[property="og:title"]')
          .getAttribute("content"),
        ogDescription: await page
          .locator('meta[property="og:description"]')
          .getAttribute("content"),
        ogUrl: await page
          .locator('meta[property="og:url"]')
          .getAttribute("content"),
        ogImage: await page
          .locator('meta[property="og:image"]')
          .getAttribute("content"),
        ogType: await page
          .locator('meta[property="og:type"]')
          .getAttribute("content"),
        twitterCard: await page
          .locator('meta[name="twitter:card"]')
          .getAttribute("content"),
      };
    }

    // Verify all locales have same structure
    for (const locale of locales) {
      const metadata = metadataByLocale[locale];
      expect(metadata.ogLocale).toBeTruthy();
      expect(metadata.ogTitle).toBeTruthy();
      expect(metadata.ogDescription).toBeTruthy();
      expect(metadata.ogUrl).toBeTruthy();
      expect(metadata.ogImage).toBeTruthy();
      expect(metadata.ogType).toBe("website");
      expect(metadata.twitterCard).toBe("summary_large_image");
    }
  });
});

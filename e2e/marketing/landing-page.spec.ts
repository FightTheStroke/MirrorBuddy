/**
 * E2E tests for marketing landing page
 * Verifies all 5 locales render, pricing loads, CTA works
 */

import { test, expect } from "../fixtures/base-fixtures";

const LOCALES = ["it", "en", "fr", "de", "es"] as const;

test.describe("Marketing Landing Page", () => {
  for (const locale of LOCALES) {
    test(`renders in ${locale}`, async ({ page }) => {
      await page.goto(`/${locale}`);
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator("nav")).toBeVisible();
    });
  }

  test("shows pricing section with 4 tiers", async ({ page }) => {
    await page.goto("/en");
    const pricingSection = page.locator("#pricing-heading");
    await expect(pricingSection).toBeVisible();

    const tierCards = page.locator(
      "section[aria-labelledby='pricing-heading'] h3",
    );
    await expect(tierCards).toHaveCount(4);
  });

  test("CTA links to welcome page", async ({ page }) => {
    await page.goto("/en");
    const ctaLink = page
      .locator("a")
      .filter({ hasText: /Start Free Trial/i })
      .first();
    await expect(ctaLink).toBeVisible();
    await expect(ctaLink).toHaveAttribute("href", /\/welcome/);
  });

  test("FAQ accordion opens on click", async ({ page }) => {
    await page.goto("/en");
    const faqButton = page
      .locator("button")
      .filter({ hasText: /safe for children/i });
    await faqButton.click();
    await expect(page.locator("text=COPPA compliant")).toBeVisible();
  });

  test("social proof section renders", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator("#social-proof-heading")).toBeVisible();
  });

  test("features grid shows 6 features", async ({ page }) => {
    await page.goto("/en");
    const featureCards = page.locator(
      "section[aria-labelledby='features-heading'] h3",
    );
    await expect(featureCards).toHaveCount(6);
  });
});

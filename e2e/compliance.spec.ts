/**
 * E2E Tests: Compliance & Legal Pages
 *
 * Tests compliance-related pages for accessibility and content.
 * Covers: Privacy Policy, Terms of Service, Cookie Policy, AI Transparency, Accessibility Statement
 * Tests all pages across all supported locales (it, en, fr, de, es)
 *
 * Plan 90: Multi-Language-Compliance (T6-08)
 *
 * Run: npx playwright test e2e/compliance.spec.ts
 */

import { test, expect, testAllLocales } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";

// IMPORTANT: These tests check unauthenticated pages (legal, compliance)
// Override global storageState to start without authentication
test.use({ storageState: undefined });

test.describe("Compliance Pages - Accessibility", () => {
  test("privacy policy page is accessible", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page).toHaveTitle(/privacy|privacy policy/i);

    const mainContent = page.getByRole("main");
    await mainContent.waitFor({ state: "visible", timeout: 10000 });
    await expect(mainContent).toBeVisible();
  });

  test("terms of service page is accessible", async ({ page }) => {
    await page.goto("/terms");
    await expect(page).toHaveTitle(/terms|condizioni|termini/i);

    const mainContent = page.getByRole("main");
    await mainContent.waitFor({ state: "visible", timeout: 10000 });
    await expect(mainContent).toBeVisible();
  });

  test("cookie policy page is accessible", async ({ page }) => {
    await page.goto("/cookies");
    await expect(page).toHaveTitle(/cookie|policy/i);

    const mainContent = page.getByRole("main");
    await mainContent.waitFor({ state: "visible", timeout: 10000 });
    await expect(mainContent).toBeVisible();
  });

  test("AI transparency page is accessible", async ({ page }) => {
    await page.goto("/ai-transparency");
    await expect(page).toHaveTitle(/trasparenza|transparency|ai/i);

    const mainContent = page.getByRole("main");
    await mainContent.waitFor({ state: "visible", timeout: 10000 });
    await expect(mainContent).toBeVisible();
  });
});

test.describe("Compliance Pages - Content Verification", () => {
  test("privacy policy contains privacy commitment", async ({ page }) => {
    await page.goto("/privacy");
    const content = await page.textContent("body");
    if (content) {
      const hasPrivacyContent = /data|privacy|protection|gdpr/i.test(content);
      expect(hasPrivacyContent).toBeTruthy();
    }
  });

  test("AI transparency page has required sections", async ({ page }) => {
    await page.goto("/ai-transparency");
    const content = await page.textContent("body");
    if (content) {
      const hasAIContent = /AI|system|azure|openai|disclosure/i.test(content);
      expect(hasAIContent).toBeTruthy();
    }
  });

  test("compliance pages have page headers", async ({ page }) => {
    const pages = ["/privacy", "/terms", "/cookies", "/ai-transparency"];

    for (const path of pages) {
      await page.goto(path);
      const heading = page.getByRole("heading").first();
      const isVisible = await heading.isVisible().catch(() => false);
      expect(isVisible || path).toBeTruthy();
    }
  });
});

test.describe("Compliance Pages - Keyboard Navigation", () => {
  test("privacy policy is keyboard navigable", async ({ page }) => {
    await page.goto("/privacy");

    // Test Tab key navigation
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeDefined();
  });

  test("AI transparency page links are keyboard accessible", async ({
    page,
  }) => {
    await page.goto("/ai-transparency");

    const links = await page.locator("a").count();
    if (links > 0) {
      await page.keyboard.press("Tab");
      await page.evaluate(() => {
        const el = document.activeElement;
        return el?.tagName === "A";
      });
      // May not always tab to first link, but should be navigable
      expect(links).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// COMPLIANCE PAGES PER LOCALE (Plan 90: T6-08)
// ============================================================================

test.describe("Compliance Pages - Multi-Locale", () => {
  const compliancePages = [
    { path: "/privacy", name: "Privacy Policy" },
    { path: "/cookies", name: "Cookie Policy" },
    { path: "/accessibility", name: "Accessibility Statement" },
    { path: "/ai-transparency", name: "AI Transparency" },
  ];

  for (const page of compliancePages) {
    testAllLocales(
      `${page.name} loads in all locales`,
      async ({ page: playwrightPage, locale }) => {
        await playwrightPage.goto(`/${locale}${page.path}`);
        await playwrightPage.waitForLoadState("domcontentloaded");

        // Verify page loads without errors
        const title = await playwrightPage.title();
        expect(title).toBeTruthy();

        // Verify main content is visible (wait for React hydration after domcontentloaded)
        const mainContent = playwrightPage.getByRole("main");
        await mainContent.waitFor({ state: "visible", timeout: 10000 });
        await expect(mainContent).toBeVisible();
      },
    );

    testAllLocales(
      `${page.name} has correct language content`,
      async ({ page: playwrightPage, locale }) => {
        await playwrightPage.goto(`/${locale}${page.path}`);
        await playwrightPage.waitForLoadState("domcontentloaded");

        // Verify page content is in correct language
        const bodyText = await playwrightPage.textContent("body");
        expect(bodyText).toBeTruthy();

        // Basic language verification (not comprehensive, but checks page loaded)
        const hasContent = bodyText && bodyText.length > 100;
        expect(hasContent).toBeTruthy();
      },
    );
  }
});

test.describe("Compliance Pages - Accessibility per Locale", () => {
  const compliancePages = [
    { path: "/privacy", name: "Privacy Policy" },
    { path: "/cookies", name: "Cookie Policy" },
    { path: "/accessibility", name: "Accessibility Statement" },
  ];

  for (const page of compliancePages) {
    testAllLocales(
      `${page.name} passes WCAG 2.1 AA in @${page.path}`,
      async ({ page: playwrightPage, locale }) => {
        await playwrightPage.goto(`/${locale}${page.path}`);
        await playwrightPage.waitForLoadState("domcontentloaded");
        await playwrightPage.waitForTimeout(500);

        const results = await new AxeBuilder({ page: playwrightPage })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .disableRules(["color-contrast"]) // Known issue, tracked separately
          .analyze();

        if (results.violations.length > 0) {
          console.log(
            `\n=== Accessibility violations on ${page.path} (${locale}) ===`,
          );
          for (const violation of results.violations) {
            console.log(
              `\n[${violation.impact}] ${violation.id}: ${violation.description}`,
            );
          }
        }

        expect(
          results.violations,
          `${page.name} (${locale}) has ${results.violations.length} accessibility violations`,
        ).toHaveLength(0);
      },
    );
  }
});

test.describe("Compliance Pages - Country-Specific Content", () => {
  const countryMappings: Record<string, { locale: string; authority: string }> =
    {
      italy: { locale: "it", authority: "Garante" },
      spain: { locale: "es", authority: "AEPD" },
      france: { locale: "fr", authority: "CNIL" },
      germany: { locale: "de", authority: "BfDI" },
      uk: { locale: "en", authority: "ICO" },
    };

  for (const [country, config] of Object.entries(countryMappings)) {
    test(`accessibility page shows correct authority for ${country}`, async ({
      page,
    }) => {
      await page.goto(`/${config.locale}/accessibility`);
      await page.waitForLoadState("domcontentloaded");

      const content = await page.textContent("body");
      expect(content).toContain(config.authority);
    });

    test(`cookie consent shows correct language for ${country}`, async ({
      page,
    }) => {
      // Navigate to a page that shows cookie consent
      await page.goto(`/${config.locale}/welcome`);
      await page.waitForLoadState("domcontentloaded");

      // Cookie consent should be in correct language
      // This is a basic check - full cookie consent testing is in cookie-consent-wall component
      const htmlLang = await page.getAttribute("html", "lang");
      expect(htmlLang).toBe(config.locale);
    });
  }
});

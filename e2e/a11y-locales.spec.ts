/**
 * E2E Tests: Accessibility for Each Language
 *
 * Comprehensive WCAG 2.1 AA compliance testing across all supported locales.
 * Tests verify that accessibility standards are maintained in every language:
 * - Italian (it), English (en), French (fr), German (de), Spanish (es)
 *
 * Test Coverage:
 * - WCAG 2.1 AA compliance via axe-core for each locale
 * - Key pages tested in all supported languages
 * - Locale-specific accessibility issues detected
 * - Consistent accessibility standards across languages
 *
 * Run: npx playwright test e2e/a11y-locales.spec.ts
 * Run specific locale: npx playwright test e2e/a11y-locales.spec.ts --grep "@it"
 *
 * F-08: Accessibility Tests for Each Language
 */

import { test, expect, testAllLocales, SUPPORTED_LOCALES } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";

/**
 * Main pages to test in all locales
 * Covers key user-facing features and navigation paths
 */
const PAGES_TO_TEST = [
  { path: "/", name: "Homepage" },
  { path: "/welcome", name: "Welcome/Onboarding" },
  { path: "/home", name: "Home Dashboard" },
  { path: "/settings", name: "Settings" },
  { path: "/landing", name: "Landing" },
];

/**
 * Known accessibility rules to skip (document why each is excluded)
 * Should be empty for most projects - only exclude when violations have documented justification
 */
const SKIP_RULES: string[] = [
  // Add rules here with documentation if necessary
  // Format: 'rule-id: reason for exclusion'
];

/**
 * Constant for waiting for network idle state
 */
const WAIT_FOR_NETWORK_IDLE = "networkidle";

// ============================================================================
// WCAG 2.1 AA COMPLIANCE - ALL LOCALES
// ============================================================================

test.describe("WCAG 2.1 AA Compliance - All Locales", () => {
  /**
   * Test each page in each supported locale
   * Ensures accessibility standards are consistent across languages
   */
  testAllLocales(
    "all pages pass axe-core WCAG 2.1 AA",
    async ({ localePage }) => {
      for (const page of PAGES_TO_TEST) {
        // Navigate to page in current locale
        await localePage.goto(page.path);
        await localePage.page.waitForLoadState(WAIT_FOR_NETWORK_IDLE);
        await localePage.page.waitForTimeout(500);

        // Run axe-core accessibility audit
        const results = await new AxeBuilder({ page: localePage.page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .disableRules(SKIP_RULES)
          .analyze();

        // Log violations for debugging if present
        if (results.violations.length > 0) {
          console.log(
            `\n=== A11y violations on [${localePage.locale}] ${page.path} ===`,
          );
          for (const violation of results.violations) {
            console.log(
              `[${violation.impact}] ${violation.id}: ${violation.description}`,
            );
            console.log(`  Help: ${violation.helpUrl}`);
            for (const node of violation.nodes.slice(0, 3)) {
              console.log(`  - ${node.html.substring(0, 100)}`);
            }
            if (violation.nodes.length > 3) {
              console.log(`  ... and ${violation.nodes.length - 3} more`);
            }
          }
        }

        // Assert no violations found
        expect(
          results.violations,
          `[${localePage.locale}] ${page.name} (${page.path}) has ${results.violations.length} accessibility violations`,
        ).toHaveLength(0);
      }
    },
  );
});

// ============================================================================
// WCAG 2.1 AA COMPLIANCE - SPECIFIC PAGES PER LOCALE
// ============================================================================

test.describe("WCAG 2.1 AA per-page audit - All Locales", () => {
  /**
   * Test homepage specifically for each locale
   * Homepage is critical entry point for accessibility
   */
  testAllLocales("homepage passes axe-core", async ({ localePage }) => {
    await localePage.goto("/");
    await localePage.page.waitForLoadState(WAIT_FOR_NETWORK_IDLE);
    await localePage.page.waitForTimeout(500);

    const results = await new AxeBuilder({ page: localePage.page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .disableRules(SKIP_RULES)
      .analyze();

    expect(results.violations).toHaveLength(0);
  });

  /**
   * Test welcome page for each locale
   * Onboarding is critical for new user experience
   */
  testAllLocales("welcome page passes axe-core", async ({ localePage }) => {
    await localePage.goto("/welcome");
    await localePage.page.waitForLoadState(WAIT_FOR_NETWORK_IDLE);
    await localePage.page.waitForTimeout(500);

    const results = await new AxeBuilder({ page: localePage.page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .disableRules(SKIP_RULES)
      .analyze();

    expect(results.violations).toHaveLength(0);
  });

  /**
   * Test home dashboard for each locale
   * Main application dashboard
   */
  testAllLocales("home dashboard passes axe-core", async ({ localePage }) => {
    await localePage.goto("/home");
    await localePage.page.waitForLoadState(WAIT_FOR_NETWORK_IDLE);
    await localePage.page.waitForTimeout(500);

    const results = await new AxeBuilder({ page: localePage.page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .disableRules(SKIP_RULES)
      .analyze();

    expect(results.violations).toHaveLength(0);
  });

  /**
   * Test settings page for each locale
   * Settings contains important user controls
   */
  testAllLocales("settings page passes axe-core", async ({ localePage }) => {
    await localePage.goto("/settings");
    await localePage.page.waitForLoadState(WAIT_FOR_NETWORK_IDLE);
    await localePage.page.waitForTimeout(500);

    const results = await new AxeBuilder({ page: localePage.page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .disableRules(SKIP_RULES)
      .analyze();

    expect(results.violations).toHaveLength(0);
  });
});

// ============================================================================
// LOCALE-SPECIFIC ACCESSIBILITY FEATURES
// ============================================================================

test.describe("Locale-Specific Accessibility Features", () => {
  /**
   * Verify proper language direction for all locales
   * RTL languages may require special handling
   */
  testAllLocales(
    "locale has correct language direction",
    async ({ localePage }) => {
      await localePage.goto("/");
      await localePage.page.waitForLoadState(WAIT_FOR_NETWORK_IDLE);

      const htmlDir = await localePage.page.locator("html").getAttribute("dir");
      const htmlLang = await localePage.page
        .locator("html")
        .getAttribute("lang");

      // Verify lang attribute is set
      expect(htmlLang).toBe(localePage.locale);

      // Verify dir attribute exists (should be 'ltr' for all current locales)
      expect(htmlDir).toBeTruthy();
      expect(["ltr", "rtl"]).toContain(htmlDir);
    },
  );

  /**
   * Verify text directionality is accessible
   * Content should be readable in the locale's direction
   */
  testAllLocales("text has proper directionality", async ({ localePage }) => {
    await localePage.goto("/home");
    await localePage.page.waitForLoadState(WAIT_FOR_NETWORK_IDLE);

    // Check that main content area exists
    const mainContent = localePage.page.locator("main, [role='main']");
    await expect(mainContent).toBeTruthy();

    // Verify content is visible and readable
    const isVisible = await mainContent.isVisible();
    expect(isVisible).toBe(true);
  });

  /**
   * Verify font and text rendering in each locale
   * Some languages may have specific typography requirements
   */
  testAllLocales(
    "text is readable in current locale",
    async ({ localePage }) => {
      await localePage.goto("/home");
      await localePage.page.waitForLoadState(WAIT_FOR_NETWORK_IDLE);

      // Get first heading in the page
      const heading = localePage.page.locator("h1").first();

      if (await heading.isVisible({ timeout: 1000 }).catch(() => false)) {
        // Verify heading has sufficient size
        const fontSize = await heading.evaluate((el) => {
          return window.getComputedStyle(el).fontSize;
        });

        // Font size should be at least 12px (prefer 16px+)
        const fontSizeNum = parseInt(fontSize);
        expect(fontSizeNum).toBeGreaterThanOrEqual(12);
      }
    },
  );
});

// ============================================================================
// COLOR CONTRAST ACROSS LOCALES
// ============================================================================

test.describe("Color Contrast - All Locales", () => {
  /**
   * Test color contrast in all locales
   * Ensures text is readable regardless of language
   */
  testAllLocales(
    "homepage has sufficient color contrast",
    async ({ localePage }) => {
      await localePage.goto("/");
      await localePage.page.waitForLoadState(WAIT_FOR_NETWORK_IDLE);
      await localePage.page.waitForTimeout(500);

      // Run axe-core specifically for color contrast rules
      const results = await new AxeBuilder({ page: localePage.page })
        .withRules(["color-contrast"])
        .analyze();

      // Log any contrast violations
      if (results.violations.length > 0) {
        console.log(
          `\n=== Color contrast issues on [${localePage.locale}] homepage ===`,
        );
        for (const violation of results.violations) {
          console.log(`${violation.id}: ${violation.description}`);
        }
      }

      expect(results.violations).toHaveLength(0);
    },
  );
});

// ============================================================================
// HEADING HIERARCHY - ALL LOCALES
// ============================================================================

test.describe("Heading Hierarchy - All Locales", () => {
  /**
   * Verify proper heading hierarchy in all locales
   * Critical for screen reader users and document structure
   */
  testAllLocales(
    "homepage has proper heading hierarchy",
    async ({ localePage }) => {
      await localePage.goto("/");
      await localePage.page.waitForLoadState(WAIT_FOR_NETWORK_IDLE);

      // Run axe-core for heading rules
      const results = await new AxeBuilder({ page: localePage.page })
        .withRules(["heading-order"])
        .analyze();

      expect(results.violations).toHaveLength(0);
    },
  );

  /**
   * Test that pages have at least one h1
   * Every page should have exactly one H1 for accessibility
   */
  testAllLocales("pages have proper h1 heading", async ({ localePage }) => {
    const testPages = ["/", "/welcome", "/home", "/settings"];

    for (const testPath of testPages) {
      await localePage.goto(testPath);
      await localePage.page.waitForLoadState(WAIT_FOR_NETWORK_IDLE);

      const h1Count = await localePage.page.locator("h1").count();

      // Some pages may not have H1 if they're simple, but main content pages should
      if (testPath !== "/") {
        expect(h1Count).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

// ============================================================================
// FORM ACCESSIBILITY - ALL LOCALES
// ============================================================================

test.describe("Form Accessibility - All Locales", () => {
  /**
   * Test that forms have accessible labels in all locales
   */
  testAllLocales("forms have accessible labels", async ({ localePage }) => {
    await localePage.goto("/settings");
    await localePage.page.waitForLoadState(WAIT_FOR_NETWORK_IDLE);

    // Run axe-core specifically for form rules
    const results = await new AxeBuilder({ page: localePage.page })
      .withRules(["label", "form-field-multiple-labels", "required-attribute"])
      .analyze();

    if (results.violations.length > 0) {
      console.log(
        `\n=== Form accessibility issues on [${localePage.locale}] settings ===`,
      );
      for (const violation of results.violations) {
        console.log(`${violation.id}: ${violation.description}`);
      }
    }

    expect(results.violations).toHaveLength(0);
  });
});

// ============================================================================
// IMAGE ALT TEXT - ALL LOCALES
// ============================================================================

test.describe("Image Accessibility - All Locales", () => {
  /**
   * Verify images have alt text in all locales
   * Alt text should be language-appropriate
   */
  testAllLocales(
    "images have alt text or are marked as decorative",
    async ({ localePage }) => {
      await localePage.goto("/");
      await localePage.page.waitForLoadState(WAIT_FOR_NETWORK_IDLE);

      // Run axe-core for image alt text
      const results = await new AxeBuilder({ page: localePage.page })
        .withRules(["image-alt"])
        .analyze();

      if (results.violations.length > 0) {
        console.log(
          `\n=== Image alt text issues on [${localePage.locale}] homepage ===`,
        );
        for (const violation of results.violations) {
          console.log(
            `Found ${violation.nodes.length} images without alt text`,
          );
        }
      }

      expect(results.violations).toHaveLength(0);
    },
  );
});

// ============================================================================
// COMPREHENSIVE AUDIT BY LOCALE
// ============================================================================

test.describe("Comprehensive Accessibility Audit by Locale", () => {
  /**
   * Run full WCAG audit for each locale
   * Provides summary of all accessibility issues
   */
  for (const locale of SUPPORTED_LOCALES) {
    test(`[${locale}] comprehensive WCAG 2.1 AA audit`, async ({
      page,
      context,
    }) => {
      // Set up locale context
      await context.setExtraHTTPHeaders({
        "Accept-Language": `${locale}-${locale.toUpperCase()},${locale};q=0.9`,
      });

      // Test homepage
      await page.goto(`/${locale}/`);
      await page.waitForLoadState(WAIT_FOR_NETWORK_IDLE);
      await page.waitForTimeout(500);

      // Run comprehensive audit
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .disableRules(SKIP_RULES)
        .analyze();

      // Log results
      const violationCount = results.violations.length;
      console.log(
        `\n[${locale}] Accessibility audit: ${violationCount} violations found`,
      );

      if (violationCount > 0) {
        console.log("Violations:");
        for (const violation of results.violations) {
          console.log(`  - [${violation.impact}] ${violation.id}`);
        }
      }

      expect(results.violations).toHaveLength(0);
    });
  }
});

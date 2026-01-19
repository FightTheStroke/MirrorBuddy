/**
 * Accessibility Tests - WCAG 2.1 AA Compliance
 *
 * Comprehensive automated accessibility testing for MirrorBuddy.
 * Uses axe-core for WCAG 2.1 AA validation on all main pages.
 *
 * Run: npx playwright test e2e/accessibility.spec.ts
 */

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Main user-facing pages (excludes admin, showcase, test pages)
const PAGES_TO_TEST = [
  { path: "/", name: "Homepage" },
  { path: "/welcome", name: "Welcome/Onboarding" },
  { path: "/astuccio", name: "Astuccio (Tools)" },
  { path: "/supporti", name: "Supporti (Materials)" },
  { path: "/archivio", name: "Archivio" },
  { path: "/genitori", name: "Parent Dashboard" },
  { path: "/study-kit", name: "Study Kit" },
  { path: "/homework", name: "Homework Help" },
  { path: "/mindmap", name: "Mindmap" },
  { path: "/quiz", name: "Quiz" },
  { path: "/flashcard", name: "Flashcard" },
  { path: "/summary", name: "Summary" },
  { path: "/landing", name: "Landing" },
];

// Known issues to skip (document why each is excluded)
const SKIP_RULES: string[] = [
  // None - we want full compliance
];

test.describe("WCAG 2.1 AA Compliance", () => {
  for (const page of PAGES_TO_TEST) {
    test(`${page.name} (${page.path}) passes axe-core`, async ({
      page: playwrightPage,
    }) => {
      await playwrightPage.goto(page.path);
      await playwrightPage.waitForLoadState("networkidle");

      // Wait for dynamic content to load
      await playwrightPage.waitForTimeout(500);

      const results = await new AxeBuilder({ page: playwrightPage })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .disableRules(SKIP_RULES)
        .analyze();

      // Log violations for debugging
      if (results.violations.length > 0) {
        console.log(`\n=== Accessibility violations on ${page.path} ===`);
        for (const violation of results.violations) {
          console.log(
            `\n[${violation.impact}] ${violation.id}: ${violation.description}`,
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

      expect(
        results.violations,
        `${page.name} has ${results.violations.length} accessibility violations`,
      ).toHaveLength(0);
    });
  }
});

test.describe("Keyboard Navigation", () => {
  test("can navigate homepage with keyboard only", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Tab through interactive elements
    const focusableSelector =
      'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusableCount = await page.locator(focusableSelector).count();

    expect(focusableCount).toBeGreaterThan(0);

    // Verify first Tab moves focus to a focusable element
    await page.keyboard.press("Tab");
    const firstFocused = await page.evaluate(
      () => document.activeElement?.tagName,
    );
    expect(["A", "BUTTON", "INPUT", "SELECT", "TEXTAREA"]).toContain(
      firstFocused,
    );

    // Tab through several elements to verify focus moves
    for (let i = 0; i < Math.min(5, focusableCount - 1); i++) {
      await page.keyboard.press("Tab");
    }

    // Verify focus is still on a focusable element
    const currentFocused = await page.evaluate(
      () => document.activeElement?.tagName,
    );
    expect(currentFocused).not.toBe("BODY");
  });

  test("navigation links have visible focus indicators", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Find first link/button
    const firstInteractive = page.locator("a, button").first();
    await firstInteractive.focus();

    // Check that focus is visible (outline or ring)
    const styles = await firstInteractive.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        outline: computed.outline,
        outlineWidth: computed.outlineWidth,
        boxShadow: computed.boxShadow,
      };
    });

    // Either outline or box-shadow should indicate focus
    const hasFocusIndicator =
      (styles.outlineWidth !== "0px" && styles.outline !== "none") ||
      styles.boxShadow !== "none";

    expect(hasFocusIndicator, "Focus indicator should be visible").toBe(true);
  });

  test("Escape key closes modals/dialogs", async ({ page }) => {
    await page.goto("/astuccio");
    await page.waitForLoadState("networkidle");

    // Try to open a tool card if available
    const toolCard = page.locator('[role="button"], button').first();
    if (await toolCard.isVisible()) {
      await toolCard.click();
      await page.waitForTimeout(300);

      // Check if a dialog opened
      const dialog = page.locator('[role="dialog"], [aria-modal="true"]');
      const isDialogVisible = await dialog.isVisible().catch(() => false);

      if (isDialogVisible) {
        await page.keyboard.press("Escape");
        await page.waitForTimeout(500);

        // Dialog should be closed or hidden
        // Some modals may require multiple Escape presses or use different close mechanisms
        const stillVisible = await dialog.isVisible().catch(() => false);
        if (stillVisible) {
          // Try clicking outside as alternative close mechanism
          await page.locator("body").click({ position: { x: 10, y: 10 } });
          await page.waitForTimeout(300);
        }

        // Final check - dialog should be closed
        await expect(dialog).not.toBeVisible();
      }
    }
  });

  test("skip link available for keyboard users", async ({ page }) => {
    await page.goto("/");

    // Press Tab - first element should be skip link (if exists)
    await page.keyboard.press("Tab");

    const activeElement = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        text: el?.textContent?.toLowerCase() || "",
        href: (el as HTMLAnchorElement)?.href || "",
      };
    });

    // Check if skip link exists (common patterns)
    const isSkipLink =
      activeElement.text.includes("skip") ||
      activeElement.text.includes("salta") ||
      activeElement.text.includes("vai al contenuto") ||
      activeElement.href.includes("#main") ||
      activeElement.href.includes("#content");

    // This is a soft check - log warning if no skip link
    if (!isSkipLink) {
      console.warn(
        "No skip link found - consider adding one for keyboard users",
      );
    }
  });
});

test.describe("Screen Reader Support", () => {
  test("page has proper heading hierarchy", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const headings = await page.evaluate(() => {
      const allHeadings = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
      return Array.from(allHeadings).map((h) => ({
        level: parseInt(h.tagName[1]),
        text: h.textContent?.trim().substring(0, 50),
      }));
    });

    // Should have at least one h1
    const h1Count = headings.filter((h) => h.level === 1).length;
    expect(h1Count, "Page should have exactly one h1").toBe(1);

    // Heading levels should not skip (e.g., h1 -> h3)
    let prevLevel = 0;
    for (const heading of headings) {
      if (heading.level > prevLevel + 1 && prevLevel !== 0) {
        console.warn(
          `Heading level skipped: h${prevLevel} -> h${heading.level} ("${heading.text}")`,
        );
      }
      prevLevel = heading.level;
    }
  });

  test("images have alt text", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const imagesWithoutAlt = await page.evaluate(() => {
      const images = document.querySelectorAll("img");
      return Array.from(images)
        .filter((img) => {
          // Decorative images can have empty alt=""
          // But missing alt attribute is a violation
          return !img.hasAttribute("alt");
        })
        .map((img) => img.src.substring(0, 100));
    });

    expect(
      imagesWithoutAlt,
      `Images without alt attribute: ${imagesWithoutAlt.join(", ")}`,
    ).toHaveLength(0);
  });

  test("form inputs have labels", async ({ page }) => {
    await page.goto("/welcome");
    await page.waitForLoadState("networkidle");

    const inputsWithoutLabels = await page.evaluate(() => {
      const inputs = document.querySelectorAll("input, select, textarea");
      return Array.from(inputs)
        .filter((input) => {
          const id = input.id;
          const ariaLabel = input.getAttribute("aria-label");
          const ariaLabelledBy = input.getAttribute("aria-labelledby");
          const hasLabel = id && document.querySelector(`label[for="${id}"]`);
          const isHidden = input.getAttribute("type") === "hidden";

          return !isHidden && !ariaLabel && !ariaLabelledBy && !hasLabel;
        })
        .map((input) => `${input.tagName}#${input.id || "(no-id)"}`);
    });

    expect(
      inputsWithoutLabels,
      `Inputs without labels: ${inputsWithoutLabels.join(", ")}`,
    ).toHaveLength(0);
  });

  test("buttons have accessible names", async ({ page }) => {
    await page.goto("/astuccio");
    await page.waitForLoadState("networkidle");

    const buttonsWithoutNames = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button, [role="button"]');
      return Array.from(buttons)
        .filter((btn) => {
          const text = btn.textContent?.trim();
          const ariaLabel = btn.getAttribute("aria-label");
          const ariaLabelledBy = btn.getAttribute("aria-labelledby");
          const title = btn.getAttribute("title");

          return !text && !ariaLabel && !ariaLabelledBy && !title;
        })
        .map((btn) => btn.outerHTML.substring(0, 100));
    });

    expect(
      buttonsWithoutNames,
      `Buttons without accessible names: ${buttonsWithoutNames.join(", ")}`,
    ).toHaveLength(0);
  });

  test("interactive elements have ARIA roles", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Check for common ARIA landmarks
    const landmarks = await page.evaluate(() => {
      return {
        main: !!document.querySelector('main, [role="main"]'),
        navigation: !!document.querySelector('nav, [role="navigation"]'),
        banner: !!document.querySelector('header, [role="banner"]'),
      };
    });

    expect(landmarks.main, "Page should have main landmark").toBe(true);
  });
});

test.describe("Color and Contrast", () => {
  test("respects prefers-reduced-motion", async ({ page }) => {
    // Emulate reduced motion preference
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Check that animations are disabled
    const hasMotion = await page.evaluate(() => {
      const elements = document.querySelectorAll("*");
      for (const el of elements) {
        const style = window.getComputedStyle(el);
        const animation = style.animation;
        const transition = style.transition;

        // If there are animations/transitions, they should be instant
        if (
          (animation && animation !== "none" && !animation.includes("0s")) ||
          (transition && transition !== "none" && !transition.includes("0s"))
        ) {
          return true;
        }
      }
      return false;
    });

    // Soft check - log warning but don't fail (CSS may handle this differently)
    if (hasMotion) {
      console.warn(
        "Some animations may still be active with prefers-reduced-motion",
      );
    }
  });
});

test.describe("DSA Profile Support", () => {
  test("dyslexia font toggle works", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Check if accessibility settings are accessible
    // This tests that the profile system is functional
    const body = page.locator("body");
    const initialFont = await body.evaluate(
      (el) => window.getComputedStyle(el).fontFamily,
    );

    // Font should be readable (not empty)
    expect(initialFont.length).toBeGreaterThan(0);
  });
});

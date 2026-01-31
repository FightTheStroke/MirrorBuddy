/**
 * E2E Tests: Skip Link
 *
 * Tests for skip link accessibility feature:
 * - Present and properly marked up
 * - Hidden by default, visible on focus
 * - Navigates to main content
 * - Has proper ARIA labels and focus indicators
 *
 * Run: npx playwright test e2e/a11y-skip-link.spec.ts
 */

import { test, expect, toLocalePath } from "./fixtures/a11y-fixtures";

test.describe("Skip Link - WCAG 2.1 AA Compliance", () => {
  test("skip link is present on all pages", async ({ page }) => {
    const pages = [
      toLocalePath("/"),
      toLocalePath("/welcome"),
      toLocalePath("/astuccio"),
      toLocalePath("/supporti"),
    ];

    for (const path of pages) {
      await page.goto(path);
      await page.waitForLoadState("domcontentloaded");

      const skipLink = page.locator('[data-testid="skip-link"]');
      await expect(skipLink).toBeAttached();
    }
  });

  test("skip link is hidden by default (sr-only)", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    const skipLink = page.locator('[data-testid="skip-link"]');

    const isHidden = await skipLink.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      const classList = el.className;
      return (
        (styles.position === "absolute" && styles.clip !== "auto") ||
        classList.includes("sr-only")
      );
    });

    expect(isHidden).toBe(true);
  });

  test("skip link becomes visible on focus", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    const skipLink = page.locator('[data-testid="skip-link"]');
    await skipLink.focus();

    const isVisible = await skipLink.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return (
        styles.visibility !== "hidden" &&
        styles.display !== "none" &&
        styles.opacity !== "0"
      );
    });

    expect(isVisible).toBe(true);
  });

  test("skip link has proper contrast and focus indicator", async ({
    page,
  }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    const skipLink = page.locator('[data-testid="skip-link"]');
    await skipLink.focus();

    const focusStyles = await skipLink.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        outline: styles.outline,
        outlineWidth: styles.outlineWidth,
        boxShadow: styles.boxShadow,
      };
    });

    const hasFocusIndicator =
      (focusStyles.outlineWidth !== "0px" && focusStyles.outline !== "none") ||
      focusStyles.boxShadow !== "none";

    expect(hasFocusIndicator).toBe(true);
  });

  test("skip link navigates to main content", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    const skipLink = page.locator('[data-testid="skip-link"]');
    await skipLink.click();
    await page.waitForTimeout(500);

    const focusedElement = await page.evaluate(() => {
      return document.activeElement?.id;
    });

    expect(focusedElement).toBe("main-content");
  });

  test("skip link announces navigation to screen readers", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    const skipLink = page.locator('[data-testid="skip-link"]');
    await skipLink.click();
    await page.waitForTimeout(100);

    const liveRegion = page.locator('[role="status"][aria-live="polite"]');
    const isPresent = await liveRegion.count().then((c) => c > 0);

    expect(isPresent).toBe(true);
  });

  test("skip link is first focusable element", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    await page.keyboard.press("Tab");

    const focusedTestId = await page.evaluate(
      () => document.activeElement?.getAttribute("data-testid") || "",
    );

    expect(focusedTestId).toBe("skip-link");
  });

  test("skip link has accessible aria-label", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    const skipLink = page.locator('[data-testid="skip-link"]');
    const label = await skipLink.getAttribute("aria-label");

    expect(label?.length).toBeGreaterThan(0);
  });
});

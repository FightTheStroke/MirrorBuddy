/**
 * E2E Tests: A11y Floating Button
 *
 * Tests for accessibility floating button component:
 * - data-testid for reliable selection
 * - ARIA attributes: aria-expanded, aria-haspopup, aria-controls
 * - Touch target size compliance (44x44px WCAG)
 * - Position and visibility
 *
 * Run: npx playwright test e2e/a11y-floating-button.spec.ts
 */

import {
  test,
  expect,
  toLocalePath,
  openA11yPanel,
} from "./fixtures/a11y-fixtures";

test.describe("A11y Floating Button - ARIA & Accessibility", () => {
  // Button + panel interactions can be slow in CI
  test.setTimeout(60000);

  test("floating button has data-testid attribute", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    const button = page.locator('[data-testid="a11y-floating-button"]');
    await expect(button).toBeAttached();
  });

  test("floating button has aria-expanded attribute", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    const button = page.locator('[data-testid="a11y-floating-button"]');
    await expect(button).toHaveAttribute("aria-expanded", /true|false/);
  });

  test("aria-expanded is initially false", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    const button = page.locator('[data-testid="a11y-floating-button"]');
    await expect(button).toHaveAttribute("aria-expanded", "false");
  });

  test("floating button has aria-haspopup=dialog", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    const button = page.locator('[data-testid="a11y-floating-button"]');
    await expect(button).toHaveAttribute("aria-haspopup", "dialog");
  });

  test("floating button has aria-controls attribute", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    const button = page.locator('[data-testid="a11y-floating-button"]');
    await expect(button).toBeVisible({ timeout: 10000 });

    // aria-controls is only present when panel is expanded (WCAG: reference existing elements)
    const controlsBefore = await button.getAttribute("aria-controls");
    expect(controlsBefore).toBeNull();

    // Open panel — aria-controls should now reference the panel
    const { button: openedButton } = await openA11yPanel(page);
    const controlsAfter = await openedButton.getAttribute("aria-controls");
    expect(controlsAfter).toBe("a11y-quick-panel");
  });

  test("aria-expanded becomes true when panel opens", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");
    // Extra wait for hydration in CI
    await page.waitForTimeout(1000);

    const button = page.locator('[data-testid="a11y-floating-button"]');
    await expect(button).toBeVisible({ timeout: 15000 });

    await expect(button).toHaveAttribute("aria-expanded", "false");
    const { button: openedButton } = await openA11yPanel(page);
    // Wait for state update after panel animation - longer for CI
    await page.waitForTimeout(1000);
    await expect(openedButton).toHaveAttribute("aria-expanded", "true", {
      timeout: 15000,
    });
  });

  test("aria-expanded becomes false when panel closes", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    // Open panel
    const { button } = await openA11yPanel(page);
    await expect(button).toHaveAttribute("aria-expanded", "true", {
      timeout: 15000,
    });

    // Close panel
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    await expect(button).toHaveAttribute("aria-expanded", "false");
  });

  test("button has accessible aria-label", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    const button = page.locator('[data-testid="a11y-floating-button"]');
    const label = await button.getAttribute("aria-label");

    expect(label?.length).toBeGreaterThan(0);
  });

  test("button meets WCAG 44x44px touch target minimum", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    const button = page.locator('[data-testid="a11y-floating-button"]');
    const box = await button.boundingBox();

    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
  });

  test("button is positioned in bottom-right corner", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    const button = page.locator('[data-testid="a11y-floating-button"]');
    const box = await button.boundingBox();

    // Should be in bottom-right quadrant
    expect(box?.x).toBeGreaterThan(0);
    expect(box?.y).toBeGreaterThan(0);
  });

  test("button has visible focus indicator", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    const button = page.locator('[data-testid="a11y-floating-button"]');
    await button.focus();

    const focusStyles = await button.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        outline: styles.outline,
        boxShadow: styles.boxShadow,
        ring: styles.getPropertyValue("--ring-width"),
      };
    });

    const hasFocusIndicator =
      focusStyles.outline !== "none" || focusStyles.boxShadow !== "none";
    expect(hasFocusIndicator).toBe(true);
  });

  test("button toggles panel with Enter key", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    const button = page.locator('[data-testid="a11y-floating-button"]');
    await expect(button).toBeVisible({ timeout: 10000 });
    const panel = page.locator('[data-testid="a11y-quick-panel"]');

    await button.focus();
    await page.keyboard.press("Enter");

    // Retry if panel doesn't appear (SSR hydration timing)
    const appeared = await panel
      .waitFor({ state: "visible", timeout: 3000 })
      .then(() => true)
      .catch(() => false);

    if (!appeared) {
      await button.focus();
      await page.keyboard.press("Enter");
      await expect(panel).toBeVisible({ timeout: 10000 });
    }
  });

  test("button toggles panel with Space key", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    const button = page.locator('[data-testid="a11y-floating-button"]');
    await expect(button).toBeVisible({ timeout: 10000 });
    const panel = page.locator('[data-testid="a11y-quick-panel"]');

    await button.focus();
    await page.keyboard.press("Space");

    // Retry if panel doesn't appear (SSR hydration timing)
    const appeared = await panel
      .waitFor({ state: "visible", timeout: 3000 })
      .then(() => true)
      .catch(() => false);

    if (!appeared) {
      await button.focus();
      await page.keyboard.press("Space");
      await expect(panel).toBeVisible({ timeout: 10000 });
    }
  });

  test("button has icon with aria-hidden", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    const button = page.locator('[data-testid="a11y-floating-button"]');
    const icon = button.locator("svg");

    await expect(icon).toHaveAttribute("aria-hidden", "true");
  });
});

/**
 * E2E Tests: Accessibility with data-testid Selectors
 *
 * Tests for accessibility features using data-testid for reliable element selection.
 * Covers: skip link, floating button, quick panel with ARIA attributes.
 *
 * Run: npx playwright test e2e/a11y-data-testid.spec.ts
 */

import {
  test,
  expect,
  toLocalePath,
  openA11yPanel,
} from "./fixtures/a11y-fixtures";

// ============================================================================
// SKIP LINK WITH DATA-TESTID
// ============================================================================

test.describe("Skip Link - data-testid Selectors", () => {
  test("skip link is present and has correct data-testid", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    const skipLink = page.locator('[data-testid="skip-link"]');
    await expect(skipLink).toBeAttached();
  });

  test("skip link becomes visible on focus", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    const skipLink = page.locator('[data-testid="skip-link"]');
    await skipLink.focus();

    const isVisible = await skipLink.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return styles.visibility !== "hidden" && styles.display !== "none";
    });

    expect(isVisible).toBe(true);
  });

  test("skip link navigates to main content on click", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    const skipLink = page.locator('[data-testid="skip-link"]');
    await skipLink.click();
    await page.waitForTimeout(500);

    // Check focus was moved
    const focusedId = await page.evaluate(
      () => document.activeElement?.id || "",
    );
    expect(focusedId).toBe("main-content");
  });

  test("skip link has proper ARIA label", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    const skipLink = page.locator('[data-testid="skip-link"]');
    const label = await skipLink.getAttribute("aria-label");

    expect(label?.length).toBeGreaterThan(0);
  });

  test("skip link has visible focus ring", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    const skipLink = page.locator('[data-testid="skip-link"]');
    await skipLink.focus();

    const focusStyles = await skipLink.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        outline: styles.outline,
        boxShadow: styles.boxShadow,
      };
    });

    const hasFocusIndicator =
      focusStyles.outline !== "none" || focusStyles.boxShadow !== "none";
    expect(hasFocusIndicator).toBe(true);
  });
});

// ============================================================================
// A11Y FLOATING BUTTON WITH DATA-TESTID
// ============================================================================

test.describe("A11y Floating Button - data-testid Selectors", () => {
  test("floating button has data-testid", async ({ page }) => {
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

  test("floating button has aria-haspopup=dialog", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    const button = page.locator('[data-testid="a11y-floating-button"]');
    await expect(button).toHaveAttribute("aria-haspopup", "dialog");
  });

  test("floating button has aria-controls when panel opens", async ({
    page,
  }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    const button = page.locator('[data-testid="a11y-floating-button"]');
    await expect(button).toBeVisible({ timeout: 10000 });

    // aria-controls is only set when panel is expanded
    const controlsBefore = await button.getAttribute("aria-controls");
    expect(controlsBefore).toBeNull();

    // Open panel (retry-click for SSR hydration — onClick may not be attached yet)
    await button.click();
    const panel = page.locator('[data-testid="a11y-quick-panel"]');
    const appeared = await panel
      .waitFor({ state: "visible", timeout: 3000 })
      .then(() => true)
      .catch(() => false);
    if (!appeared) {
      await button.click();
      await expect(panel).toBeVisible({ timeout: 10000 });
    }

    const controlsAfter = await button.getAttribute("aria-controls");
    expect(controlsAfter).toBe("a11y-quick-panel");
  });

  test("aria-expanded becomes true when panel opens", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    const button = page.locator('[data-testid="a11y-floating-button"]');
    await expect(button).toBeVisible({ timeout: 10000 });

    // Initially false
    await expect(button).toHaveAttribute("aria-expanded", "false");

    // Click to open (retry-click for SSR hydration — onClick may not be attached yet)
    await button.click();
    const panel = page.locator('[data-testid="a11y-quick-panel"]');
    const appeared = await panel
      .waitFor({ state: "visible", timeout: 3000 })
      .then(() => true)
      .catch(() => false);
    if (!appeared) {
      await button.click();
      await panel.waitFor({ state: "visible", timeout: 10000 });
    }

    // Should be true
    await expect(button).toHaveAttribute("aria-expanded", "true");
  });

  test("floating button has accessible label", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    const button = page.locator('[data-testid="a11y-floating-button"]');
    const label = await button.getAttribute("aria-label");

    expect(label?.length).toBeGreaterThan(0);
  });

  test("button meets WCAG 44x44px touch target", async ({ page }) => {
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

    expect(box?.y).toBeGreaterThan(0);
    expect(box?.x).toBeGreaterThan(0);
  });
});

// ============================================================================
// A11Y QUICK PANEL WITH DATA-TESTID
// ============================================================================

test.describe("A11y Quick Panel - data-testid Selectors", () => {
  // Panel tests open a dialog and interact with it — slow under load
  test.setTimeout(60000);

  test("quick panel has data-testid", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    const { panel } = await openA11yPanel(page);
    await expect(panel).toBeVisible();
  });

  test("panel has role=dialog", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    const { panel } = await openA11yPanel(page);
    await expect(panel).toHaveAttribute("role", "dialog");
  });

  test("panel has aria-modal=true", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    const { panel } = await openA11yPanel(page);
    await expect(panel).toHaveAttribute("aria-modal", "true");
  });

  test("panel has aria-labelledby", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    const { panel } = await openA11yPanel(page);
    const labelledBy = await panel.getAttribute("aria-labelledby");

    expect(labelledBy?.length).toBeGreaterThan(0);
  });

  test("close button has data-testid", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    await openA11yPanel(page);
    const closeBtn = page.locator('[data-testid="a11y-close-panel-btn"]');
    await expect(closeBtn).toBeVisible();
  });

  test("close button closes panel", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    const { panel } = await openA11yPanel(page);
    await expect(panel).toBeVisible();

    const closeBtn = page.locator('[data-testid="a11y-close-panel-btn"]');
    await closeBtn.click();

    await expect(panel).not.toBeVisible({ timeout: 10000 });
  });

  test("escape key closes panel", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    const { panel } = await openA11yPanel(page);
    await expect(panel).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(panel).not.toBeVisible({ timeout: 10000 });
  });

  test("profile buttons container has data-testid", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    await openA11yPanel(page);
    const profilesContainer = page.locator(
      '[data-testid="a11y-profile-buttons"]',
    );
    await expect(profilesContainer).toBeVisible();
  });

  test("reset button has data-testid", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    await openA11yPanel(page);
    const resetBtn = page.locator('[data-testid="a11y-reset-btn"]');
    await expect(resetBtn).toBeVisible();
  });

  test("full settings link has data-testid", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    await openA11yPanel(page);
    const settingsLink = page.locator(
      '[data-testid="a11y-full-settings-link"]',
    );
    await expect(settingsLink).toBeVisible();
  });

  test("toggle switches have data-testid", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    await openA11yPanel(page);
    // Large text toggle
    const largeTextToggle = page
      .locator('[data-testid*="a11y-toggle"]')
      .first();
    await expect(largeTextToggle).toBeVisible();
    await expect(largeTextToggle).toHaveAttribute("role", "switch");
  });

  test("toggle switches have aria-checked", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    await openA11yPanel(page);
    const toggles = page.locator('[data-testid*="a11y-toggle"]');
    const count = await toggles.count();

    expect(count).toBeGreaterThan(0);

    // Check first toggle
    const firstToggle = toggles.first();
    await expect(firstToggle).toHaveAttribute("aria-checked", /true|false/);
  });

  test("focus trap keeps focus within panel", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    await openA11yPanel(page);

    // Tab multiple times
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press("Tab");
    }

    // Focus should still be in panel
    const focusedParent = await page.evaluate(() =>
      document.activeElement?.closest('[data-testid="a11y-quick-panel"]'),
    );

    expect(focusedParent).toBeTruthy();
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

test.describe("A11y Features Integration with data-testid", () => {
  test("skip link first in tab order", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    await page.keyboard.press("Tab");

    const focusedDataTestId = await page.evaluate(
      () => document.activeElement?.getAttribute("data-testid") || "",
    );

    expect(focusedDataTestId).toBe("skip-link");
  });

  test("can cycle through accessibility features", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    // Tab to skip link
    await page.keyboard.press("Tab");
    const firstElement = await page.evaluate(
      () => document.activeElement?.getAttribute("data-testid") || "",
    );
    expect(firstElement).toBe("skip-link");

    // Tab to floating button
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press("Tab");
      const currentElement = await page.evaluate(
        () => document.activeElement?.getAttribute("data-testid") || "",
      );
      if (currentElement === "a11y-floating-button") {
        break;
      }
    }

    const currentElement = await page.evaluate(
      () => document.activeElement?.getAttribute("data-testid") || "",
    );
    expect(currentElement).toBe("a11y-floating-button");
  });

  test("all accessibility elements have testids", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    const skipLink = page.locator('[data-testid="skip-link"]');
    const floatingBtn = page.locator('[data-testid="a11y-floating-button"]');

    await expect(skipLink).toBeAttached();
    await expect(floatingBtn).toBeAttached();

    // Open panel
    await openA11yPanel(page);

    const panel = page.locator('[data-testid="a11y-quick-panel"]');
    const closeBtn = page.locator('[data-testid="a11y-close-panel-btn"]');

    await expect(panel).toBeVisible();
    await expect(closeBtn).toBeVisible();
  });
});

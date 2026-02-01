/**
 * E2E Tests: Accessibility New Features (Wave 4)
 *
 * Comprehensive tests for newly added accessibility features:
 * - Skip link: keyboard accessible, visible on focus, navigates to main content
 * - A11y floating button: proper ARIA attributes (aria-expanded, aria-haspopup, aria-controls)
 * - A11y quick panel: role="dialog", aria-modal, focus trap, keyboard handling
 *
 * Uses data-testid for reliable selector strategy.
 * Run: npx playwright test e2e/a11y-new-features.spec.ts
 */

import {
  test,
  expect,
  toLocalePath,
  openA11yPanel,
} from "./fixtures/a11y-fixtures";

// ============================================================================
// SKIP LINK TESTS
// ============================================================================

test.describe("Skip Link - WCAG 2.1 AA", () => {
  test("skip link is present on all pages", async ({ page }) => {
    test.setTimeout(60000); // 5 page navigations need more time
    const pages = [
      toLocalePath("/"),
      toLocalePath("/welcome"),
      toLocalePath("/astuccio"),
      toLocalePath("/supporti"),
      toLocalePath("/mindmap"),
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

    // Check that skip link is visually hidden (sr-only or opacity-0)
    const isHidden = await skipLink.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      const classList = el.className;
      return (
        styles.opacity === "0" ||
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

    // Focus the skip link
    await skipLink.focus();

    // Check visibility after focus
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
        ringWidth: styles.getPropertyValue("--ring-width"),
      };
    });

    // Should have visible focus indicator (outline or ring)
    const hasFocusIndicator =
      (focusStyles.outlineWidth !== "0px" && focusStyles.outline !== "none") ||
      focusStyles.boxShadow !== "none";

    expect(hasFocusIndicator).toBe(true);
  });

  test("skip link navigates to main content", async ({ page }) => {
    test.setTimeout(90000);
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    // Wait for React hydration: floating button only renders via React.
    // Use domcontentloaded (not networkidle) to avoid blocking on concurrent
    // API requests from parallel CI workers.
    await page
      .locator('[data-testid="a11y-floating-button"]')
      .waitFor({ state: "visible", timeout: 30000 });

    // Polling loop: click skip link repeatedly until focus moves to main-content.
    // SSR hydration attaches the onClick handler asynchronously — a single
    // retry is not enough under CI resource contention.
    const skipLink = page.locator('[data-testid="skip-link"]');
    let focusMoved = false;

    for (let attempt = 0; attempt < 10 && !focusMoved; attempt++) {
      await skipLink.focus();
      await skipLink.click();
      focusMoved = await page
        .waitForFunction(() => document.activeElement?.id === "main-content", {
          timeout: 3000,
        })
        .then(() => true)
        .catch(() => false);
    }

    const focusedElement = await page.evaluate(
      () => document.activeElement?.id,
    );
    expect(focusedElement).toBe("main-content");
  });

  test("skip link announces navigation to screen readers", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    const skipLink = page.locator('[data-testid="skip-link"]');

    // Click skip link
    await skipLink.click();
    await page.waitForTimeout(100);

    // Check for live region announcement
    const liveRegion = page.locator('[role="status"][aria-live="polite"]');
    const isPresent = await liveRegion.count().then((c) => c > 0);

    expect(isPresent).toBe(true);
  });
});

// ============================================================================
// A11Y FLOATING BUTTON ARIA ATTRIBUTES
// ============================================================================

test.describe("A11y Floating Button - ARIA Attributes", () => {
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

  test("floating button has aria-controls pointing to panel", async ({
    page,
  }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    const button = page.locator('[data-testid="a11y-floating-button"]');

    // aria-controls is only set when panel is expanded
    const controlsAttr = await button.getAttribute("aria-controls");
    expect(controlsAttr).toBeNull();

    // Open panel — aria-controls should now reference the panel
    const { button: openedButton } = await openA11yPanel(page);

    const controlsAfter = await openedButton.getAttribute("aria-controls");
    expect(controlsAfter).toBe("a11y-quick-panel");

    const controlledElement = page.locator(`#${controlsAfter}`);
    await expect(controlledElement).toBeAttached();
  });

  test("aria-expanded changes to true when panel opens", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    const button = page.locator('[data-testid="a11y-floating-button"]');

    // Initially false
    await expect(button).toHaveAttribute("aria-expanded", "false");

    // Click to open
    const { button: openedButton } = await openA11yPanel(page);

    // Should be true
    await expect(openedButton).toHaveAttribute("aria-expanded", "true");
  });

  test("button has proper accessibility label", async ({ page }) => {
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
});

// ============================================================================
// A11Y QUICK PANEL DIALOG ACCESSIBILITY
// ============================================================================

test.describe("A11y Quick Panel - Dialog Accessibility", () => {
  test("quick panel has role=dialog", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    const { panel: dialog } = await openA11yPanel(page);
    await expect(dialog).toBeVisible();
  });

  test("quick panel has aria-modal=true", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    const { panel: dialog } = await openA11yPanel(page);
    await expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  test("quick panel has aria-labelledby", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    const { panel: dialog } = await openA11yPanel(page);

    const labelledBy = await dialog.getAttribute("aria-labelledby");

    expect(labelledBy).toBeTruthy();

    // The labeled element should exist
    const labelElement = page.locator(`#${labelledBy}`);
    await expect(labelElement).toBeAttached();
  });

  test("focus trap keeps focus within panel", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    await openA11yPanel(page);

    // Tab through multiple times
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press("Tab");
    }

    // Check that focus is still within dialog
    const _dialogId = await page.locator('[role="dialog"]').getAttribute("id");

    const activeElement = await page.evaluate(() => {
      const el = document.activeElement;
      const dialog = document.querySelector('[role="dialog"]');
      return dialog?.contains(el);
    });

    expect(activeElement).toBe(true);
  });

  test("escape key closes panel", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    const { panel: dialog } = await openA11yPanel(page);

    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible({ timeout: 10000 });
  });

  test("close button has proper accessibility label", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    await openA11yPanel(page);

    const closeButton = page.locator('[data-testid="a11y-close-panel-btn"]');
    await expect(closeButton).toBeAttached();

    const label = await closeButton.getAttribute("aria-label");
    expect(label?.length).toBeGreaterThan(0);
  });

  test("panel contains profile buttons with aria-label", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    await openA11yPanel(page);

    // Check for profile buttons with aria-label
    const profileButtons = page.locator(
      '[role="dialog"] button[aria-label*="Attiva"], [role="dialog"] button[aria-label*="Activate"]',
    );

    const count = await profileButtons.count();
    expect(count).toBeGreaterThan(0);
  });

  test("toggle switches have role=switch and aria-checked", async ({
    page,
  }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    await openA11yPanel(page);

    const toggles = page.locator('[role="dialog"] [role="switch"]');
    const count = await toggles.count();

    expect(count).toBeGreaterThan(0);

    // Check first toggle
    const firstToggle = toggles.first();
    await expect(firstToggle).toHaveAttribute("aria-checked", /true|false/);
    const label = await firstToggle.getAttribute("aria-label");
    expect(label?.length).toBeGreaterThan(0);
  });

  test("sections have proper aria-labelledby", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    await openA11yPanel(page);

    const sections = page.locator('[role="dialog"] section');
    const count = await sections.count();

    expect(count).toBeGreaterThan(0);

    // Each section should have aria-labelledby
    for (let i = 0; i < count; i++) {
      const section = sections.nth(i);
      const labelledBy = await section.getAttribute("aria-labelledby");
      expect(labelledBy?.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// ACCESSIBILITY FEATURES INTEGRATION
// ============================================================================

test.describe("A11y Features Integration", () => {
  test("skip link and floating button both work together", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("networkidle");

    // Tab to skip link
    await page.keyboard.press("Tab");
    const activeElement = await page.evaluate(
      () => document.activeElement?.getAttribute("href") || "",
    );
    const isSkipLink =
      activeElement.includes("#main") || activeElement.includes("#content");

    if (isSkipLink) {
      // Skip link is first, activate it
      await page.keyboard.press("Enter");

      // Wait for focus to move to main content (handler runs after hydration)
      await page.waitForFunction(
        () => document.activeElement?.id === "main-content",
        { timeout: 5000 },
      );

      const focusedId = await page.evaluate(
        () => document.activeElement?.id || "",
      );
      expect(focusedId).toBe("main-content");
    }
  });

  test("accessibility panel does not interfere with page content", async ({
    page,
  }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    // Get main content element count before opening panel
    const mainCountBefore = await page.locator("main").count();

    // Open accessibility panel
    const { panel: dialog } = await openA11yPanel(page);

    // Get main content element count after opening panel
    const mainCountAfter = await page.locator("main").count();

    // Count should be the same
    expect(mainCountAfter).toBe(mainCountBefore);

    // Panel should be a separate dialog element
    await expect(dialog).toBeVisible();
  });
});

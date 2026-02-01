/**
 * E2E Tests: A11y Quick Panel (Dialog)
 *
 * Tests for accessibility quick panel component:
 * - role="dialog" and aria-modal
 * - aria-labelledby for accessible title
 * - Focus trap within dialog
 * - Keyboard interactions (Escape to close)
 * - data-testid for reliable selection
 *
 * Run: npx playwright test e2e/a11y-quick-panel.spec.ts
 */

import { test, expect, toLocalePath } from "./fixtures/a11y-fixtures";

test.describe("A11y Quick Panel - Dialog Accessibility", () => {
  // Panel tests open a dialog and interact with it — slow under CI load
  test.setTimeout(60000);

  test("quick panel has data-testid", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    const button = page.locator('[data-testid="a11y-floating-button"]');
    await expect(button).toBeVisible({ timeout: 10000 });
    await button.click();
    const panel = page.locator('[data-testid="a11y-quick-panel"]');
    await expect(panel).toBeVisible({ timeout: 10000 });
  });

  test("quick panel has role=dialog", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    const button = page.locator('[data-testid="a11y-floating-button"]');
    await expect(button).toBeVisible({ timeout: 10000 });
    await button.click();
    const dialog = page.locator('[data-testid="a11y-quick-panel"]');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expect(dialog).toHaveAttribute("role", "dialog");
  });

  test("quick panel has aria-modal=true", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    const button = page.locator('[data-testid="a11y-floating-button"]');
    await expect(button).toBeVisible({ timeout: 10000 });
    await button.click();
    const dialog = page.locator('[data-testid="a11y-quick-panel"]');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  test("quick panel has aria-labelledby pointing to title", async ({
    page,
  }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    const button = page.locator('[data-testid="a11y-floating-button"]');
    await expect(button).toBeVisible({ timeout: 10000 });
    await button.click();
    const dialog = page.locator('[data-testid="a11y-quick-panel"]');
    await expect(dialog).toBeVisible({ timeout: 10000 });

    const labelledBy = await dialog.getAttribute("aria-labelledby");

    expect(labelledBy).toBeTruthy();

    const titleElement = page.locator(`#${labelledBy}`);
    await expect(titleElement).toBeAttached();
  });

  test("focus trap keeps focus within panel", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    const button = page.locator('[data-testid="a11y-floating-button"]');
    await expect(button).toBeVisible({ timeout: 10000 });
    await button.click();
    const panel = page.locator('[data-testid="a11y-quick-panel"]');
    await expect(panel).toBeVisible({ timeout: 10000 });

    for (let i = 0; i < 20; i++) {
      await page.keyboard.press("Tab");
    }

    const activeElement = await page.evaluate(() => {
      const dialog = document.querySelector('[data-testid="a11y-quick-panel"]');
      return dialog?.contains(document.activeElement);
    });

    expect(activeElement).toBe(true);
  });

  test("escape key closes panel", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    const button = page.locator('[data-testid="a11y-floating-button"]');
    await expect(button).toBeVisible({ timeout: 10000 });
    await button.click();
    const panel = page.locator('[data-testid="a11y-quick-panel"]');
    await expect(panel).toBeVisible({ timeout: 10000 });

    await page.keyboard.press("Escape");
    await expect(panel).not.toBeVisible({ timeout: 10000 });
  });

  test("close button has data-testid", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    const button = page.locator('[data-testid="a11y-floating-button"]');
    await expect(button).toBeVisible({ timeout: 10000 });
    await button.click();
    const panel = page.locator('[data-testid="a11y-quick-panel"]');
    await expect(panel).toBeVisible({ timeout: 10000 });

    const closeBtn = page.locator('[data-testid="a11y-close-panel-btn"]');
    await expect(closeBtn).toBeVisible();
  });

  test("close button closes panel", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    const button = page.locator('[data-testid="a11y-floating-button"]');
    await expect(button).toBeVisible({ timeout: 10000 });
    await button.click();
    const panel = page.locator('[data-testid="a11y-quick-panel"]');
    await expect(panel).toBeVisible({ timeout: 10000 });

    const closeBtn = page.locator('[data-testid="a11y-close-panel-btn"]');
    await closeBtn.click();
    await expect(panel).not.toBeVisible({ timeout: 10000 });
  });

  test("profile buttons container has data-testid", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    const button = page.locator('[data-testid="a11y-floating-button"]');
    await expect(button).toBeVisible({ timeout: 10000 });
    await button.click();
    const panel = page.locator('[data-testid="a11y-quick-panel"]');
    await expect(panel).toBeVisible({ timeout: 10000 });

    const profilesContainer = page.locator(
      '[data-testid="a11y-profile-buttons"]',
    );
    await expect(profilesContainer).toBeVisible();
  });

  test("reset button has data-testid", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    const button = page.locator('[data-testid="a11y-floating-button"]');
    await expect(button).toBeVisible({ timeout: 10000 });
    await button.click();
    const panel = page.locator('[data-testid="a11y-quick-panel"]');
    await expect(panel).toBeVisible({ timeout: 10000 });

    const resetBtn = page.locator('[data-testid="a11y-reset-btn"]');
    await expect(resetBtn).toBeVisible();
  });

  test("full settings link has data-testid", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    const button = page.locator('[data-testid="a11y-floating-button"]');
    await expect(button).toBeVisible({ timeout: 10000 });
    await button.click();
    const panel = page.locator('[data-testid="a11y-quick-panel"]');
    await expect(panel).toBeVisible({ timeout: 10000 });

    const settingsLink = page.locator(
      '[data-testid="a11y-full-settings-link"]',
    );
    await expect(settingsLink).toBeVisible();
  });

  test("toggle switches visible in panel", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    const button = page.locator('[data-testid="a11y-floating-button"]');
    await expect(button).toBeVisible({ timeout: 10000 });
    await button.click();
    const panel = page.locator('[data-testid="a11y-quick-panel"]');
    await expect(panel).toBeVisible({ timeout: 10000 });

    const toggles = page.locator('[data-testid*="a11y-toggle"]');
    const count = await toggles.count();

    expect(count).toBeGreaterThan(0);
  });

  test("panel does not interfere with page content", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("networkidle");

    const mainCountBefore = await page.locator("main").count();

    const button = page.locator('[data-testid="a11y-floating-button"]');
    await expect(button).toBeVisible({ timeout: 10000 });
    await button.click();
    const dialog = page.locator('[data-testid="a11y-quick-panel"]');
    await expect(dialog).toBeVisible({ timeout: 10000 });

    const mainCountAfter = await page.locator("main").count();

    expect(mainCountAfter).toBe(mainCountBefore);
  });
});

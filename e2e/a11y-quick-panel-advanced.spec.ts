/**
 * E2E Tests: A11y Quick Panel - Advanced Features
 *
 * Advanced accessibility tests for quick panel:
 * - Nested sections with aria-labelledby
 * - Toggle switches with aria-checked and aria-label
 * - Panel closing behaviors (escape, click outside, close button)
 *
 * Run: npx playwright test e2e/a11y-quick-panel-advanced.spec.ts
 */

import { test, expect } from "./fixtures/base-fixtures";

test.describe("A11y Quick Panel - Advanced Dialog Features", () => {
  test("toggle switches have role=switch", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const button = page.locator('[data-testid="a11y-floating-button"]');
    await button.click();
    await page.waitForTimeout(300);

    const toggles = page.locator('[data-testid*="a11y-toggle"]');
    const count = await toggles.count();

    expect(count).toBeGreaterThan(0);

    const firstToggle = toggles.first();
    await expect(firstToggle).toHaveAttribute("role", "switch");
  });

  test("toggle switches have aria-checked", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const button = page.locator('[data-testid="a11y-floating-button"]');
    await button.click();
    await page.waitForTimeout(300);

    const toggles = page.locator('[data-testid*="a11y-toggle"]');

    for (let i = 0; i < (await toggles.count()); i++) {
      const toggle = toggles.nth(i);
      await expect(toggle).toHaveAttribute("aria-checked", /true|false/);
    }
  });

  test("toggle switches have aria-label", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const button = page.locator('[data-testid="a11y-floating-button"]');
    await button.click();
    await page.waitForTimeout(300);

    const toggles = page.locator('[data-testid*="a11y-toggle"]');

    for (let i = 0; i < (await toggles.count()); i++) {
      const toggle = toggles.nth(i);
      const label = await toggle.getAttribute("aria-label");
      expect(label?.length).toBeGreaterThan(0);
    }
  });

  test("panel sections have aria-labelledby", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const button = page.locator('[data-testid="a11y-floating-button"]');
    await button.click();
    await page.waitForTimeout(300);

    const sections = page.locator('[data-testid="a11y-quick-panel"] section');
    const count = await sections.count();

    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const section = sections.nth(i);
      const labelledBy = await section.getAttribute("aria-labelledby");
      expect(labelledBy?.length).toBeGreaterThan(0);
    }
  });

  test("clicking outside panel closes it", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const button = page.locator('[data-testid="a11y-floating-button"]');
    await button.click();
    await page.waitForTimeout(300);

    const panel = page.locator('[data-testid="a11y-quick-panel"]');
    await expect(panel).toBeVisible();

    await page.mouse.click(10, 10);
    await page.waitForTimeout(300);

    await expect(panel).not.toBeVisible();
  });

  test("reset button clears all settings", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const button = page.locator('[data-testid="a11y-floating-button"]');
    await button.click();
    await page.waitForTimeout(300);

    // Get initial state
    const toggleBefore = page.locator('[data-testid*="a11y-toggle"]').first();
    const checkedBefore = await toggleBefore.getAttribute("aria-checked");

    // If false, activate toggle
    if (checkedBefore === "false") {
      await toggleBefore.click();
      await page.waitForTimeout(200);
    }

    // Click reset
    const resetBtn = page.locator('[data-testid="a11y-reset-btn"]');
    await resetBtn.click();
    await page.waitForTimeout(300);

    // Verify toggle is reset
    const checkedAfter = await toggleBefore.getAttribute("aria-checked");
    expect(checkedAfter).toBe("false");
  });

  test("full settings link navigates correctly", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const button = page.locator('[data-testid="a11y-floating-button"]');
    await button.click();
    await page.waitForTimeout(300);

    const settingsLink = page.locator(
      '[data-testid="a11y-full-settings-link"]',
    );
    const href = await settingsLink.getAttribute("href");

    expect(href).toContain("/settings");
    expect(href).toContain("section=accessibility");
  });

  test("profile buttons accessible with keyboard", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const button = page.locator('[data-testid="a11y-floating-button"]');
    await button.click();
    await page.waitForTimeout(300);

    // Tab to first profile button
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("Tab");
    }

    const activeElement = await page.evaluate(
      () =>
        document.activeElement?.closest('[data-testid*="a11y-profile"]')
          ?.tagName || "",
    );

    expect(activeElement).toBe("BUTTON");
  });

  test("panel maintains height constraint", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const button = page.locator('[data-testid="a11y-floating-button"]');
    await button.click();
    await page.waitForTimeout(300);

    const panel = page.locator('[data-testid="a11y-quick-panel"]');
    const box = await panel.boundingBox();

    // Panel should not exceed viewport height
    expect(box?.height).toBeLessThan(window.innerHeight || 1000);
  });
});

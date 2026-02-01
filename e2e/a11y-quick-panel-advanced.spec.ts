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

import {
  test,
  expect,
  toLocalePath,
  openA11yPanel,
} from "./fixtures/a11y-fixtures";

test.describe("A11y Quick Panel - Advanced Dialog Features", () => {
  // Panel tests open a dialog and interact with it — slow under CI load
  test.setTimeout(60000);

  test("toggle switches have role=switch", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    await openA11yPanel(page);

    const toggles = page.locator('[data-testid*="a11y-toggle"]');
    const count = await toggles.count();

    expect(count).toBeGreaterThan(0);

    const firstToggle = toggles.first();
    await expect(firstToggle).toHaveAttribute("role", "switch");
  });

  test("toggle switches have aria-checked", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    await openA11yPanel(page);

    const toggles = page.locator('[data-testid*="a11y-toggle"]');

    for (let i = 0; i < (await toggles.count()); i++) {
      const toggle = toggles.nth(i);
      await expect(toggle).toHaveAttribute("aria-checked", /true|false/);
    }
  });

  test("toggle switches have aria-label", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    await openA11yPanel(page);

    const toggles = page.locator('[data-testid*="a11y-toggle"]');

    for (let i = 0; i < (await toggles.count()); i++) {
      const toggle = toggles.nth(i);
      const label = await toggle.getAttribute("aria-label");
      expect(label?.length).toBeGreaterThan(0);
    }
  });

  test("panel sections have aria-labelledby", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    await openA11yPanel(page);

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
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    const { panel } = await openA11yPanel(page);

    // Click left side of viewport to hit the backdrop overlay
    // (avoid top-left where skip-link sits, and right side where panel is)
    const viewport = page.viewportSize();
    await page.mouse.click(
      (viewport?.width ?? 800) / 4,
      (viewport?.height ?? 600) / 2,
    );
    await expect(panel).not.toBeVisible({ timeout: 10000 });
  });

  test("reset button clears all settings", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    await openA11yPanel(page);

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
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    await openA11yPanel(page);

    const settingsLink = page.locator(
      '[data-testid="a11y-full-settings-link"]',
    );
    const href = await settingsLink.getAttribute("href");

    expect(href).toContain("/settings");
    expect(href).toContain("section=accessibility");
  });

  test("profile buttons accessible with keyboard", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    await openA11yPanel(page);

    // Tab to first profile button
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("Tab");
    }

    // Check that a profile button inside the profiles container is focused
    const isProfileButton = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el.tagName !== "BUTTON") return false;
      const container = el.closest('[data-testid="a11y-profile-buttons"]');
      return container !== null;
    });

    expect(isProfileButton).toBe(true);
  });

  test("panel maintains height constraint", async ({ page }) => {
    await page.goto(toLocalePath("/"));
    await page.waitForLoadState("domcontentloaded");

    const { panel } = await openA11yPanel(page);

    const box = await panel.boundingBox();

    // Panel should not exceed viewport height
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    expect(box?.height).toBeLessThan(viewportHeight || 1000);
  });
});

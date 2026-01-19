/**
 * Instant Accessibility Feature E2E Tests
 *
 * Tests for the floating accessibility button and quick panel.
 * Run: npx playwright test e2e/a11y-instant-access.spec.ts
 */

import { test, expect } from "@playwright/test";

test.describe("A11y Instant Access - Floating Button", () => {
  test("floating button is visible on homepage", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const button = page.locator('button[aria-label*="accessibilità"]');
    await expect(button).toBeVisible();
  });

  test("floating button has WCAG compliant size (44x44)", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const button = page.locator('button[aria-label*="accessibilità"]');
    const box = await button.boundingBox();

    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
  });

  test("floating button visible on legal pages", async ({ page }) => {
    const legalPages = ["/privacy", "/termini", "/cookies"];

    for (const path of legalPages) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");

      const button = page.locator('button[aria-label*="accessibilità"]');
      await expect(button).toBeVisible({ timeout: 5000 });
    }
  });

  test("button has proper ARIA attributes", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const button = page.locator('button[aria-label*="accessibilità"]');
    await expect(button).toHaveAttribute("aria-expanded", "false");
    await expect(button).toHaveAttribute("aria-controls");
  });
});

test.describe("A11y Instant Access - Quick Panel", () => {
  test("clicking button opens panel", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const button = page.locator('button[aria-label*="accessibilità"]');
    await button.click();

    const panel = page
      .locator('[role="dialog"]')
      .filter({ hasText: "Impostazioni Accessibilità" });
    await expect(panel).toBeVisible();
  });

  test("panel displays 7 profile presets", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const button = page.locator('button[aria-label*="accessibilità"]');
    await button.click();

    // Check for profile buttons
    const profiles = [
      "Dislessia",
      "ADHD",
      "Visivo",
      "Motorio",
      "Autismo",
      "Uditivo",
      "Motorio+",
    ];

    for (const profile of profiles) {
      const profileBtn = page.locator(`button:has-text("${profile}")`);
      await expect(profileBtn).toBeVisible();
    }
  });

  test("Escape key closes panel", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const button = page.locator('button[aria-label*="accessibilità"]');
    await button.click();

    const panel = page
      .locator('[role="dialog"]')
      .filter({ hasText: "Impostazioni Accessibilità" });
    await expect(panel).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(panel).not.toBeVisible();
  });

  test("clicking outside closes panel", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const button = page.locator('button[aria-label*="accessibilità"]');
    await button.click();

    const panel = page
      .locator('[role="dialog"]')
      .filter({ hasText: "Impostazioni Accessibilità" });
    await expect(panel).toBeVisible();

    // Click outside
    await page.mouse.click(10, 10);
    await expect(panel).not.toBeVisible();
  });

  test("close button closes panel", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const button = page.locator('button[aria-label*="accessibilità"]');
    await button.click();

    const closeBtn = page.locator('button[aria-label="Chiudi pannello"]');
    await closeBtn.click();

    const panel = page
      .locator('[role="dialog"]')
      .filter({ hasText: "Impostazioni Accessibilità" });
    await expect(panel).not.toBeVisible();
  });
});

test.describe("A11y Instant Access - Profile Activation", () => {
  test("selecting dyslexia profile changes font", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Open panel
    const button = page.locator('button[aria-label*="accessibilità"]');
    await button.click();

    // Activate dyslexia profile
    const dyslexiaBtn = page.locator('button:has-text("Dislessia")');
    await dyslexiaBtn.click();

    // Wait for settings to apply
    await page.waitForTimeout(300);

    // Check font changed
    const body = page.locator("body");
    const fontFamily = await body.evaluate(
      (el) => window.getComputedStyle(el).fontFamily,
    );
    expect(fontFamily).toContain("OpenDyslexic");
  });

  test("active profile shows indicator on floating button", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Open panel and activate profile
    const button = page.locator('button[aria-label*="accessibilità"]');
    await button.click();

    const adhBtn = page.locator('button:has-text("ADHD")');
    await adhBtn.click();

    // Close panel
    await page.keyboard.press("Escape");

    // Check for active indicator (green dot)
    const indicator = button.locator(".bg-green-500");
    await expect(indicator).toBeVisible();
  });

  test("reset button clears profile", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Open panel and activate profile
    const button = page.locator('button[aria-label*="accessibilità"]');
    await button.click();

    const dyslexiaBtn = page.locator('button:has-text("Dislessia")');
    await dyslexiaBtn.click();

    // Click reset
    const resetBtn = page.locator('button:has-text("Ripristina")');
    await resetBtn.click();

    // Wait for reset
    await page.waitForTimeout(300);

    // Font should be back to default
    const body = page.locator("body");
    const fontFamily = await body.evaluate(
      (el) => window.getComputedStyle(el).fontFamily,
    );
    expect(fontFamily).not.toContain("OpenDyslexic");
  });
});

test.describe("A11y Instant Access - Cookie Persistence", () => {
  test("settings persist after page refresh", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Activate dyslexia profile
    const button = page.locator('button[aria-label*="accessibilità"]');
    await button.click();

    const dyslexiaBtn = page.locator('button:has-text("Dislessia")');
    await dyslexiaBtn.click();

    // Wait for cookie to be set
    await page.waitForTimeout(500);

    // Refresh page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Check font is still OpenDyslexic
    const body = page.locator("body");
    const fontFamily = await body.evaluate(
      (el) => window.getComputedStyle(el).fontFamily,
    );
    expect(fontFamily).toContain("OpenDyslexic");
  });

  test("a11y cookie is set with correct name", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Activate a profile
    const button = page.locator('button[aria-label*="accessibilità"]');
    await button.click();

    const visualBtn = page.locator('button:has-text("Visivo")');
    await visualBtn.click();

    // Wait for cookie
    await page.waitForTimeout(500);

    // Check cookie exists
    const cookies = await page.context().cookies();
    const a11yCookie = cookies.find((c) => c.name === "mirrorbuddy-a11y");
    expect(a11yCookie).toBeDefined();
  });
});

test.describe("A11y Instant Access - Keyboard Navigation", () => {
  test("can open panel with keyboard", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Tab to button
    const button = page.locator('button[aria-label*="accessibilità"]');
    await button.focus();
    await page.keyboard.press("Enter");

    const panel = page
      .locator('[role="dialog"]')
      .filter({ hasText: "Impostazioni Accessibilità" });
    await expect(panel).toBeVisible();
  });

  test("focus trap keeps focus within panel", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const button = page.locator('button[aria-label*="accessibilità"]');
    await button.click();

    // Tab multiple times
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press("Tab");
    }

    // Focus should still be within panel
    const activeElement = await page.evaluate(() => {
      const el = document.activeElement;
      const panel = document.querySelector('[role="dialog"]');
      return panel?.contains(el);
    });

    expect(activeElement).toBe(true);
  });
});

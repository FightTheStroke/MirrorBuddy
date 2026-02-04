/**
 * E2E Tests: Parent Dashboard Route
 *
 * Tests the /parent-dashboard route created in W2.
 * Verifies the route loads correctly with proper authentication.
 *
 * F-16: Parent dashboard route and login redirect
 *
 * Acceptance Criteria:
 * 1. /it/parent-dashboard route exists and loads
 * 2. Page displays without 404 errors
 * 3. Authenticated users can access the page
 * 4. Page has proper metadata and structure
 *
 * Run: npx playwright test e2e/parent-dashboard.spec.ts
 */

import { test, expect } from "./fixtures/auth-fixtures";

test.describe("Parent Dashboard Route (F-16)", () => {
  test("authenticated user can access /it/parent-dashboard", async ({
    adminPage,
  }) => {
    // Navigate to parent dashboard with Italian locale
    await adminPage.goto("/it/parent-dashboard");
    await adminPage.waitForLoadState("domcontentloaded");

    // Should not show 404 error page (check visible text, not script content)
    // Use innerText to get only visible text, excluding script tags
    const visibleText = await adminPage.locator("body").innerText();
    expect(visibleText).not.toMatch(/\b404\b/);
    expect(visibleText).not.toContain("Not Found");
    expect(visibleText).not.toContain("Non trovato");

    // Page should be visible (not blank)
    const bodyVisible = await adminPage.locator("body").isVisible();
    expect(bodyVisible).toBe(true);

    // Should have meaningful content (either dashboard or consent form)
    const hasContent = await adminPage
      .locator("main, [role='main'], div.min-h-screen")
      .first()
      .isVisible();
    expect(hasContent).toBe(true);
  });

  test("parent dashboard page loads in English locale", async ({
    adminPage,
  }) => {
    // Test with English locale
    await adminPage.goto("/en/parent-dashboard");
    await adminPage.waitForLoadState("domcontentloaded");

    // Should not show 404 error page (check visible text, not script content)
    const visibleText = await adminPage.locator("body").innerText();
    expect(visibleText).not.toMatch(/\b404\b/);
    expect(visibleText).not.toContain("Not Found");

    // Page should be visible
    const bodyVisible = await adminPage.locator("body").isVisible();
    expect(bodyVisible).toBe(true);
  });

  test("parent dashboard has proper page structure", async ({ adminPage }) => {
    await adminPage.goto("/it/parent-dashboard");
    await adminPage.waitForLoadState("domcontentloaded");

    // Should have either:
    // 1. The dashboard content (if profile exists and consent given)
    // 2. Consent form (if consent not given)
    // 3. No profile state (if profile doesn't exist)
    const hasStructure =
      (await adminPage.locator("main").isVisible()) ||
      (await adminPage.locator("[role='main']").isVisible()) ||
      (await adminPage.locator("div.min-h-screen").isVisible());

    expect(hasStructure).toBe(true);
  });

  test("parent dashboard page title is set correctly", async ({
    adminPage,
  }) => {
    await adminPage.goto("/it/parent-dashboard");
    await adminPage.waitForLoadState("domcontentloaded");

    // Page should have a title (metadata)
    const title = await adminPage.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
  });

  test("parent dashboard does not throw JavaScript errors on load", async ({
    adminPage,
  }) => {
    const errors: string[] = [];

    adminPage.on("pageerror", (error) => {
      errors.push(error.message);
    });

    await adminPage.goto("/it/parent-dashboard");
    await adminPage.waitForLoadState("domcontentloaded");
    await adminPage.waitForTimeout(1000); // Wait for any lazy-loaded errors

    // Should not have critical JavaScript errors
    const criticalErrors = errors.filter(
      (err) =>
        !err.includes("ResizeObserver") &&
        !err.includes("Warning") &&
        !err.includes("hydration"),
    );

    expect(
      criticalErrors,
      `Critical JS errors: ${criticalErrors.join(", ")}`,
    ).toHaveLength(0);
  });
});

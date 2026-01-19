/**
 * E2E TESTS: Login/Logout Flow
 * Tests user authentication, form rendering, error handling, and session management
 * F-06: Auth Flow Tests
 */

import { test, expect } from "@playwright/test";

test.describe("Login/Logout Authentication Flow", () => {
  test.beforeEach(async ({ context }) => {
    // Clear cookies for fresh login tests (skip stored auth)
    await context.clearCookies();
  });

  test("Login page renders with form", async ({ page }) => {
    await page.goto("/login");

    // Check form elements exist (login uses username field, not email)
    await expect(page.locator("form")).toBeVisible();
    await expect(page.locator("input#username")).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("Login with invalid credentials shows error", async ({ page }) => {
    await page.goto("/login");

    // Fill form with invalid credentials (login uses username field)
    await page.fill("input#username", "invaliduser");
    await page.fill('input[type="password"]', "wrongpassword123");
    await page.click('button[type="submit"]');

    // Expect error message to appear
    await expect(page.locator('[role="alert"]')).toBeVisible();
    await expect(
      page.locator("text=/invalid|incorrect|unauthorized/i"),
    ).toBeVisible();

    // Should stay on login page
    expect(page.url()).toContain("/login");
  });

  test("Login with valid credentials redirects to home", async ({
    page,
    request: _request,
  }) => {
    // Seed user via API (requires test user fixture)
    const testUser = {
      email: "test@example.com",
      password: "TestPassword123!",
    };

    await page.goto("/login");

    // Fill form with valid credentials (login uses username field)
    await page.fill("input#username", testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');

    // Should redirect to home or dashboard
    await page.waitForURL(/\/(home|dashboard|$)/);
    expect(
      ["http://localhost:3000/", "http://localhost:3000/home"].some((url) =>
        page.url().startsWith(url),
      ),
    ).toBeTruthy();
  });

  test("Logout clears session and redirects to login", async ({ page }) => {
    // Start authenticated (using storage state)
    await page.goto("/home");

    // Verify user is authenticated
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();

    // Click logout
    await page.click('[data-testid="logout-button"]');

    // Should redirect to login
    await page.waitForURL("/login");

    // Session cookie should be cleared
    const cookies = await page.context().cookies();
    const authCookie = cookies.find((c) => c.name === "mirrorbuddy-user-id");
    expect(authCookie).toBeUndefined();
  });

  test("Protected page redirects unauthenticated users to login", async ({
    context,
    page,
  }) => {
    // Clear auth cookies
    await context.clearCookies();

    // Try to access protected page
    await page.goto("/home");

    // Should redirect to login
    await page.waitForURL("/login");
    expect(page.url()).toContain("/login");
  });
});

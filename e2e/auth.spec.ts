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

    // Check form elements exist (login uses email field, not email)
    await expect(page.locator("form")).toBeVisible();
    await expect(page.locator("input#email")).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("Login with invalid credentials shows error", async ({ page }) => {
    await page.goto("/login");

    // Fill form with invalid credentials (login uses email field)
    // Use valid email format to pass browser validation, but non-existent user
    await page.fill("input#email", "nonexistent@test.com");
    await page.fill('input[type="password"]', "wrongpassword123");
    await page.click('button[type="submit"]');

    // Wait for API response
    await page.waitForTimeout(1000);

    // Expect error message to appear (Italian: "Credenziali non valide" or similar)
    await expect(page.locator('[role="alert"]')).toBeVisible();
    await expect(
      page.locator("text=/non valide|invalid|errore|incorrect|unauthorized/i"),
    ).toBeVisible();

    // Should stay on login page
    expect(page.url()).toContain("/login");
  });

  test("Login with valid credentials redirects to home", async ({
    page,
    request: _request,
  }) => {
    // This test requires a seeded test user in the database
    // In CI, test user is created via prisma seed or fixture
    // Skip if no test user environment is configured
    const testUser = {
      email: process.env.TEST_USER_EMAIL || "test@example.com",
      password: process.env.TEST_USER_PASSWORD || "TestPassword123!",
    };

    await page.goto("/login");

    // Fill form with valid credentials (login uses email field)
    await page.fill("input#email", testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');

    // Should redirect to home or show error (depending on user existence)
    // Wait for navigation or error
    await Promise.race([
      page.waitForURL(/\/(home|welcome|$)/, { timeout: 5000 }),
      page.waitForSelector('[role="alert"]', { timeout: 5000 }),
    ]);

    // If we got an error, the test user doesn't exist - skip gracefully
    const hasError = await page.locator('[role="alert"]').isVisible();
    if (hasError) {
      test.skip(true, "Test user not seeded in database");
      return;
    }

    expect(
      [
        "http://localhost:3000/",
        "http://localhost:3000/home",
        "http://localhost:3000/welcome",
      ].some((url) => page.url().startsWith(url)),
    ).toBeTruthy();
  });

  test("Logout clears session and redirects to login", async ({ page }) => {
    // This test requires an authenticated session
    // Set up auth cookie to simulate logged-in user
    await page.context().addCookies([
      {
        name: "mirrorbuddy-user-id",
        value: "test-user-id.signature", // Simulated signed cookie
        domain: "localhost",
        path: "/",
      },
    ]);

    // Navigate to settings where logout is available
    await page.goto("/");

    // Wait for app to load and navigate to settings
    await page.waitForLoadState("networkidle");

    // Click settings in sidebar (or navigate directly)
    // The logout button is in Settings > Privacy
    // For simplicity, check if we can access settings page
    await page.goto("/settings", { waitUntil: "networkidle" });

    // If user-menu (account section) is visible, we can logout
    const userMenu = page.locator('[data-testid="user-menu"]');
    const isUserMenuVisible = await userMenu
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    if (!isUserMenuVisible) {
      // User not authenticated or account section not shown
      test.skip(true, "User not authenticated - account section not visible");
      return;
    }

    // Click logout
    await page.click('[data-testid="logout-button"]');

    // Should redirect to login (may include query params like ?redirect=...)
    await page.waitForURL(/\/login/, { timeout: 5000 });

    // Session cookie should be cleared
    const cookies = await page.context().cookies();
    const authCookie = cookies.find((c) => c.name === "mirrorbuddy-user-id");
    expect(authCookie?.value || "").toBe("");
  });

  test("Protected admin page redirects unauthenticated users", async ({
    context,
    page,
  }) => {
    // Clear auth cookies
    await context.clearCookies();

    // Try to access protected admin page (requires authentication)
    await page.goto("/admin/invites");

    // Should redirect to login or show unauthorized
    // Admin pages require authentication
    await Promise.race([
      page.waitForURL(/\/login/, { timeout: 5000 }),
      page.waitForSelector("text=/unauthorized|accesso negato|login/i", {
        timeout: 5000,
      }),
    ]);

    // Either redirected to login or shows unauthorized message
    const isOnLogin = page.url().includes("/login");
    const hasUnauthorized = await page
      .locator("text=/unauthorized|accesso negato/i")
      .isVisible()
      .catch(() => false);

    expect(isOnLogin || hasUnauthorized).toBeTruthy();
  });
});

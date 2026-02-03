/**
 * E2E Tests: Login Redirect with Locale
 *
 * Tests the login redirect behavior fixed in W2.
 * Verifies that unauthenticated users are redirected to /{locale}/login
 * instead of just /login (without locale).
 *
 * F-16: Login redirect includes locale
 *
 * Acceptance Criteria:
 * 1. Unauthenticated access to protected pages redirects to /{locale}/login
 * 2. Redirect preserves the user's locale
 * 3. Redirect works for all supported locales (it, en, fr, de, es)
 *
 * Run: npx playwright test e2e/login-redirect.spec.ts
 */

import { test, expect } from "./fixtures/base-fixtures";

test.describe("Login Redirect with Locale (F-16)", () => {
  test("unauthenticated access to /it/parent-dashboard redirects to /it/login", async ({
    page,
  }) => {
    // Clear any authentication cookies
    await page.context().clearCookies();

    // Try to access parent dashboard without authentication
    await page.goto("/it/parent-dashboard", {
      waitUntil: "domcontentloaded",
    });

    // Should redirect to login page with Italian locale
    await page.waitForURL(/\/it\/login/, { timeout: 5000 });

    const currentUrl = page.url();
    expect(currentUrl).toContain("/it/login");
    expect(currentUrl).not.toContain("/login"); // Should not be bare /login
  });

  test("unauthenticated access to /en/parent-dashboard redirects to /en/login", async ({
    page,
  }) => {
    await page.context().clearCookies();

    await page.goto("/en/parent-dashboard", {
      waitUntil: "domcontentloaded",
    });

    // Should redirect to login page with English locale
    await page.waitForURL(/\/en\/login/, { timeout: 5000 });

    const currentUrl = page.url();
    expect(currentUrl).toContain("/en/login");
  });

  test("unauthenticated access to /fr/parent-dashboard redirects to /fr/login", async ({
    page,
  }) => {
    await page.context().clearCookies();

    await page.goto("/fr/parent-dashboard", {
      waitUntil: "domcontentloaded",
    });

    // Should redirect to login page with French locale
    await page.waitForURL(/\/fr\/login/, { timeout: 5000 });

    const currentUrl = page.url();
    expect(currentUrl).toContain("/fr/login");
  });

  test("unauthenticated access to /de/parent-dashboard redirects to /de/login", async ({
    page,
  }) => {
    await page.context().clearCookies();

    await page.goto("/de/parent-dashboard", {
      waitUntil: "domcontentloaded",
    });

    // Should redirect to login page with German locale
    await page.waitForURL(/\/de\/login/, { timeout: 5000 });

    const currentUrl = page.url();
    expect(currentUrl).toContain("/de/login");
  });

  test("unauthenticated access to /es/parent-dashboard redirects to /es/login", async ({
    page,
  }) => {
    await page.context().clearCookies();

    await page.goto("/es/parent-dashboard", {
      waitUntil: "domcontentloaded",
    });

    // Should redirect to login page with Spanish locale
    await page.waitForURL(/\/es\/login/, { timeout: 5000 });

    const currentUrl = page.url();
    expect(currentUrl).toContain("/es/login");
  });

  test("login page exists at /{locale}/login for all locales", async ({
    page,
  }) => {
    const locales = ["it", "en", "fr", "de", "es"];

    for (const locale of locales) {
      await page.goto(`/${locale}/login`, {
        waitUntil: "domcontentloaded",
      });

      // Should not show 404 error
      const pageContent = await page.textContent("body");
      expect(pageContent).not.toContain("404");
      expect(pageContent).not.toContain("Not Found");

      // Page should be visible
      const bodyVisible = await page.locator("body").isVisible();
      expect(bodyVisible).toBe(true);
    }
  });

  test("redirect preserves locale when accessing protected route without auth", async ({
    page,
  }) => {
    await page.context().clearCookies();

    // Access Italian version
    await page.goto("/it/parent-dashboard");
    await page.waitForURL(/\/login/, { timeout: 5000 });

    const urlAfterRedirect = page.url();

    // Should preserve Italian locale in redirect
    expect(urlAfterRedirect).toContain("/it/");
    expect(urlAfterRedirect).toContain("/login");
  });
});

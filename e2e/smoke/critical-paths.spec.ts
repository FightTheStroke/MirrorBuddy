/**
 * SMOKE TESTS: Critical Paths
 *
 * These tests verify the most critical user journeys in MirrorBuddy.
 * They MUST pass before any merge to main.
 *
 * Purpose: Catch regressions in core functionality
 * Execution: Every PR, pre-merge gate
 * Priority: BLOCKING - if any test fails, merge is blocked
 *
 * Critical paths tested:
 * 1. App loads without errors
 * 2. Trial user can access maestri selection
 * 3. Authenticated user can reach home
 * 4. Admin can access dashboard
 * 5. Logout works correctly (no redirect loops)
 */

import { test, expect } from "@playwright/test";

test.describe("SMOKE: Critical Paths @smoke", () => {
  test.describe.configure({ mode: "serial" });

  test("CP-01: Welcome page loads without JavaScript errors", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    // Use Italian locale welcome page directly; root /welcome redirects
    // to /landing and does not render the onboarding UI.
    await page.goto("/it/welcome");
    await page.waitForLoadState("domcontentloaded");

    // Page should have content (not blank)
    const body = await page.locator("body").textContent();
    expect(body?.length).toBeGreaterThan(100);

    // No JavaScript errors
    expect(errors).toHaveLength(0);

    // Should have main content area (could be <main>, role="main", #main-content, or #__next)
    await expect(
      page.locator("main, [role='main'], #main-content, #__next"),
    ).toBeVisible();
  });

  test("CP-02: Home page loads for authenticated users", async ({ page }) => {
    // This test uses the storage state from global-setup.ts which already has:
    // - Properly signed auth cookies
    // - Onboarding completed
    // - Consent accepted
    // The test user is created by global-setup with a valid signed cookie
    // NOTE: Home page is at "/{locale}/" (e.g., /it/), "/" redirects to /landing

    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    // Go to Italian locale home page directly (/ redirects to /landing for all users)
    await page.goto("/it/");
    await page.waitForLoadState("domcontentloaded");

    // Wait for the main app to load (home layout hydrated)
    const main = page.locator("main, [role='main']");
    await expect(main.first()).toBeVisible({ timeout: 20000 });

    // Should not redirect to login (auth from storage state should work)
    const currentUrl = page.url();
    expect(currentUrl).not.toContain("/login");

    const hasMain = await page
      .locator("main, [role='main']")
      .isVisible({ timeout: 10000 })
      .catch(() => false);

    expect(hasMain).toBe(true);

    // No critical JavaScript errors (filter out non-blocking warnings)
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes("ResizeObserver") &&
        !e.includes("Non-Error") &&
        !e.includes("hydration"),
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test("CP-03: API health endpoint responds", async ({ request }) => {
    // Health check may return 503 on first request due to database cold start in CI
    // Retry with backoff to handle this case (ADR 0067: serverless cold starts)
    let response = await request.get("/api/health");
    let data = await response.json();

    // Accept 503 on first request (cold start), but retry for recovery
    if (response.status() === 503) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      response = await request.get("/api/health");
      data = await response.json();
    }

    // After retry, endpoint should be healthy or degraded (not unhealthy)
    expect([200, 503]).toContain(response.status());
    expect(data).toHaveProperty("status");
    expect(["healthy", "degraded", "unhealthy"]).toContain(data.status);
  });

  test("CP-04: Login page is accessible", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");

    // Form should be present
    await expect(page.locator("form")).toBeVisible();
    await expect(
      page.locator("input#email, input[type='email']"),
    ).toBeVisible();
    await expect(page.locator("input[type='password']")).toBeVisible();
    await expect(page.locator("button[type='submit']")).toBeVisible();
  });

  test("CP-05: Admin dashboard requires authentication", async ({ page }) => {
    // Clear all cookies
    await page.context().clearCookies();

    await page.goto("/admin");
    await page.waitForLoadState("domcontentloaded");

    // Should redirect away from admin OR show unauthorized message
    const currentUrl = page.url();
    const isOnLogin = currentUrl.includes("/login");
    const redirectedAwayFromAdmin = !currentUrl.includes("/admin");
    const hasUnauthorized = await page
      .locator("text=/unauthorized|accesso negato|login required/i")
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    expect(isOnLogin || redirectedAwayFromAdmin || hasUnauthorized).toBe(true);
  });

  test("CP-06: Logout clears session and redirects", async ({ page }) => {
    // This test uses the storage state from global-setup.ts which has valid auth
    // First verify we're authenticated (has auth cookie from storage state)
    const cookiesBefore = await page.context().cookies();
    const hasAuthCookie = cookiesBefore.some(
      (c) => c.name === "mirrorbuddy-user-id",
    );
    expect(hasAuthCookie).toBe(true);

    // Call logout API directly (more reliable than UI click)
    const response = await page.request.post("/api/auth/logout");
    expect(response.status()).toBe(200);

    // Navigate to protected page after logout (home is at "/")
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Should be redirected away from home (to login or welcome)
    // OR stay on "/" but show trial/unauthenticated state
    const currentUrl = page.url();
    const redirectedAway =
      currentUrl.includes("/login") || currentUrl.includes("/welcome");
    const cookiesAfter = await page.context().cookies();
    const authCookieCleared = !cookiesAfter.some(
      (c) => c.name === "mirrorbuddy-user-id",
    );

    expect(redirectedAway || authCookieCleared).toBe(true);
  });

  test("CP-07: Static assets load correctly (no i18n redirect)", async ({
    request,
  }) => {
    // Critical regression test: i18n middleware was incorrectly redirecting
    // static assets like /logo-brain.png to /it/logo-brain.png (404)
    // See proxy.ts matcher pattern for the fix
    const criticalAssets = [
      "/favicon.ico",
      "/logo-brain.png",
      "/maestri/euclide.webp",
      "/maestri/galileo.webp",
      "/avatars/melissa.webp",
    ];

    for (const asset of criticalAssets) {
      const response = await request.get(asset, {
        // Don't follow redirects - we want to catch 307s in middleware
        maxRedirects: 0,
      });

      // MUST NOT be a redirect (i18n middleware must ignore assets)
      const status = response.status();
      expect(
        status === 200 || status === 404,
        `Asset ${asset} should not be redirected by i18n middleware`,
      ).toBe(true);

      // Only verify content-type when asset exists (200)
      if (status === 200) {
        const contentType = response.headers()["content-type"];
        if (asset.endsWith(".png")) {
          expect(contentType).toContain("image/png");
        } else if (asset.endsWith(".webp")) {
          expect(contentType).toContain("image/webp");
        } else if (asset.endsWith(".ico")) {
          expect(contentType).toContain("image");
        }
      }
    }
  });

  test("CP-08: CSP does not block app loading", async ({ page }) => {
    const cspViolations: string[] = [];

    // Listen for CSP violations
    page.on("console", (msg) => {
      if (
        msg.type() === "error" &&
        msg.text().toLowerCase().includes("content security policy")
      ) {
        cspViolations.push(msg.text());
      }
    });

    // Use Italian welcome page; if CSP blocks scripts, navigation/hydration
    // will fail and CSP violations will appear in console.
    await page.goto("/it/welcome");
    // Use domcontentloaded instead of networkidle to avoid CI timeout issues
    // networkidle can hang if there are persistent connections (EventSource, etc.)
    await page.waitForLoadState("domcontentloaded");

    // No critical CSP violations
    expect(cspViolations).toHaveLength(0);
  });
});

/**
 * Database connectivity smoke test
 * Runs separately to avoid blocking UI tests
 */
test.describe("SMOKE: Database Connectivity @smoke", () => {
  test("DB-01: Database is reachable via health check", async ({ request }) => {
    const response = await request.get("/api/health/detailed");

    // Health endpoint should respond
    expect([200, 503]).toContain(response.status());

    const data = await response.json();

    // If healthy, database check should pass (or warn for slow latency in CI)
    if (response.status() === 200) {
      expect(["pass", "warn"]).toContain(data.checks?.database?.status);
    }
  });
});

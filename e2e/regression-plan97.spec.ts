/**
 * E2E Regression Tests - Plan 97 (FixE2E-Vercel-Admin-Sentry)
 *
 * Verifies root causes fixed in Plan 97 do not regress:
 * 1. TosGateProvider blocking E2E tests (required /api/tos mock)
 * 2. Missing i18n compliance keys (section4, section6, section16)
 * 3. Welcome page fixture API usage (localePage pattern)
 * 4. Protected routes in tests
 * 5. Mobile timeout issues
 *
 * Run: npx playwright test e2e/regression-plan97.spec.ts
 */

import { test, expect, testAllLocales } from "./fixtures";
import type { Page } from "@playwright/test";

// IMPORTANT: These tests check unauthenticated pages (welcome, legal, compliance)
// Override global storageState to start without authentication
test.use({ storageState: undefined });

async function mockTosAccepted(page: Page): Promise<void> {
  await page.route("/api/tos", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ accepted: true, version: "1.0" }),
    });
  });
}

test.describe("Regression: TosGateProvider Blocking (Plan 97)", () => {
  test.beforeEach(async ({ page }) => {
    await mockTosAccepted(page);
  });

  test("should allow page interaction when /api/tos is mocked", async ({
    page,
  }) => {
    await page.goto("/it/welcome");
    await page.waitForLoadState("domcontentloaded");

    const mainContent = page.locator("main, [role='main']").first();
    await expect(mainContent).toBeVisible({ timeout: 10000 });

    expect(await page.locator("button:visible").count()).toBeGreaterThan(0);
    expect(await page.locator('[role="dialog"]:visible').count()).toBe(0);
  });
});

test.describe("Regression: Missing i18n Compliance Keys (Plan 97)", () => {
  test("should not have missing translation errors in compliance pages", async ({
    page,
  }) => {
    const testPages = [
      "/it/privacy",
      "/it/cookies",
      "/it/accessibility",
      "/it/ai-transparency",
    ];

    for (const path of testPages) {
      const errors: string[] = [];
      page.on("console", (msg) => {
        if (
          msg.type() === "error" &&
          (msg.text().includes("Missing translation") ||
            msg.text().includes("section4") ||
            msg.text().includes("section6") ||
            msg.text().includes("section16"))
        ) {
          errors.push(msg.text());
        }
      });

      await page.goto(path);
      await page.waitForLoadState("domcontentloaded");

      expect(errors, `${path} has translation errors`).toHaveLength(0);
      await expect(page.locator("main, [role='main']").first()).toBeVisible({
        timeout: 10000,
      });
    }
  });

  testAllLocales(
    "should have all compliance sections translated",
    async ({ localePage }) => {
      await localePage.goto("/accessibility");
      await localePage.page.waitForLoadState("domcontentloaded");

      const mainContent = localePage.page
        .locator("main, [role='main']")
        .first();
      await expect(mainContent).toBeVisible({ timeout: 10000 });

      const textContent = await mainContent.textContent();
      expect(textContent).toBeTruthy();
      expect(textContent?.length).toBeGreaterThan(100);
    },
  );
});

test.describe("Regression: Welcome Page LocalePage Pattern (Plan 97)", () => {
  testAllLocales(
    "should use localePage.goto() pattern correctly",
    async ({ localePage }) => {
      await localePage.goto("/welcome");

      expect(localePage.page.url()).toContain(`/${localePage.locale}/welcome`);
      expect(await localePage.page.locator("html").getAttribute("lang")).toBe(
        localePage.locale,
      );

      await expect(
        localePage.page.locator("main, [role='main']").first(),
      ).toBeVisible({ timeout: 10000 });
    },
  );

  test("should load welcome page with direct locale path", async ({ page }) => {
    await page.goto("/it/welcome");
    await page.waitForLoadState("domcontentloaded");

    expect(await page.locator("html").getAttribute("lang")).toBe("it");
    await expect(page.locator("main, [role='main']").first()).toBeVisible({
      timeout: 10000,
    });
  });
});

test.describe("Regression: Protected Routes in Tests (Plan 97)", () => {
  test("should avoid testing protected routes without auth", async ({
    browser,
  }) => {
    // Use a completely fresh context: no cookies, no storageState, no fixtures
    // This ensures no trial session (visitor cookie) that would bypass auth
    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();

    const protectedRoutes = ["/it/settings", "/it/profile"];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await page.waitForLoadState("domcontentloaded");

      const currentUrl = page.url();
      const hasRedirected =
        currentUrl.includes("/login") || currentUrl.includes("/welcome");

      const hasAuthUI =
        (await page.locator('input[type="email"]').count()) > 0 ||
        (await page.locator('input[type="password"]').count()) > 0 ||
        currentUrl.includes("/welcome");

      // A 404 page means the route doesn't exist for unauthenticated users
      const has404 =
        (await page
          .locator('text="404"')
          .isVisible()
          .catch(() => false)) ||
        (await page
          .locator('text="Pagina non trovata"')
          .isVisible()
          .catch(() => false)) ||
        (await page
          .locator('text="Page not found"')
          .isVisible()
          .catch(() => false));

      expect(
        hasRedirected || hasAuthUI || has404,
        `Route ${route} should be protected (URL: ${currentUrl})`,
      ).toBeTruthy();
    }

    await context.close();
  });

  test("public routes should load without auth", async ({ page }) => {
    const publicRoutes = ["/it/welcome", "/it/privacy", "/it/ai-transparency"];

    for (const route of publicRoutes) {
      await page.goto(route);
      await page.waitForLoadState("domcontentloaded");

      const mainContent = page.locator("main, [role='main']").first();
      await expect(mainContent).toBeVisible({ timeout: 10000 });
    }
  });
});

test.describe("Regression: Mobile Timeout Issues (Plan 97)", () => {
  test("should load pages on mobile within timeout", async ({ page }) => {
    test.setTimeout(60000); // Mobile rendering + multiple pages
    await page.setViewportSize({ width: 375, height: 667 });
    const testPages = ["/it/", "/it/welcome", "/it/privacy"];

    for (const path of testPages) {
      await page.goto(path, { timeout: 10000 });
      await page.waitForLoadState("domcontentloaded", { timeout: 8000 });

      const mainContent = page.locator("main, [role='main']").first();
      await expect(mainContent).toBeVisible({ timeout: 8000 });
      expect(await mainContent.textContent()).toBeTruthy();
    }
  });
});

test.describe("Regression: Overall E2E Stability (Plan 97)", () => {
  test.beforeEach(async ({ page }) => {
    await mockTosAccepted(page);
  });

  test("should load and interact with welcome page without blocking", async ({
    page,
  }) => {
    await page.goto("/it/welcome");
    await page.waitForLoadState("domcontentloaded");

    const mainContent = page.locator("main, [role='main']").first();
    await expect(mainContent).toBeVisible({ timeout: 10000 });

    const firstButton = page.locator("button:visible").first();
    await expect(firstButton).toBeEnabled({ timeout: 3000 });

    await firstButton.focus();
    const focused = await page.evaluate(
      () => document.activeElement?.tagName === "BUTTON",
    );
    expect(focused).toBeTruthy();
  });

  test("should load compliance pages across locales without errors", async ({
    page,
  }) => {
    const testCases = [
      { locale: "it", path: "/privacy" },
      { locale: "en", path: "/privacy" },
      { locale: "fr", path: "/accessibility" },
      { locale: "de", path: "/cookies" },
      { locale: "es", path: "/ai-transparency" },
    ];

    for (const { locale, path } of testCases) {
      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });

      await page.goto(`/${locale}${path}`);
      await page.waitForLoadState("domcontentloaded");

      await expect(page.locator("main, [role='main']").first()).toBeVisible({
        timeout: 10000,
      });

      const hasCriticalErrors = consoleErrors.some(
        (err) =>
          err.includes("Missing translation") ||
          err.includes("section4") ||
          err.includes("section6"),
      );
      expect(hasCriticalErrors).toBeFalsy();
    }
  });
});

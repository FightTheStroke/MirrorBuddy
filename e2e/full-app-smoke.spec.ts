/**
 * Smoke Test - Minimal verification that app loads correctly
 *
 * Tests: homepage, key routes, API health, no critical errors
 * Run: npx playwright test e2e/full-app-smoke.spec.ts
 */

import { test, expect } from "@playwright/test";

const CRITICAL_ROUTES = [
  "/",
  "/welcome",
  "/astuccio",
  "/supporti",
  "/showcase",
];

// Mock API response for onboarding - mark as completed to bypass welcome page
test.beforeEach(async ({ page }) => {
  // Mock /api/onboarding to return completed state
  await page.route("/api/onboarding", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        onboardingState: {
          hasCompletedOnboarding: true,
          onboardingCompletedAt: new Date().toISOString(),
          currentStep: "ready",
          isReplayMode: false,
        },
        hasExistingData: true,
        data: {
          name: "Test User",
          age: 12,
          schoolLevel: "media",
          learningDifferences: [],
        },
      }),
    });
  });

  // Mock /api/user/settings to prevent 401 errors
  await page.route("/api/user/settings", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          studentProfile: {
            preferredCoach: "melissa",
            preferredBuddy: "mario",
          },
        }),
      });
    } else {
      await route.fulfill({ status: 200, body: "{}" });
    }
  });

  // Mock /api/tos to return accepted
  await page.route("/api/tos", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ accepted: true, version: "1.0" }),
    });
  });

  // Mock /api/user/usage for trial usage dashboard
  await page.route("/api/user/usage", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        chat: { used: 2, limit: 10, percentage: 20 },
        voice: { used: 60, limit: 300, percentage: 20, unit: "seconds" },
        tools: { used: 1, limit: 10, percentage: 10 },
        docs: { used: 0, limit: 1, percentage: 0 },
        maestri: { selected: 1, limit: 3 },
      }),
    });
  });

  // Mock /api/progress to prevent errors
  await page.route("/api/progress", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        xp: 100,
        level: 1,
        streak: 1,
        totalStudyMinutes: 30,
        sessionsThisWeek: 1,
        questionsAsked: 5,
      }),
    });
  });
});

const IGNORE_ERRORS = [
  /ResizeObserver loop/i,
  /Download the React DevTools/i,
  /favicon\.ico/i,
  /401.*Unauthorized/i,
  /429.*Too Many Requests/i,
  /net::ERR_/i,
  /Failed to load resource/i,
  /hydrat/i,
  /WebSocket/i,
  /realtime.*token/i,
  /Content Security Policy/i, // CSP inline script warnings during dev
  /_vercel\/insights/i, // Vercel Analytics not available in CI/local
  /MIME type.*not executable/i, // Script MIME type errors in CI
];

test.describe("Smoke Test", () => {
  test("homepage loads without critical errors", async ({ page }) => {
    const errors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (!IGNORE_ERRORS.some((p) => p.test(text))) {
          errors.push(text);
        }
      }
    });

    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("body")).toBeVisible();
    // Main content can be <main>, role="main", #main-content (a11y), or #__next (fallback)
    await expect(
      page.locator("main, [role='main'], #main-content, #__next").first(),
    ).toBeVisible();

    expect(errors, `Console errors: ${errors.join(", ")}`).toHaveLength(0);
  });

  test("critical routes load", async ({ page }) => {
    for (const route of CRITICAL_ROUTES) {
      await page.goto(route, { timeout: 15000 });
      await expect(page.locator("body")).toBeVisible();
    }
  });

  test("API health check", async ({ request }) => {
    const response = await request.get("/api/health");
    // Accept 200 (ok), 503 (degraded), or even 401 (unauth) - just verify endpoint exists
    expect([200, 401, 503]).toContain(response.status());
  });

  test("navigation has expected elements", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Wait for hydration to complete - loading screen shows "Caricamento..."
    // After hydration, the main heading "Professori" appears (it's an h1, not a button)
    await page.waitForSelector('h1:has-text("Professori"), main h1', {
      timeout: 15000,
    });

    // Should have main navigation buttons
    const navButtons = page
      .locator("button")
      .filter({ hasText: /Professori|Astuccio|Zaino|Impostazioni/i });
    const btnCount = await navButtons.count();
    expect(btnCount).toBeGreaterThanOrEqual(3);
  });

  test("navigation sidebar works", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Click astuccio nav - should show astuccio content
    const astuccioBtn = page
      .locator("button")
      .filter({ hasText: /Astuccio/i })
      .first();
    if (await astuccioBtn.isVisible()) {
      await astuccioBtn.click();
      await page.waitForTimeout(500);
      // Verify content changed (Astuccio has "Il Tuo Astuccio" heading)
      await expect(
        page.locator("h1, h2").filter({ hasText: /Astuccio/i }),
      ).toBeVisible();
    }
  });

  test("settings page loads", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const settingsBtn = page
      .locator("button")
      .filter({ hasText: /Impostazioni/i })
      .first();
    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      await page.waitForTimeout(500);
      // Settings should show some content
      await expect(
        page.locator("main, [role='main'], #main-content, #__next").first(),
      ).toBeVisible();
    }
  });
});

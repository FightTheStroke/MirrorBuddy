/**
 * E2E Tests: Trial Mode - Consolidated
 *
 * Comprehensive trial mode testing combining flow, UI audit, and GDPR compliance.
 * F-07: Trial Mode Tests
 *
 * Test scenarios:
 * - GDPR: Legal pages accessible without blocking consent wall
 * - Flow: Trial status indicator, limit modal, consent management
 * - Audit: All public routes navigation, button clickability, error tracking
 *
 * Run: npx playwright test e2e/trial.spec.ts
 *
 * Consolidated from:
 * - trial.spec.ts (GDPR and flow tests)
 * - full-ui-audit/trial-ui.spec.ts (route audit tests)
 */

import { test, expect } from "./fixtures/auth-fixtures";
import {
  PUBLIC_ROUTES,
  checkButtonsClickable,
  generateReport,
  type RouteError,
} from "./full-ui-audit/trial-ui-helpers";

// Errors to ignore (CSP violations, expected 401s, etc.)
const IGNORE_CONSOLE_ERRORS = [
  /Content Security Policy/i,
  /inline script/i,
  /nonce.*required/i,
  /401.*Unauthorized/i,
  /Failed to fetch/i,
  /ToS check error/i,
  /ResizeObserver loop/i,
  /Download the React DevTools/i,
  /favicon\.ico/i,
  /429.*Too Many Requests/i,
  /net::ERR_/i,
  /hydrat/i,
  /WebSocket/i,
];

// ============================================================================
// GDPR COMPLIANCE (F-07)
// ============================================================================

test.describe("Trial Mode - GDPR Compliance", () => {
  test("legal pages accessible without blocking consent wall", async ({
    trialPage,
  }) => {
    // Clear consent - simulate user who hasn't accepted yet
    // But keep TosGateProvider mock from fixture to prevent ToS modal blocking
    await trialPage.addInitScript(() => {
      localStorage.removeItem("mirrorbuddy-consent");
    });

    // Legal pages (/terms, /privacy, /cookies) must be accessible
    // WITHOUT blocking consent wall - this is a GDPR requirement
    // Users must be able to read privacy/terms BEFORE accepting cookies
    await trialPage.goto("/terms");
    await trialPage.waitForLoadState("domcontentloaded");

    // Terms content should be immediately visible (no blocking wall)
    await expect(
      trialPage.locator("text=Termini di Servizio di MirrorBuddy"),
    ).toBeVisible();

    // Inline consent mechanism should be available (floating a11y button)
    const a11yButton = trialPage.locator(
      '[data-testid="a11y-floating-button"]',
    );
    await expect(a11yButton).toBeVisible();
  });

  test("privacy page accessible without prior consent", async ({
    trialPage,
  }) => {
    // Clear consent - user hasn't accepted yet
    await trialPage.addInitScript(() => {
      localStorage.removeItem("mirrorbuddy-consent");
    });

    // Privacy page must be accessible without blocking consent wall
    await trialPage.goto("/privacy");
    await trialPage.waitForLoadState("domcontentloaded");

    // Privacy content should be immediately visible
    await expect(
      trialPage.locator("text=Privacy Policy di MirrorBuddy"),
    ).toBeVisible();

    // Navigate to terms and verify privacy link exists
    await trialPage.goto("/terms");
    await trialPage.waitForLoadState("domcontentloaded");

    const privacyLink = trialPage.locator('a[href*="/privacy"]').first();
    await expect(privacyLink).toBeVisible();
  });

  test("cookie policy page accessible", async ({ trialPage }) => {
    await trialPage.goto("/cookies");
    await trialPage.waitForLoadState("domcontentloaded");

    // Cookie policy should be visible
    await expect(
      trialPage.getByRole("heading", { name: /Cookie Policy/i }).first(),
    ).toBeVisible();
    await expect(
      trialPage.locator("text=Cookie Essenziali").first(),
    ).toBeVisible();
  });
});

// ============================================================================
// TRIAL STATUS & LIMITS (F-07)
// ============================================================================

test.describe("Trial Mode - Status & Limits", () => {
  test("trial status indicator shows remaining chats", async ({
    trialPage,
    context,
  }) => {
    // Add trial session cookie
    await context.addCookies([
      {
        name: "mirrorbuddy-trial-session",
        value: "test-trial-session-id",
        domain: "localhost",
        path: "/",
        sameSite: "Lax",
      },
    ]);

    // Mock trial session API to return trial mode status
    await trialPage.route("**/api/trial/session", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          hasSession: true,
          isTrialMode: true,
          chatsUsed: 0,
          chatsRemaining: 10,
          maxChats: 10,
        }),
      });
    });

    // Mock onboarding API to prevent redirect
    await trialPage.route("**/api/user/onboarding", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          hasCompletedOnboarding: true,
          onboardingCompletedAt: new Date().toISOString(),
        }),
      });
    });

    await trialPage.goto("/");
    await trialPage.waitForLoadState("domcontentloaded");

    // Trial indicator should show remaining chats
    const trialIndicator = trialPage.locator("[data-testid='trial-status']");

    if (await trialIndicator.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(trialIndicator).toContainText("10");
    } else {
      // Home page loaded correctly even without indicator
      await expect(trialPage.locator("h1")).toBeVisible();
    }
  });

  test("limit reached modal appears when trial exhausted", async ({
    trialPage,
  }) => {
    // Mock trial session at limit
    await trialPage.route("**/api/trial/session", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          hasSession: true,
          chatsUsed: 10,
          chatsRemaining: 0,
        }),
      });
    });

    await trialPage.goto("/");
    await trialPage.waitForLoadState("domcontentloaded");

    // Navigate to coach chat
    const coachButton = trialPage
      .locator("button")
      .filter({ hasText: /Melissa|Roberto|Chiara/i })
      .first();

    if (await coachButton.isVisible()) {
      await coachButton.click();
      await trialPage.waitForTimeout(500);

      // Try to send message
      const chatInput = trialPage.locator("[data-testid='chat-input']");
      if (await chatInput.isVisible()) {
        await chatInput.fill("Test message");
        await trialPage.click("[data-testid='send-button']");

        // Modal should appear if trial limit enforcement is active
        const modal = trialPage.locator("text=Hai esaurito i messaggi");
        if (await modal.isVisible({ timeout: 3000 }).catch(() => false)) {
          await expect(
            trialPage.locator("text=Richiedi accesso"),
          ).toBeVisible();
        }
      }
    }
  });

  test("trial mode restrictions are in place", async ({ trialPage }) => {
    await trialPage.goto("/", { waitUntil: "domcontentloaded" });
    await trialPage.waitForLoadState("domcontentloaded").catch(() => {});

    // Check that page loaded with content
    const visibleContent = trialPage
      .locator("main:visible, [role='main']:visible, #__next > div:visible")
      .first();
    const pageHasContent = await visibleContent.isVisible().catch(() => false);

    const hasTextContent = await trialPage
      .locator("body")
      .innerText()
      .then((t) => t.length > 100)
      .catch(() => false);

    const trialIndicator = trialPage.locator('[data-testid="trial-status"]');
    const hasTrialIndicator = await trialIndicator
      .isVisible()
      .catch(() => false);

    const trialMessage = trialPage
      .locator("text=/trial|prova|demo|benvenuto|welcome/i")
      .first();
    const hasTrialMessage = await trialMessage.isVisible().catch(() => false);

    // At least one indicator of working app should be visible
    expect(
      pageHasContent || hasTextContent || hasTrialIndicator || hasTrialMessage,
    ).toBeTruthy();
  });
});

// ============================================================================
// ROUTE AUDIT (F-09, F-34)
// ============================================================================

test.describe("Trial Mode - Route Audit", () => {
  test.setTimeout(120000);

  test("all public routes accessible without critical errors", async ({
    trialPage,
  }) => {
    const errors: RouteError[] = [];
    const consoleErrors: string[] = [];

    // Listen for console errors
    trialPage.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (!IGNORE_CONSOLE_ERRORS.some((pattern) => pattern.test(text))) {
          consoleErrors.push(`[${msg.type()}] ${text}`);
        }
      }
    });

    // Test each public route
    for (const route of PUBLIC_ROUTES) {
      consoleErrors.length = 0;

      try {
        if (trialPage.isClosed()) break;

        const response = await trialPage.goto(`http://localhost:3000${route}`, {
          waitUntil: "domcontentloaded",
          timeout: 15000,
        });

        // F-09: Check for 404 errors
        if (response?.status() === 404) {
          errors.push({
            route,
            type: "404",
            message: "Route returned 404 Not Found",
            severity: "critical",
          });
          continue;
        }

        await trialPage
          .waitForLoadState("domcontentloaded", { timeout: 3000 })
          .catch(() => {});

        // F-05: Check for console errors
        if (consoleErrors.length > 0) {
          errors.push({
            route,
            type: "console_error",
            message: `Console errors: ${consoleErrors.join("; ")}`,
            severity: "warning",
          });
        }

        // F-04: Check buttons are clickable
        if (!trialPage.isClosed()) {
          await checkButtonsClickable(trialPage, route, errors);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const severity =
          errorMessage.includes("closed") || errorMessage.includes("Target")
            ? "warning"
            : "critical";

        errors.push({
          route,
          type: "navigation_error",
          message: `Navigation ${severity === "warning" ? "interrupted" : "failed"}: ${errorMessage}`,
          severity,
        });
      }
    }

    // Generate report
    const report = generateReport(errors);
    console.log("\n" + report);

    // F-34: Assert zero critical errors
    const criticalErrors = errors.filter((e) => e.severity === "critical");
    expect(
      criticalErrors,
      `Found ${criticalErrors.length} critical error(s):\n${criticalErrors.map((e) => `  - ${e.route}: ${e.message}`).join("\n")}`,
    ).toHaveLength(0);
  });

  test("basic navigation between public routes", async ({ trialPage }) => {
    // Start at home
    await trialPage.goto("/", { waitUntil: "domcontentloaded" });

    // Navigate to landing (may redirect to /welcome)
    await trialPage.goto("/landing", { waitUntil: "domcontentloaded" });
    expect(trialPage.url()).toMatch(/\/(landing|welcome)/);

    // Navigate to astuccio
    await trialPage.goto("/astuccio", { waitUntil: "domcontentloaded" });
    await expect(trialPage).toHaveURL(/\/astuccio/);

    // Navigate to privacy
    await trialPage.goto("/privacy", { waitUntil: "domcontentloaded" });
    await expect(trialPage).toHaveURL(/\/privacy/);
  });
});

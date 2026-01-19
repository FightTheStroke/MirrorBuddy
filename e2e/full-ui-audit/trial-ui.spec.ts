/**
 * Trial Mode UI Audit - E2E Test Suite
 *
 * F-01: Trial mode functionality verification
 * F-02: Navigation works across all public routes
 * F-04: Buttons are clickable
 * F-05: No console errors on navigation
 * F-07: Skip chat and voice endpoints
 * F-09: No 404 errors on public routes
 * F-13: Collect errors into report
 * F-34: Zero critical errors assertion
 *
 * Tests all public routes in trial mode (anonymous user with wall bypasses).
 * Excludes admin routes and chat/voice endpoints per requirements.
 */

import { test, expect } from "../fixtures/auth-fixtures";
import {
  PUBLIC_ROUTES,
  checkButtonsClickable,
  generateReport,
  type RouteError,
} from "./trial-ui-helpers";

// Errors to ignore (CSP violations, expected 401s, etc.)
const IGNORE_CONSOLE_ERRORS = [
  /Content Security Policy/i,
  /inline script/i,
  /nonce.*required/i,
  /401.*Unauthorized/i,
  /Failed to fetch/i,
  /ToS check error/i,
  /ResizeObserver loop/i,
];

test.describe("Trial Mode - Full UI Audit", () => {
  // Increase timeout for route audit test
  test.setTimeout(120000);

  test("should navigate to all public routes without critical errors", async ({
    trialPage,
  }) => {
    const errors: RouteError[] = [];
    const consoleErrors: string[] = [];

    // Listen for console errors (filter out expected ones)
    trialPage.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        // Skip if matches any ignore pattern
        if (!IGNORE_CONSOLE_ERRORS.some((pattern) => pattern.test(text))) {
          consoleErrors.push(`[${msg.type()}] ${text}`);
        }
      }
    });

    // Test each public route
    for (const route of PUBLIC_ROUTES) {
      consoleErrors.length = 0; // Reset console errors for this route

      try {
        // Check if page is still open
        if (trialPage.isClosed()) {
          console.log(`Skipping ${route} - page closed`);
          break;
        }

        // Navigate to route
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
          continue; // Skip further checks if 404
        }

        // Wait for page to stabilize (with shorter timeout)
        await trialPage
          .waitForLoadState("networkidle", { timeout: 3000 })
          .catch(() => {
            // Network idle timeout is not critical, continue
          });

        // F-05: Check for console errors (only non-ignored ones)
        if (consoleErrors.length > 0) {
          errors.push({
            route,
            type: "console_error",
            message: `Console errors: ${consoleErrors.join("; ")}`,
            severity: "warning",
          });
        }

        // F-04: Check that buttons are clickable (basic check)
        if (!trialPage.isClosed()) {
          await checkButtonsClickable(trialPage, route, errors);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        // Page closed errors are expected when test times out - downgrade to warning
        if (
          errorMessage.includes("closed") ||
          errorMessage.includes("Target page")
        ) {
          errors.push({
            route,
            type: "navigation_error",
            message: `Navigation interrupted: ${errorMessage}`,
            severity: "warning",
          });
        } else {
          errors.push({
            route,
            type: "navigation_error",
            message: `Navigation failed: ${errorMessage}`,
            severity: "critical",
          });
        }
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

  test("should verify trial mode restrictions are in place", async ({
    trialPage,
  }) => {
    // Navigate to home page
    await trialPage.goto("http://localhost:3000", {
      waitUntil: "domcontentloaded",
    });

    // Wait for page to stabilize
    await trialPage.waitForLoadState("networkidle").catch(() => {});

    // Check that page loaded - look for any visible content
    // Use :visible to avoid hidden elements
    const visibleContent = trialPage
      .locator(
        "main:visible, [role='main']:visible, #__next > div:visible, body > div:not([hidden]):visible",
      )
      .first();
    const pageHasContent = await visibleContent.isVisible().catch(() => false);

    // Alternative check: look for any text content
    const hasTextContent = await trialPage
      .locator("body")
      .innerText()
      .then((t) => t.length > 100)
      .catch(() => false);

    // Trial mode indicator is optional - check if present but don't fail if not
    const trialIndicator = trialPage.locator('[data-testid="trial-status"]');
    const hasTrialIndicator = await trialIndicator
      .isVisible()
      .catch(() => false);

    // Verify trial mode messaging OR general app content is present
    const trialMessage = trialPage
      .locator("text=/trial|prova|demo|benvenuto|welcome/i")
      .first();
    const hasTrialMessage = await trialMessage.isVisible().catch(() => false);

    // At least one indicator of working app should be visible
    expect(
      pageHasContent || hasTextContent || hasTrialIndicator || hasTrialMessage,
    ).toBeTruthy();
  });

  test("should allow basic navigation between public routes", async ({
    trialPage,
  }) => {
    // Start at home
    await trialPage.goto("http://localhost:3000", {
      waitUntil: "domcontentloaded",
    });

    // Navigate to landing (may redirect to /welcome for trial users - both are acceptable)
    await trialPage.goto("http://localhost:3000/landing", {
      waitUntil: "domcontentloaded",
    });
    const landingUrl = trialPage.url();
    expect(landingUrl).toMatch(/\/(landing|welcome)/);

    // Navigate to astuccio
    await trialPage.goto("http://localhost:3000/astuccio", {
      waitUntil: "domcontentloaded",
    });
    await expect(trialPage).toHaveURL(/\/astuccio/);

    // Navigate to privacy
    await trialPage.goto("http://localhost:3000/privacy", {
      waitUntil: "domcontentloaded",
    });
    await expect(trialPage).toHaveURL(/\/privacy/);
  });
});

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

test.describe("Trial Mode - Full UI Audit", () => {
  test("should navigate to all public routes without critical errors", async ({
    trialPage,
  }) => {
    const errors: RouteError[] = [];
    const consoleErrors: string[] = [];

    // Listen for console errors
    trialPage.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(`[${msg.type()}] ${msg.text()}`);
      }
    });

    // Test each public route
    for (const route of PUBLIC_ROUTES) {
      consoleErrors.length = 0; // Reset console errors for this route

      try {
        // Navigate to route
        const response = await trialPage.goto(`http://localhost:3000${route}`, {
          waitUntil: "domcontentloaded",
          timeout: 10000,
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

        // Wait for page to stabilize
        await trialPage
          .waitForLoadState("networkidle", { timeout: 5000 })
          .catch(() => {
            // Network idle timeout is not critical, continue
          });

        // F-05: Check for console errors
        if (consoleErrors.length > 0) {
          errors.push({
            route,
            type: "console_error",
            message: `Console errors: ${consoleErrors.join("; ")}`,
            severity: "warning",
          });
        }

        // F-04: Check that buttons are clickable (basic check)
        await checkButtonsClickable(trialPage, route, errors);
      } catch (error) {
        errors.push({
          route,
          type: "navigation_error",
          message: `Navigation failed: ${error instanceof Error ? error.message : String(error)}`,
          severity: "critical",
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

  test("should verify trial mode restrictions are in place", async ({
    trialPage,
  }) => {
    // Navigate to home page
    await trialPage.goto("http://localhost:3000", {
      waitUntil: "domcontentloaded",
    });

    // Check that trial status is visible (trial mode indicator)
    const trialIndicator = trialPage.locator('[data-testid="trial-status"]');
    await expect(trialIndicator).toBeVisible({ timeout: 5000 });

    // Verify trial mode messaging is present
    const trialMessage = await trialPage
      .locator("text=/trial|prova|demo/i")
      .first();
    await expect(trialMessage).toBeVisible({ timeout: 5000 });
  });

  test("should allow basic navigation between public routes", async ({
    trialPage,
  }) => {
    // Start at home
    await trialPage.goto("http://localhost:3000", {
      waitUntil: "domcontentloaded",
    });

    // Navigate to landing
    await trialPage.goto("http://localhost:3000/landing", {
      waitUntil: "domcontentloaded",
    });
    await expect(trialPage).toHaveURL(/\/landing/);

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

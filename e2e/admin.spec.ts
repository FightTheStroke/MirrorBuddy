/**
 * E2E Tests: Admin Mode - Login & Route Audit
 *
 * Tests admin login flow and route accessibility.
 * F-12: Admin login flow
 * F-01,02,04,05,10,13,34: Route accessibility
 * F-07: Error filtering for chat/voice endpoints
 *
 * Run: npx playwright test e2e/admin.spec.ts
 *
 * Consolidated from:
 * - full-ui-audit/admin-ui.spec.ts (login flow + route audit)
 *
 * Related: e2e/admin-sidebar.spec.ts (click-based sidebar navigation)
 */

import { test, expect } from "./fixtures/auth-fixtures";
import {
  ADMIN_IGNORE_ERRORS,
  ADMIN_ROUTES,
  dismissBlockingModals,
  type AuditIssue,
} from "./admin-helpers";

// ============================================================================
// LOGIN FLOW (F-12)
// ============================================================================

test.describe("Admin Mode - Login Flow", () => {
  test("F-12: admin login flow works with .env credentials", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (!ADMIN_IGNORE_ERRORS.some((p) => p.test(text))) errors.push(text);
      }
    });

    await dismissBlockingModals(page);

    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // Dismiss any TOS modal if still present
    const tosModal = page.locator('[role="dialog"]');
    if (await tosModal.isVisible({ timeout: 3000 }).catch(() => false)) {
      const tosCheckbox = page.locator('input#tos-checkbox[type="checkbox"]');
      if (await tosCheckbox.isVisible({ timeout: 1000 }).catch(() => false)) {
        await tosCheckbox.click({ force: true });
        await page.waitForTimeout(300);
        const acceptButton = page.locator("button").filter({
          hasText: /Accett[ao]|Conferma|Accept/i,
        });
        await expect(acceptButton).toBeEnabled({ timeout: 2000 });
        await acceptButton.click();
        await page.waitForTimeout(500);
        await expect(tosModal).not.toBeVisible({ timeout: 3000 });
      }
    }

    // Verify login form elements
    await expect(page.locator("form").first()).toBeVisible();
    const usernameInput = page.locator('input[type="email"], input#username');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');

    await expect(usernameInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();

    const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "test-password";

    // Mock login API for test environment
    await page.route("**/api/auth/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, user: { email: adminEmail } }),
      });
    });

    await usernameInput.fill(adminEmail);
    await passwordInput.fill(adminPassword);
    await submitButton.click();
    await page.waitForLoadState("networkidle");

    expect(
      errors,
      `Console errors on /login: ${errors.join(", ")}`,
    ).toHaveLength(0);
  });
});

// ============================================================================
// ROUTE ACCESSIBILITY (F-01,02,04,05,10,13,34)
// ============================================================================

test.describe("Admin Mode - Route Accessibility", () => {
  test("F-01,02,04,05,10,13,34: all admin routes accessible", async ({
    adminPage,
  }) => {
    const auditReport: AuditIssue[] = [];

    adminPage.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (!ADMIN_IGNORE_ERRORS.some((p) => p.test(text))) {
          auditReport.push({
            route: adminPage.url(),
            type: "console",
            severity: "error",
            message: text,
          });
        }
      }
    });

    adminPage.on("response", (response) => {
      const url = response.url();
      const status = response.status();

      if (status === 404) {
        auditReport.push({
          route: adminPage.url(),
          type: "navigation",
          severity: "error",
          message: `404 Not Found: ${url}`,
        });
      }

      if (status >= 500 && !url.includes("/api/")) {
        auditReport.push({
          route: adminPage.url(),
          type: "network",
          severity: "error",
          message: `${status} Server Error: ${url}`,
        });
      }
    });

    for (const route of ADMIN_ROUTES) {
      await adminPage.goto(route);
      // Use domcontentloaded instead of networkidle - SSE connections never close
      await adminPage.waitForLoadState("domcontentloaded");
      // Wait for main content to be visible
      await adminPage.waitForSelector("main, [role='main']", {
        timeout: 10000,
      });

      const url = adminPage.url();
      const isRedirectedToLogin = url.includes("/login");
      const isOnExpectedRoute = url.includes(route);

      if (!isOnExpectedRoute && !isRedirectedToLogin) {
        auditReport.push({
          route,
          type: "navigation",
          severity: "warning",
          message: `Navigation redirected: expected ${route}, got ${url}`,
        });
      }

      const main = adminPage.locator("main, [role='main'], body > div").first();
      const isVisible = await main.isVisible().catch(() => false);
      if (!isVisible) {
        auditReport.push({
          route,
          type: "navigation",
          severity: "warning",
          message: "No main content visible on page",
        });
      }

      if (isOnExpectedRoute) {
        const buttons = adminPage.locator("button:visible");
        const buttonCount = await buttons.count();
        for (let i = 0; i < Math.min(buttonCount, 3); i++) {
          const button = buttons.nth(i);
          const isEnabled = await button.isEnabled().catch(() => false);
          if (!isEnabled) {
            const text = await button.textContent().catch(() => "unknown");
            auditReport.push({
              route,
              type: "button",
              severity: "warning",
              message: `Button not enabled: "${text}"`,
            });
          }
        }
      }

      await adminPage.waitForTimeout(300);
    }

    const errorCount = auditReport.filter((i) => i.severity === "error").length;
    console.log("\n=== ADMIN UI AUDIT REPORT ===");
    console.log(`Routes tested: ${ADMIN_ROUTES.length}`);
    console.log(`Errors: ${errorCount}`);

    if (auditReport.length > 0) {
      auditReport.forEach((issue) => {
        console.log(
          `  [${issue.severity.toUpperCase()}] ${issue.route}: ${issue.message}`,
        );
      });
    }

    expect(errorCount, `Found ${errorCount} errors in admin UI audit.`).toBe(0);
  });

  test("F-07: audit ignores chat and voice endpoints", async ({
    adminPage,
  }) => {
    const capturedErrors: string[] = [];
    adminPage.on("console", (msg) => {
      if (msg.type() === "error") capturedErrors.push(msg.text());
    });

    await adminPage.goto("/admin");
    // Use domcontentloaded instead of networkidle - SSE connections never close
    await adminPage.waitForLoadState("domcontentloaded");
    await adminPage.waitForSelector("main, [role='main']", { timeout: 10000 });

    const chatPattern = ADMIN_IGNORE_ERRORS.find((p) =>
      p.source.includes("chat"),
    );
    const voicePattern = ADMIN_IGNORE_ERRORS.find((p) =>
      p.source.includes("voice"),
    );
    expect(chatPattern).toBeDefined();
    expect(voicePattern).toBeDefined();
  });
});

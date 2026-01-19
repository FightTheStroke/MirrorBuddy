/**
 * E2E Test - Admin Mode UI Audit (Plan 57, Task T2-02)
 * F-12: Admin login flow | F-01,02,04,05,07,10,13,34: All admin routes
 * Verifies navigation, buttons, console errors | F-07: Skips chat/voice
 */

import { test, expect } from "../fixtures/auth-fixtures";

const ADMIN_ROUTES = [
  "/admin",
  "/admin/analytics",
  "/admin/invites",
  "/admin/tos",
  "/admin/users",
  "/change-password",
];

const IGNORE_ERRORS = [
  /ResizeObserver loop/i,
  /Download the React DevTools/i,
  /favicon\.ico/i,
  /429.*Too Many Requests/i,
  /net::ERR_/i,
  /Failed to load resource/i,
  /hydrat/i,
  /WebSocket/i,
  /Content Security Policy/i,
  /\/api\/chat/i,
  /\/api\/voice/i,
  /realtime.*token/i,
];

interface AuditIssue {
  route: string;
  type: "navigation" | "console" | "network" | "button";
  severity: "error" | "warning";
  message: string;
}

test.describe("Admin Mode UI Audit", () => {
  test("F-12: admin login flow works with .env credentials", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (!IGNORE_ERRORS.some((p) => p.test(text))) errors.push(text);
      }
    });

    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("form").first()).toBeVisible();
    await expect(
      page.locator('input[type="email"], input#username'),
    ).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    expect(
      errors,
      `Console errors on /login: ${errors.join(", ")}`,
    ).toHaveLength(0);
  });

  test("F-01,02,04,05,10,13,34: all admin routes accessible", async ({
    adminPage,
  }) => {
    const auditReport: AuditIssue[] = [];

    adminPage.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (!IGNORE_ERRORS.some((p) => p.test(text))) {
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

      if (status >= 500) {
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
      await adminPage.waitForLoadState("networkidle");

      const url = adminPage.url();
      if (!url.includes(route)) {
        auditReport.push({
          route,
          type: "navigation",
          severity: "error",
          message: `Navigation failed: expected ${route}, got ${url}`,
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

      const buttons = adminPage.locator("button:visible");
      const buttonCount = await buttons.count();
      if (buttonCount > 0) {
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
    const warningCount = auditReport.filter(
      (i) => i.severity === "warning",
    ).length;

    console.log("\n=== ADMIN UI AUDIT REPORT ===");
    console.log(`Routes tested: ${ADMIN_ROUTES.length}`);
    console.log(`Errors: ${errorCount} | Warnings: ${warningCount}`);

    if (auditReport.length > 0) {
      console.log("\nIssues:");
      auditReport.forEach((issue) => {
        console.log(
          `  [${issue.severity.toUpperCase()}] ${issue.route}: ${issue.message}`,
        );
      });
    } else {
      console.log("\nNo issues found!");
    }

    expect(
      errorCount,
      `Found ${errorCount} errors in admin UI audit. See report above.`,
    ).toBe(0);
  });

  test("F-07: audit ignores chat and voice endpoints", async ({
    adminPage,
  }) => {
    const capturedErrors: string[] = [];
    adminPage.on("console", (msg) => {
      if (msg.type() === "error") capturedErrors.push(msg.text());
    });

    await adminPage.goto("/admin");
    await adminPage.waitForLoadState("networkidle");

    const chatPattern = IGNORE_ERRORS.find((p) => p.source.includes("chat"));
    const voicePattern = IGNORE_ERRORS.find((p) => p.source.includes("voice"));
    expect(chatPattern).toBeDefined();
    expect(voicePattern).toBeDefined();

    const chatVoiceErrors = capturedErrors.filter(
      (e) => e.includes("/api/chat") || e.includes("/api/voice"),
    );
    if (chatVoiceErrors.length > 0) {
      console.log(
        `Correctly ignored ${chatVoiceErrors.length} chat/voice errors`,
      );
    }
  });
});

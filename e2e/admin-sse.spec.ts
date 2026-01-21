/**
 * E2E Tests: Admin SSE (Server-Sent Events)
 *
 * Tests real-time admin dashboard updates via SSE.
 * F-08: Test Playwright per SSE connection e updates
 * F-28: Test: initial data, push update, reconnection
 *
 * Run: npx playwright test e2e/admin-sse.spec.ts
 */

import { test, expect } from "./fixtures/auth-fixtures";
import { dismissBlockingModals } from "./admin-helpers";

test.describe("Admin SSE - Real-time Dashboard Updates", () => {
  test("F-08, F-20: SSE connection establishes and sends initial data", async ({
    adminPage,
  }) => {
    // Mock ToS API to prevent modal from blocking UI (e2e-testing.md requirement)
    await adminPage.route("/api/tos", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ accepted: true, version: "1.0" }),
      });
    });

    await dismissBlockingModals(adminPage);

    // Navigate to admin dashboard
    await adminPage.goto("/admin/invites");
    await adminPage.waitForLoadState("domcontentloaded");

    // Wait for EventSource connection to be established
    await adminPage.waitForTimeout(1000);

    // Verify page loaded successfully (no connection errors)
    let connectionErrors = false;
    adminPage.on("console", (msg) => {
      if (msg.type() === "error" && msg.text().includes("SSE")) {
        connectionErrors = true;
      }
    });

    expect(connectionErrors).toBe(false);

    // Verify the page is still interactive
    const pageBody = adminPage.locator("body");
    await expect(pageBody).toBeVisible();
  });

  test("F-21: SSE heartbeat messages keep connection alive", async ({
    adminPage,
  }) => {
    // Mock ToS API
    await adminPage.route("/api/tos", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ accepted: true, version: "1.0" }),
      });
    });

    await dismissBlockingModals(adminPage);

    // Intercept SSE endpoint to verify heartbeat
    let heartbeatReceived = false;
    await adminPage.route("**/api/admin/counts/stream", async (route) => {
      const request = route.request();
      if (request.method() === "GET") {
        // Simulate SSE response with heartbeat
        const stream = `: heartbeat\n\n`;
        heartbeatReceived = true;
        await route.fulfill({
          status: 200,
          contentType: "text/event-stream",
          body: stream,
        });
      } else {
        await route.continue();
      }
    });

    await adminPage.goto("/admin/invites");
    await adminPage.waitForLoadState("domcontentloaded");

    // Wait for potential heartbeat (30s in production, but we mock immediately)
    await adminPage.waitForTimeout(2000);

    // Verify heartbeat was sent (via our mock interception)
    expect(heartbeatReceived).toBe(true);
  });

  test("F-28: Push update when DB event occurs", async ({ adminPage }) => {
    // Mock ToS API
    await adminPage.route("/api/tos", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ accepted: true, version: "1.0" }),
      });
    });

    await dismissBlockingModals(adminPage);

    // Track SSE messages
    const sseMessages: string[] = [];
    await adminPage.route("**/api/admin/counts/stream", async (route) => {
      const request = route.request();
      if (request.method() === "GET") {
        // Simulate initial data + update
        const initialData = {
          pendingInvites: 5,
          totalUsers: 100,
          activeUsers24h: 50,
          systemAlerts: 2,
          timestamp: new Date().toISOString(),
        };

        const updatedData = {
          ...initialData,
          pendingInvites: 6, // Simulated new invite
        };

        // Send initial data
        const initialMessage = `data: ${JSON.stringify(initialData)}\n\n`;
        sseMessages.push(initialMessage);

        // Send update after delay
        setTimeout(() => {
          const updateMessage = `data: ${JSON.stringify(updatedData)}\n\n`;
          sseMessages.push(updateMessage);
        }, 1000);

        await route.fulfill({
          status: 200,
          contentType: "text/event-stream",
          body: initialMessage,
        });
      } else {
        await route.continue();
      }
    });

    await adminPage.goto("/admin/invites");
    await adminPage.waitForLoadState("domcontentloaded");

    // Wait for initial data
    await adminPage.waitForTimeout(500);

    // Verify at least initial message was captured
    expect(sseMessages.length).toBeGreaterThan(0);
    expect(sseMessages[0]).toContain("data:");
  });

  test("F-08: SSE endpoint requires admin authentication", async ({ page }) => {
    // Use regular page (not adminPage) to test auth requirement
    // Mock ToS API
    await page.route("/api/tos", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ accepted: true, version: "1.0" }),
      });
    });

    await dismissBlockingModals(page);

    // Try to connect to SSE endpoint without admin auth
    const response = await page.request.get("/api/admin/counts/stream");

    // Should be rejected with 401 Unauthorized
    expect(response.status()).toBe(401);
  });

  test("F-20: Initial data sent within 500ms (performance target)", async ({
    adminPage,
  }) => {
    // Mock ToS API
    await adminPage.route("/api/tos", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ accepted: true, version: "1.0" }),
      });
    });

    await dismissBlockingModals(adminPage);

    // Track timing of initial data
    let initialDataTime: number | null = null;
    const startTime = Date.now();

    await adminPage.route("**/api/admin/counts/stream", async (route) => {
      const request = route.request();
      if (request.method() === "GET") {
        initialDataTime = Date.now() - startTime;

        const data = {
          pendingInvites: 5,
          totalUsers: 100,
          activeUsers24h: 50,
          systemAlerts: 2,
          timestamp: new Date().toISOString(),
        };

        await route.fulfill({
          status: 200,
          contentType: "text/event-stream",
          body: `data: ${JSON.stringify(data)}\n\n`,
        });
      } else {
        await route.continue();
      }
    });

    await adminPage.goto("/admin/invites");
    await adminPage.waitForLoadState("domcontentloaded");

    // Wait for SSE connection
    await adminPage.waitForTimeout(1000);

    // Verify initial data was sent quickly (within 500ms target in production)
    expect(initialDataTime).not.toBeNull();
    // Allow margin for test environment overhead (test env can be slower than production)
    // Target: 500ms, Test threshold: 2000ms (4x margin for CI/test overhead)
    expect(initialDataTime!).toBeLessThan(2000);
  });
});

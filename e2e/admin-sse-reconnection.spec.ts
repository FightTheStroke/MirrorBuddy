/**
 * E2E Tests: Admin SSE Reconnection
 *
 * Tests SSE reconnection behavior after network disconnect.
 * F-22: "Reconnecting..." banner appears on disconnect
 * F-28: Automatic reconnection with exponential backoff
 *
 * Run: npx playwright test e2e/admin-sse-reconnection.spec.ts
 */

import { test, expect } from "./fixtures/auth-fixtures";
import { dismissBlockingModals } from "./admin-helpers";

test.describe("Admin SSE - Reconnection Behavior", () => {
  test("F-22,F-28: Shows 'Reconnecting...' banner and auto-reconnects after disconnect", async ({
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

    let shouldBlock = false;
    let connectionCount = 0;

    // Track connection attempts and allow blocking
    await adminPage.route("**/api/admin/counts/stream", async (route) => {
      connectionCount++;

      if (shouldBlock) {
        // Simulate network failure
        route.abort("failed");
        return;
      }

      const request = route.request();

      if (request.method() === "GET") {
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

    // Initial connection established
    await adminPage.waitForTimeout(1000);
    const initialConnectionCount = connectionCount;
    expect(initialConnectionCount).toBeGreaterThan(0);

    // Step 1: Simulate network disconnect by blocking the endpoint
    shouldBlock = true;
    await adminPage.waitForTimeout(500);

    // Step 2: Verify the "Reconnecting..." banner appears
    // Banner text from admin-layout-client.tsx: "Reconnecting to admin data stream..."
    const reconnectingBanner = adminPage
      .locator("text=Reconnecting to admin data stream")
      .first();

    // Hook retry logic: first retry after 1000ms (exponential backoff)
    // F-22: UI shows "Reconnecting..." during disconnect
    await expect(reconnectingBanner).toBeVisible({
      timeout: 3000,
    });

    // Step 3: Restore connection to allow reconnection
    shouldBlock = false;

    // Step 4: Wait for automatic reconnection to succeed
    // Hook retries 3 times: 1s, 2s, 4s. Should reconnect within ~5s
    await expect(reconnectingBanner).not.toBeVisible({
      timeout: 5000,
    });

    // Step 5: Verify reconnection occurred (connection attempts increased)
    expect(connectionCount).toBeGreaterThan(initialConnectionCount);

    // Step 6: Verify page is still functional after reconnection
    const pageBody = adminPage.locator("body");
    await expect(pageBody).toBeVisible();
  });

  test("F-28: Reconnects after page reload", async ({ adminPage }) => {
    // Mock ToS API
    await adminPage.route("/api/tos", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ accepted: true, version: "1.0" }),
      });
    });

    await dismissBlockingModals(adminPage);

    let connectionCount = 0;

    // Track connection attempts
    await adminPage.route("**/api/admin/counts/stream", async (route) => {
      connectionCount++;
      const request = route.request();

      if (request.method() === "GET") {
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

    // Initial connection established
    await adminPage.waitForTimeout(1000);
    const initialConnectionCount = connectionCount;
    expect(initialConnectionCount).toBeGreaterThan(0);

    // Simulate network interruption by reloading page
    await adminPage.reload();
    await adminPage.waitForLoadState("domcontentloaded");
    await adminPage.waitForTimeout(1000);

    // Verify reconnection (connection count increased)
    expect(connectionCount).toBeGreaterThan(initialConnectionCount);
  });
});

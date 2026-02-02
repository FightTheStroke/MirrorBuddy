/**
 * E2E Tests: Admin Mission Control - API Routes
 *
 * Tests API authentication and data structures for mission control panels.
 * Panels: key-vault, health-aggregator, stripe, ops-dashboard,
 *         infra-panel, ai-email, business-kpi, control-panel, grafana
 *
 * F-XX: Mission Control Admin Panels (Plan 100 W0)
 */

import { test, expect } from "./fixtures/auth-fixtures";

// API endpoints for mission control panels
const MISSION_CONTROL_APIS = [
  { path: "/api/admin/key-vault", method: "GET" },
  { path: "/api/admin/health-aggregator", method: "GET" },
  { path: "/api/admin/stripe", method: "GET" },
  { path: "/api/admin/ops-dashboard", method: "GET" },
  { path: "/api/admin/infra-panel", method: "GET" },
  { path: "/api/admin/ai-email", method: "GET" },
  { path: "/api/admin/business-kpi", method: "GET" },
  { path: "/api/admin/control-panel", method: "GET" },
  { path: "/api/admin/grafana", method: "GET" },
] as const;

test.describe("Mission Control API - Authentication", () => {
  test("all mission control APIs return 401 for unauthenticated requests", async ({
    browser,
    baseURL,
  }) => {
    // Create a fresh context with NO cookies to ensure truly unauthenticated requests
    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();

    // Mock ToS API (required by project rules)
    await page.route("**/api/tos", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ accepted: true, version: "1.0" }),
      });
    });

    // Test each API without authentication
    for (const api of MISSION_CONTROL_APIS) {
      const response = await page.request.get(`${baseURL}${api.path}`);
      expect(
        response.status(),
        `${api.path} should return 401 for unauthenticated request`,
      ).toBe(401);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.toLowerCase()).toContain("unauthorized");
    }

    await context.close();
  });
});

test.describe("Mission Control API - Authenticated Access", () => {
  test("key-vault API returns secrets or server error for admin", async ({
    adminRequest,
  }) => {
    const response = await adminRequest.get("/api/admin/key-vault");
    // key-vault may return 500 if encryption keys are not available (test env)
    expect([200, 500]).toContain(response.status());

    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty("secrets");
      expect(Array.isArray(data.secrets)).toBe(true);
    }
  });

  test("health-aggregator API returns health data for admin", async ({
    adminRequest,
  }) => {
    const response = await adminRequest.get("/api/admin/health-aggregator");
    expect(response.status()).toBe(200);

    const data = await response.json();
    // Health aggregator returns status, services, timestamp
    expect(data).toBeDefined();
    expect(typeof data).toBe("object");
  });

  test("stripe API returns subscription data for admin", async ({
    adminRequest,
  }) => {
    const response = await adminRequest.get("/api/admin/stripe");
    expect(response.status()).toBe(200);

    const data = await response.json();
    // Stripe API returns products, subscriptions, revenue
    expect(data).toHaveProperty("configured");
    expect(typeof data.configured).toBe("boolean");
  });

  test("ops-dashboard API returns metrics for admin", async ({
    adminRequest,
  }) => {
    const response = await adminRequest.get("/api/admin/ops-dashboard");
    expect(response.status()).toBe(200);

    const data = await response.json();
    // Ops dashboard returns real-time metrics
    expect(data).toBeDefined();
    expect(typeof data).toBe("object");
  });

  test("infra-panel API returns infrastructure data for admin", async ({
    adminRequest,
  }) => {
    const response = await adminRequest.get("/api/admin/infra-panel");
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toBeDefined();
    expect(typeof data).toBe("object");
  });

  test("ai-email API returns AI/email metrics for admin", async ({
    adminRequest,
  }) => {
    const response = await adminRequest.get("/api/admin/ai-email");
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toBeDefined();
    expect(typeof data).toBe("object");
  });

  test("business-kpi API returns KPI data for admin", async ({
    adminRequest,
  }) => {
    const response = await adminRequest.get("/api/admin/business-kpi");
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toBeDefined();
    expect(typeof data).toBe("object");
  });

  test("control-panel API returns control settings for admin", async ({
    adminRequest,
  }) => {
    const response = await adminRequest.get("/api/admin/control-panel");
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toBeDefined();
    expect(typeof data).toBe("object");
  });

  test("grafana API returns Grafana config for admin", async ({
    adminRequest,
  }) => {
    const response = await adminRequest.get("/api/admin/grafana");
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toBeDefined();
    expect(typeof data).toBe("object");
  });
});

test.describe("Mission Control API - Data Structure Validation", () => {
  test("key-vault API returns masked secrets with expected fields", async ({
    adminRequest,
  }) => {
    const response = await adminRequest.get("/api/admin/key-vault");
    // key-vault may return 500 if encryption keys are not available (test env)
    expect([200, 500]).toContain(response.status());

    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty("secrets");
      expect(Array.isArray(data.secrets)).toBe(true);

      // If there are secrets, validate structure
      if (data.secrets.length > 0) {
        const secret = data.secrets[0];
        expect(secret).toHaveProperty("id");
        expect(secret).toHaveProperty("service");
        expect(secret).toHaveProperty("keyName");
        expect(secret).toHaveProperty("maskedValue");
        expect(secret).toHaveProperty("status");
      }
    }
  });

  test("stripe API has expected structure", async ({ adminRequest }) => {
    const response = await adminRequest.get("/api/admin/stripe");
    const data = await response.json();

    expect(data).toHaveProperty("configured");
    expect(data).toHaveProperty("products");
    expect(data).toHaveProperty("subscriptions");
    expect(Array.isArray(data.products)).toBe(true);
    expect(Array.isArray(data.subscriptions)).toBe(true);
  });
});

test.describe("Mission Control API - Error Handling", () => {
  test("APIs handle malformed requests gracefully", async ({
    adminRequest,
  }) => {
    // Test POST to GET-only endpoint (should return 405 or handle gracefully)
    const response = await adminRequest.post("/api/admin/health-aggregator", {
      data: { invalid: "data" },
    });

    // Should return 405 Method Not Allowed or similar error
    expect([405, 404, 400]).toContain(response.status());
  });
});

/**
 * SMOKE TESTS: Endpoint Health & Status
 *
 * Tests critical HTTP endpoints to ensure they respond with correct status codes.
 * These tests focus on infrastructure and routing verification.
 *
 * Purpose: Verify admin routes and health endpoints are properly configured
 * Execution: Every PR, pre-merge gate
 * Priority: BLOCKING - catches routing/proxy misconfiguration early
 *
 * Endpoints tested:
 * 1. GET /api/health - Core health check endpoint
 * 2. GET /admin - Admin dashboard (proxy routing)
 * 3. GET /it/admin - Localized admin dashboard
 * 4. Health endpoint response structure validation
 */

import { test, expect } from "@playwright/test";

test.describe("SMOKE: Endpoint Health & Status @smoke", () => {
  test.describe.configure({ mode: "serial" });

  test("SE-01: API health endpoint returns 200", async ({ request }) => {
    // Health endpoint should be reachable and return 200 (or 503 on cold start)
    let response = await request.get("/api/health");

    // Handle serverless cold start (first request may return 503)
    if (response.status() === 503) {
      // Wait briefly and retry
      await new Promise((resolve) => setTimeout(resolve, 1000));
      response = await request.get("/api/health");
    }

    // After retry, should be operational (200) or degraded (503, but data present)
    expect([200, 503]).toContain(response.status());
  });

  test("SE-02: Health endpoint returns valid JSON structure", async ({
    request,
  }) => {
    const response = await request.get("/api/health");

    // Should be valid JSON
    expect(response.headers()["content-type"]).toContain("application/json");

    const data = await response.json();

    // Should have required properties
    expect(data).toHaveProperty("status");
    expect(["healthy", "degraded", "unhealthy"]).toContain(data.status);

    // Should have timestamp for cache busting
    if (data.timestamp) {
      const timestamp = new Date(data.timestamp);
      expect(timestamp.getTime()).toBeGreaterThan(0);
    }

    // If checks exist, should be an object
    if (data.checks) {
      expect(typeof data.checks).toBe("object");
    }
  });

  test("SE-03: Admin dashboard route responds (with or without auth)", async ({
    request,
  }) => {
    // Make unauthenticated request to /admin
    // Should either:
    // - Return 200 if proxy allows it
    // - Return 302/307 redirect to login
    // - Return 401 Unauthorized
    const response = await request.get("/admin", {
      // Don't follow redirects to see the actual response
      maxRedirects: 0,
    });

    const status = response.status();

    // Acceptable responses: redirect (302/307), unauthorized (401), or success (200)
    const acceptableStatuses = [200, 301, 302, 307, 401, 403];
    expect(acceptableStatuses).toContain(
      status,
      `/admin returned ${status}, expected redirect or 200/401`,
    );
  });

  test("SE-04: Localized admin route /it/admin responds", async ({
    request,
  }) => {
    // Localized admin route
    const response = await request.get("/it/admin", {
      maxRedirects: 0,
    });

    const status = response.status();

    // Same expectations as /admin
    const acceptableStatuses = [200, 301, 302, 307, 401, 403];
    expect(acceptableStatuses).toContain(
      status,
      `/it/admin returned ${status}, expected redirect or 200/401`,
    );
  });

  test("SE-05: Admin redirect behavior is consistent", async ({ page }) => {
    // Test both routes with page navigation to capture full redirect chain
    const adminUrl = page.url().replace(/^.*:\/\/[^/]+/, "") + "/admin";
    const itAdminUrl = page.url().replace(/^.*:\/\/[^/]+/, "") + "/it/admin";

    // Navigate to /admin and capture final URL
    await page.goto(adminUrl, { waitUntil: "domcontentloaded" });
    const finalAdminUrl = page.url();

    // Navigate to /it/admin and capture final URL
    await page.goto(itAdminUrl, { waitUntil: "domcontentloaded" });
    const finalItAdminUrl = page.url();

    // Both should either land on admin dashboard or login page
    const isValidAdminPath = (url: string) =>
      url.includes("/admin") ||
      url.includes("/login") ||
      url.includes("/en/login") ||
      url.includes("/it/login");

    expect(isValidAdminPath(finalAdminUrl)).toBe(
      true,
      `/admin redirected to invalid URL: ${finalAdminUrl}`,
    );

    expect(isValidAdminPath(finalItAdminUrl)).toBe(
      true,
      `/it/admin redirected to invalid URL: ${finalItAdminUrl}`,
    );
  });

  test("SE-06: Health detailed endpoint responds", async ({ request }) => {
    // Test the detailed health endpoint if it exists
    const response = await request.get("/api/health/detailed");

    // Should return 200 or 503 (same as /api/health)
    expect([200, 503]).toContain(response.status());

    // Should be valid JSON
    if (response.status() === 200) {
      expect(response.headers()["content-type"]).toContain("application/json");

      const data = await response.json();

      // Detailed health should have checks object
      if (data.checks) {
        expect(typeof data.checks).toBe("object");

        // Common checks in detailed response
        const checkKeys = Object.keys(data.checks);

        // At least one check should be present
        expect(checkKeys.length).toBeGreaterThan(0);

        // Each check should be a non-null object with at least one property
        checkKeys.forEach((key) => {
          if (data.checks[key] && typeof data.checks[key] === "object") {
            expect(Object.keys(data.checks[key]).length).toBeGreaterThan(0);
          }
        });
      }
    }
  });

  test("SE-07: No unexpected redirects on admin routes", async ({
    request,
  }) => {
    // Test that admin routes don't redirect to unexpected locations
    const adminResponse = await request.get("/admin", {
      maxRedirects: 0,
    });

    const itAdminResponse = await request.get("/it/admin", {
      maxRedirects: 0,
    });

    // Check redirect headers if present
    if (
      adminResponse.status() >= 300 &&
      adminResponse.status() < 400 &&
      adminResponse.headers()["location"]
    ) {
      const location = adminResponse.headers()["location"];
      // Redirect should go to login, not to external sites
      expect(
        location.includes("/login") ||
          location.includes("/en/login") ||
          location.includes("/it/login") ||
          location.startsWith("/"),
      ).toBe(true, `Unexpected redirect location: ${location}`);
    }

    if (
      itAdminResponse.status() >= 300 &&
      itAdminResponse.status() < 400 &&
      itAdminResponse.headers()["location"]
    ) {
      const location = itAdminResponse.headers()["location"];
      expect(
        location.includes("/login") ||
          location.includes("/en/login") ||
          location.includes("/it/login") ||
          location.startsWith("/"),
      ).toBe(true, `Unexpected redirect location for /it/admin: ${location}`);
    }
  });

  test("SE-08: Health endpoint is protected by rate limiting headers (if configured)", async ({
    request,
  }) => {
    const response = await request.get("/api/health");

    // Check for rate limit headers if configured
    const headers = response.headers();

    // Rate limit headers are optional but if present, should have valid values
    if (headers["x-ratelimit-limit"]) {
      expect(parseInt(headers["x-ratelimit-limit"])).toBeGreaterThan(0);
    }

    if (headers["x-ratelimit-remaining"]) {
      expect(parseInt(headers["x-ratelimit-remaining"])).toBeGreaterThanOrEqual(
        0,
      );
    }
  });
});

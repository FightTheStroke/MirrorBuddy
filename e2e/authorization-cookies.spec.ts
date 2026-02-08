// ============================================================================
// E2E TESTS: Authorization and Cookie Validation
// Tests for 401/403 scenarios, visitor ID validation, and admin access
// Related: ADR 0075 Cookie Handling Standards
// ============================================================================

import { test, expect } from "./fixtures/base-fixtures";

test.describe("Visitor ID Validation (UUID v4)", () => {
  test("Invalid visitor ID format - should be rejected", async ({
    page,
    context,
  }) => {
    // Clear all cookies first
    await context.clearCookies();

    // Remove base-fixtures mock so we test the real API
    await page.unroute("**/api/trial/session");

    // Set an invalid visitor ID (not a UUID v4)
    await context.addCookies([
      {
        name: "mirrorbuddy-visitor-id",
        value: "invalid-not-uuid",
        domain: "localhost",
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);

    // Try to access trial session endpoint
    const response = await page.goto("/api/trial/session");
    expect(response).not.toBeNull();

    // Should either reject with 401 or create a new valid session
    // Invalid format should NOT be accepted as-is
    if (response!.status() === 200) {
      const body = await response!.json();
      // If 200, the visitor ID should have been regenerated as a valid UUID
      if (body.visitorId) {
        expect(body.visitorId).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        );
      }
    }
  });

  test("Valid visitor ID format - should be accepted", async ({
    page,
    context,
  }) => {
    // Clear all cookies first
    await context.clearCookies();

    // Set a valid UUID v4 visitor ID
    const validUuid = "12345678-1234-4123-8123-123456789abc";
    await context.addCookies([
      {
        name: "mirrorbuddy-visitor-id",
        value: validUuid,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);

    // Try to access trial session endpoint
    const response = await page.goto("/api/trial/session");
    expect(response).not.toBeNull();

    // Should accept valid UUID format
    expect([200, 201]).toContain(response!.status());
  });
});

test.describe("CSRF Protection", () => {
  test("POST without CSRF token - returns 403", async ({ request }) => {
    // First create a user to have authentication
    await request.get("/api/user");

    // Try to POST without CSRF token
    const response = await request.post("/api/onboarding", {
      data: { data: { name: "Test" } },
    });

    // Should return 403 for missing CSRF token
    expect(response.status()).toBe(403);

    const body = await response.json();
    expect(body.error).toContain("CSRF");
  });

  test("POST with CSRF token - should succeed", async ({ request }) => {
    // First create a user
    await request.get("/api/user");

    // Get CSRF token from session endpoint
    const sessionResponse = await request.get("/api/session");
    expect(sessionResponse.ok()).toBeTruthy();

    const sessionData = await sessionResponse.json();
    const csrfToken = sessionData.csrfToken;
    expect(csrfToken).toBeDefined();

    // Try to POST with CSRF token
    const response = await request.post("/api/onboarding", {
      headers: {
        "x-csrf-token": csrfToken,
      },
      data: { data: { name: "Test" } },
    });

    // Should succeed with valid CSRF token
    expect([200, 201, 400]).toContain(response.status());
    // 400 is acceptable if the data validation fails (not CSRF)
    if (response.status() === 400) {
      const body = await response.json();
      expect(body.error).not.toContain("CSRF");
    }
  });
});

test.describe("Admin Authorization", () => {
  test("Non-admin accessing admin endpoint - returns 403", async ({
    request,
  }) => {
    // Create a regular user (not admin)
    await request.get("/api/user");

    // Try to access admin endpoint
    const response = await request.get("/api/admin/tiers");

    // Authenticated non-admin gets 403 (withAdmin validates auth first, then admin role)
    expect(response.status()).toBe(403);

    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  test("Unauthenticated accessing admin endpoint - returns 401", async ({
    page,
    context,
  }) => {
    // Clear all cookies
    await context.clearCookies();

    // Try to access admin endpoint
    const response = await page.goto("/api/admin/tiers");
    expect(response).not.toBeNull();

    expect(response!.status()).toBe(401);
  });
});

test.describe("Protected API Routes", () => {
  test("Unauthenticated user accessing /api/user/settings - returns 401", async ({
    page,
    context,
  }) => {
    // Clear all cookies
    await context.clearCookies();

    const response = await page.goto("/api/user/settings");
    expect(response).not.toBeNull();

    expect(response!.status()).toBe(401);

    const body = await response!.json();
    expect(body.error).toBeDefined();
  });

  test("Unauthenticated user accessing /api/progress - returns 401", async ({
    page,
    context,
  }) => {
    // Clear all cookies
    await context.clearCookies();

    const response = await page.goto("/api/progress");
    expect(response).not.toBeNull();

    expect(response!.status()).toBe(401);
  });
});

test.describe("Cookie Consistency", () => {
  test("Both auth cookies are set on login", async ({ page, context }) => {
    // Clear cookies
    await context.clearCookies();

    // Create user through /api/user
    await page.goto("/api/user");
    await page.waitForLoadState("domcontentloaded");

    const cookies = await context.cookies();

    // Should have both httpOnly and client-readable cookies
    const serverCookie = cookies.find((c) => c.name === "mirrorbuddy-user-id");
    const clientCookie = cookies.find(
      (c) => c.name === "mirrorbuddy-user-id-client",
    );

    expect(serverCookie).toBeDefined();
    expect(clientCookie).toBeDefined();

    // Server cookie should be signed (contains dot separator)
    expect(serverCookie!.value).toContain(".");

    // Server cookie should be httpOnly (verified by Playwright access)
    expect(serverCookie!.httpOnly).toBe(true);

    // Client cookie should NOT be httpOnly
    expect(clientCookie!.httpOnly).toBe(false);

    // Both should have same user ID (before signature)
    const serverUserId = serverCookie!.value.split(".")[0];
    const clientUserId = clientCookie!.value;
    expect(serverUserId).toBe(clientUserId);
  });

  test("Cookies cleared on logout", async ({ page, context }) => {
    // First create a user
    await page.goto("/api/user");
    await page.waitForLoadState("domcontentloaded");

    // Verify cookies exist
    let cookies = await context.cookies();
    expect(cookies.some((c) => c.name === "mirrorbuddy-user-id")).toBeTruthy();

    // Get CSRF token for logout (POST requires CSRF)
    const sessionRes = await page.request.get("/api/session");
    const { csrfToken } = await sessionRes.json();

    // Logout via POST with CSRF token (logout is POST-only)
    const logoutResponse = await page.request.post("/api/auth/logout", {
      headers: { "x-csrf-token": csrfToken },
    });
    expect(logoutResponse.ok()).toBeTruthy();

    // Check cookies are cleared
    cookies = await context.cookies();
    const authCookie = cookies.find((c) => c.name === "mirrorbuddy-user-id");

    // Cookie should either be deleted or have empty value
    if (authCookie) {
      expect(authCookie.value).toBe("");
    }
  });
});

test.describe("ToS and Consent API", () => {
  test("/api/tos GET - returns acceptance status", async ({ request }) => {
    // Create user first
    await request.get("/api/user");

    const response = await request.get("/api/tos");
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    // Should return acceptance status (may be false for new user)
    expect(typeof body.accepted).toBe("boolean");
  });

  test("/api/user/consent GET - works for authenticated user", async ({
    request,
  }) => {
    // Create user first
    await request.get("/api/user");

    const response = await request.get("/api/user/consent");
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    // Should return consent object (may be null for new user)
    expect(body).toHaveProperty("consent");
  });
});

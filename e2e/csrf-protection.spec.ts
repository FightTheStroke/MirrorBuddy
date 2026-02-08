/**
 * E2E Tests: CSRF Protection
 *
 * Verifies that CSRF protection works correctly:
 * 1. Requests without CSRF token are rejected with 403
 * 2. Requests with valid CSRF token succeed
 *
 * ADR 0053: Vercel Runtime Constraints documents CSRF requirements.
 */

import { test, expect } from "./fixtures/auth-fixtures";

test.describe("CSRF Protection", () => {
  test("POST without CSRF token returns 403", async ({ request }) => {
    // Attempt to call a protected endpoint without CSRF token
    // The request.post() API bypasses browser behavior, so we need to
    // explicitly omit the CSRF header to test protection
    const response = await request.post("/api/tools/events", {
      data: {
        sessionId: "voice-test-session",
        maestroId: "archimede",
        type: "tool:created",
        toolType: "mindmap",
        data: { title: "Test" },
      },
      // No CSRF token header
    });

    // Should be rejected with 403 (Invalid CSRF token)
    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.error).toContain("CSRF");
  });

  test("POST with valid CSRF token succeeds", async ({ adminRequest }) => {
    // Ensure admin user exists in database (auto-created on first /api/user call)
    await adminRequest.get("/api/user");

    // Get a CSRF token from /api/session (sets the csrf-token cookie)
    const sessionResponse = await adminRequest.get("/api/session");
    expect(sessionResponse.ok()).toBeTruthy();

    const sessionData = await sessionResponse.json();
    expect(sessionData.csrfToken).toBeDefined();
    const csrfToken = sessionData.csrfToken;

    // Extract csrf-token cookie from Set-Cookie header (adminRequest doesn't auto-persist)
    const setCookieHeaders = sessionResponse
      .headersArray()
      .filter((h) => h.name.toLowerCase() === "set-cookie");
    const csrfCookie = setCookieHeaders
      .map((h) => h.value)
      .find((v) => v.startsWith("csrf-token="));
    const csrfCookieValue = csrfCookie?.split(";")[0] || "";

    // Build combined cookie header: original auth cookies + csrf-token from session
    const originalCookie = sessionResponse.request().headers()["cookie"] || "";
    const combinedCookies = originalCookie
      ? `${originalCookie}; ${csrfCookieValue}`
      : csrfCookieValue;

    // POST with CSRF token header and csrf-token cookie
    const response = await adminRequest.post("/api/tools/events", {
      data: {
        sessionId: `voice-test-session-${Date.now()}`,
        maestroId: "archimede",
        type: "tool:created",
        toolType: "mindmap",
        data: { title: "CSRF Test Mindmap" },
      },
      headers: {
        "x-csrf-token": csrfToken,
        Cookie: combinedCookies,
      },
    });

    const body = await response.json();
    expect(
      response.ok(),
      `Expected 200 OK but got ${response.status()}: ${JSON.stringify(body)}`,
    ).toBeTruthy();
    expect(body.success).toBe(true);
    expect(body.eventId).toBeDefined();
  });

  test("PUT without CSRF token is rejected", async ({ request }) => {
    // Test PUT endpoint protection
    // Endpoints may check auth (401) before CSRF (403), both are valid rejections
    const response = await request.put("/api/user/settings", {
      data: {
        theme: "dark",
      },
    });

    // Should be rejected - either auth (401) or CSRF (403)
    expect([401, 403]).toContain(response.status());
  });

  test("DELETE without CSRF token returns 403", async ({ request }) => {
    // Test DELETE endpoint CSRF protection
    const response = await request.delete(
      "/api/materials?toolId=test-csrf-delete",
    );

    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.error).toContain("CSRF");
  });

  test("GET requests work without CSRF token", async ({ request }) => {
    // GET requests should not require CSRF
    // Using /api/session which always works and returns CSRF token
    const response = await request.get("/api/session");

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.csrfToken).toBeDefined();
  });
});

test.describe("CSRF with Tools Integration", () => {
  test("Tool creation flow with proper CSRF", async ({ adminRequest }) => {
    // Ensure admin user exists in database (auto-created on first /api/user call)
    await adminRequest.get("/api/user");

    // Get CSRF token and cookie from /api/session
    const sessionResponse = await adminRequest.get("/api/session");
    expect(sessionResponse.ok()).toBeTruthy();

    const { csrfToken } = await sessionResponse.json();
    expect(csrfToken).toBeDefined();

    // Extract csrf-token cookie from Set-Cookie header
    const setCookieHeaders = sessionResponse
      .headersArray()
      .filter((h) => h.name.toLowerCase() === "set-cookie");
    const csrfCookie = setCookieHeaders
      .map((h) => h.value)
      .find((v) => v.startsWith("csrf-token="));
    const csrfCookieValue = csrfCookie?.split(";")[0] || "";
    const originalCookie = sessionResponse.request().headers()["cookie"] || "";
    const combinedCookies = originalCookie
      ? `${originalCookie}; ${csrfCookieValue}`
      : csrfCookieValue;

    const sessionId = `voice-csrf-flow-${Date.now()}`;
    const csrfHeaders = {
      "x-csrf-token": csrfToken,
      Cookie: combinedCookies,
    };

    // Step 1: Create tool event (simulates voice command)
    const createResponse = await adminRequest.post("/api/tools/events", {
      data: {
        sessionId,
        maestroId: "archimede",
        type: "tool:created",
        toolType: "mindmap",
        data: {
          title: "CSRF Integration Test",
          subject: "mathematics",
        },
      },
      headers: csrfHeaders,
    });
    expect(createResponse.ok()).toBeTruthy();

    // Step 2: Update event
    const updateResponse = await adminRequest.post("/api/tools/events", {
      data: {
        sessionId,
        maestroId: "archimede",
        type: "tool:update",
        toolType: "mindmap",
        data: { progress: 50 },
      },
      headers: csrfHeaders,
    });
    expect(updateResponse.ok()).toBeTruthy();

    // Step 3: Complete event
    const completeResponse = await adminRequest.post("/api/tools/events", {
      data: {
        sessionId,
        maestroId: "archimede",
        type: "tool:complete",
        toolType: "mindmap",
        data: {
          content: { centralTopic: "Test", nodes: [] },
        },
      },
      headers: csrfHeaders,
    });
    expect(completeResponse.ok()).toBeTruthy();
  });
});

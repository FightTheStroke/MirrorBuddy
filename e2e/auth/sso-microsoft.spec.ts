/**
 * E2E: Microsoft SSO Flow
 * Tests SSO initiation and callback handling with mocked OIDC responses
 */

import { test, expect } from "../fixtures/base-fixtures";

test.describe("Microsoft SSO", () => {
  test("SSO initiation endpoint returns redirect", async ({ request }) => {
    const response = await request.get("/api/auth/sso/microsoft", {
      maxRedirects: 0,
    });
    // Should redirect to Microsoft authorization URL
    // In test env without config, expect error redirect
    expect([302, 307, 308]).toContain(response.status());
  });

  test("SSO callback rejects missing code parameter", async ({ request }) => {
    const response = await request.get("/api/auth/sso/microsoft/callback", {
      maxRedirects: 0,
    });
    expect([302, 307, 308]).toContain(response.status());
    const location = response.headers()["location"] || "";
    expect(location).toContain("error=sso_invalid");
  });

  test("SSO callback rejects invalid state", async ({ request }) => {
    const response = await request.get(
      "/api/auth/sso/microsoft/callback?code=test&state=invalid",
      { maxRedirects: 0 },
    );
    expect([302, 307, 308]).toContain(response.status());
    const location = response.headers()["location"] || "";
    expect(location).toContain("error=sso_expired");
  });

  test("SSO callback handles OAuth error", async ({ request }) => {
    const response = await request.get(
      "/api/auth/sso/microsoft/callback?error=access_denied&error_description=User+cancelled",
      { maxRedirects: 0 },
    );
    expect([302, 307, 308]).toContain(response.status());
    const location = response.headers()["location"] || "";
    expect(location).toContain("error=sso_denied");
  });
});

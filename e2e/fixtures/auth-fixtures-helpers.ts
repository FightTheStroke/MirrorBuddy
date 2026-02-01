/**
 * Auth Fixtures Helper Functions and Storage State Generators
 *
 * Provides utility functions for creating and signing test sessions,
 * and generating storage state objects for different test scenarios.
 *
 * F-11: Credenziali da .env - Uses ADMIN_EMAIL and ADMIN_PASSWORD from environment
 */

import { createHmac } from "crypto";
import { config } from "dotenv";

// Load .env so we can read SESSION_SECRET
config();

// Use the actual SESSION_SECRET from environment (matches running dev server).
// Falls back to E2E test secret when Playwright starts its own server.
const SESSION_SECRET =
  process.env.SESSION_SECRET || "e2e-test-session-secret-32-characters-min";

/**
 * Sign cookie value for E2E tests (matches src/lib/auth/cookie-signing.ts)
 */
export function signCookieValue(value: string): string {
  const hmac = createHmac("sha256", SESSION_SECRET);
  hmac.update(value);
  const signature = hmac.digest("hex");
  return `${value}.${signature}`;
}

/**
 * Create storage state for trial mode (anonymous, no auth)
 * Bypasses wall components via localStorage
 */
export function getTrialStorageState() {
  return {
    cookies: [
      {
        // Accessibility settings bypass (ADR 0060)
        name: "mirrorbuddy-a11y",
        value: encodeURIComponent(
          JSON.stringify({
            version: "1",
            activeProfile: null,
            overrides: {},
            browserDetectedApplied: true,
          }),
        ),
        domain: "localhost",
        path: "/",
        expires: -1,
        httpOnly: false,
        secure: false,
        sameSite: "Lax" as const,
      },
    ],
    origins: [
      {
        origin: "http://localhost:3000",
        localStorage: [
          {
            name: "mirrorbuddy-onboarding",
            value: JSON.stringify({
              state: {
                hasCompletedOnboarding: true,
                onboardingCompletedAt: new Date().toISOString(),
                currentStep: "ready",
                isReplayMode: false,
                data: {
                  name: "Trial User",
                  age: 15,
                  schoolLevel: "media",
                  learningDifferences: [],
                  gender: "other",
                },
              },
              version: 0,
            }),
          },
          {
            name: "mirrorbuddy-consent",
            value: JSON.stringify({
              version: "1.0",
              acceptedAt: new Date().toISOString(),
              essential: true,
              analytics: false,
              marketing: false,
            }),
          },
        ],
      },
    ],
  };
}

/**
 * Create storage state for admin mode (authenticated)
 * F-11: Uses credentials from .env (ADMIN_EMAIL, ADMIN_PASSWORD)
 */
export function getAdminStorageState() {
  // Extract admin credentials from environment
  const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";

  // Create a test session ID (in real scenario, this would come from login)
  // Add random component to prevent collision when parallel workers start at same millisecond
  const randomSuffix = crypto.randomUUID().replace(/-/g, "").substring(0, 9);
  const adminSessionId = `admin-test-session-${Date.now()}-${randomSuffix}`;

  // Sign the admin session cookie
  const signedCookie = signCookieValue(adminSessionId);

  return {
    cookies: [
      {
        // Server-side auth cookie (signed)
        name: "mirrorbuddy-user-id",
        value: signedCookie,
        domain: "localhost",
        path: "/",
        expires: -1,
        httpOnly: true,
        secure: false,
        sameSite: "Lax" as const,
      },
      {
        // Client-readable cookie (not signed, for JS access)
        name: "mirrorbuddy-user-id-client",
        value: adminSessionId,
        domain: "localhost",
        path: "/",
        expires: -1,
        httpOnly: false,
        secure: false,
        sameSite: "Lax" as const,
      },
      {
        // Admin flag cookie
        name: "mirrorbuddy-admin",
        value: adminEmail,
        domain: "localhost",
        path: "/",
        expires: -1,
        httpOnly: false,
        secure: false,
        sameSite: "Lax" as const,
      },
      {
        // Accessibility settings bypass (ADR 0060)
        name: "mirrorbuddy-a11y",
        value: encodeURIComponent(
          JSON.stringify({
            version: "1",
            activeProfile: null,
            overrides: {},
            browserDetectedApplied: true,
          }),
        ),
        domain: "localhost",
        path: "/",
        expires: -1,
        httpOnly: false,
        secure: false,
        sameSite: "Lax" as const,
      },
    ],
    origins: [
      {
        origin: "http://localhost:3000",
        localStorage: [
          {
            name: "mirrorbuddy-onboarding",
            value: JSON.stringify({
              state: {
                hasCompletedOnboarding: true,
                onboardingCompletedAt: new Date().toISOString(),
                currentStep: "ready",
                isReplayMode: false,
                data: {
                  name: "Admin User",
                  age: 35,
                  schoolLevel: "high",
                  learningDifferences: [],
                  gender: "other",
                },
              },
              version: 0,
            }),
          },
          {
            name: "mirrorbuddy-consent",
            value: JSON.stringify({
              version: "1.0",
              acceptedAt: new Date().toISOString(),
              essential: true,
              analytics: true,
              marketing: false,
            }),
          },
          {
            name: "mirrorbuddy-admin-user",
            value: adminEmail,
          },
        ],
      },
    ],
  };
}

/**
 * E2E Test Fixtures for Trial and Admin Authentication
 *
 * Provides Playwright test fixtures for:
 * - Trial mode: Anonymous session with wall bypasses (cookie consent, onboarding)
 * - Admin mode: Authenticated admin user from .env credentials
 *
 * F-11: Credenziali da .env - Uses ADMIN_EMAIL and ADMIN_PASSWORD from environment
 */

/* eslint-disable react-hooks/rules-of-hooks */
// Note: 'use' is a Playwright fixture callback, not React's use hook
import { test as base, expect } from "./base-fixtures";
import type { Page } from "@playwright/test";
import {
  signCookieValue,
  getTrialStorageState,
  getAdminStorageState,
} from "./auth-fixtures-helpers";

import type { APIRequestContext } from "@playwright/test";

interface AuthFixtures {
  trialPage: Page;
  adminPage: Page;
  adminRequest: APIRequestContext;
}

/**
 * Trial fixture - Anonymous user with wall bypasses
 * No authentication, just localStorage setup to skip onboarding/consent walls
 * Includes /api/tos mock to bypass TosGateProvider blocking (F-03: ADR 0059)
 */
async function trialFixture(
  { page }: { page: Page },
  use: (value: Page) => Promise<void>,
) {
  // Wall bypasses (TOS mock, consent cookie/localStorage) are handled
  // by base-fixtures.ts automatically via the page fixture chain.

  // Set additional storage state before navigation
  await page.context().addInitScript(() => {
    // Inline localStorage setup to run before page loads
    localStorage.setItem(
      "mirrorbuddy-onboarding",
      JSON.stringify({
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
    );
  });

  // Add cookies for accessibility
  await page.context().addCookies([
    {
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
      expires: Math.floor(Date.now() / 1000) + 86400 * 90,
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
  ]);

  // Use the page for the test
  await use(page);
}

/**
 * Admin fixture - Authenticated admin user with all wall bypasses
 * F-11: Uses ADMIN_EMAIL and ADMIN_PASSWORD from .env
 * Includes /api/tos mock to bypass TosGateProvider (ADR 0059)
 *
 * IMPORTANT: page.request shares cookies with the browser context,
 * but cookies must be added to the context BEFORE the page is used.
 */
async function adminFixture(
  { page }: { page: Page },
  use: (value: Page) => Promise<void>,
) {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
  // Add random component to prevent collision when parallel workers start at same millisecond
  // Using crypto.randomUUID() for cryptographically secure randomness (CodeQL requirement)
  const randomSuffix = crypto.randomUUID().replace(/-/g, "").substring(0, 9);
  const adminSessionId = `admin-test-session-${Date.now()}-${randomSuffix}`;
  const signedCookie = signCookieValue(adminSessionId);

  // Add authentication and accessibility cookies FIRST
  // This ensures page.request will use these cookies for API calls
  await page.context().addCookies([
    {
      name: "mirrorbuddy-user-id",
      value: signedCookie,
      domain: "localhost",
      path: "/",
      expires: Math.floor(Date.now() / 1000) + 3600 * 24,
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
    {
      name: "mirrorbuddy-user-id-client",
      value: adminSessionId,
      domain: "localhost",
      path: "/",
      expires: Math.floor(Date.now() / 1000) + 3600 * 24,
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
    {
      name: "mirrorbuddy-admin",
      value: adminEmail,
      domain: "localhost",
      path: "/",
      expires: Math.floor(Date.now() / 1000) + 3600 * 24,
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
    {
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
      expires: Math.floor(Date.now() / 1000) + 86400 * 90,
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
  ]);

  // Set storage state after cookies (for localStorage access)
  await page.context().addInitScript(() => {
    // Inline localStorage setup
    localStorage.setItem(
      "mirrorbuddy-onboarding",
      JSON.stringify({
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
    );

    localStorage.setItem(
      "mirrorbuddy-consent",
      JSON.stringify({
        version: "1.0",
        acceptedAt: new Date().toISOString(),
        essential: true,
        analytics: true,
        marketing: false,
      }),
    );

    localStorage.setItem("mirrorbuddy-admin-user", adminEmail);
  });

  // Use the page for the test
  await use(page);
}

/**
 * Admin request fixture - APIRequestContext with admin authentication
 * Solves the issue where page.request doesn't reliably share httpOnly cookies
 *
 * Usage:
 *   test("example", async ({ adminRequest }) => {
 *     const response = await adminRequest.get("/api/admin/key-vault");
 *   });
 */
async function adminRequestFixture(
  { playwright }: { playwright: typeof import("@playwright/test") },
  use: (value: APIRequestContext) => Promise<void>,
) {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
  const randomSuffix = crypto.randomUUID().replace(/-/g, "").substring(0, 9);
  const adminSessionId = `admin-test-session-${Date.now()}-${randomSuffix}`;
  const signedCookie = signCookieValue(adminSessionId);

  // Create APIRequestContext with admin cookies in storage state
  const context = await playwright.request.newContext({
    baseURL: "http://localhost:3000",
    extraHTTPHeaders: {
      // Set cookies via Cookie header (more reliable than storage state for API requests)
      Cookie: [
        `mirrorbuddy-user-id=${signedCookie}`,
        `mirrorbuddy-user-id-client=${adminSessionId}`,
        `mirrorbuddy-admin=${adminEmail}`,
      ].join("; "),
    },
  });

  await use(context);
  await context.dispose();
}

/**
 * Extended test with both trial and admin fixtures
 */
export const test = base.extend<AuthFixtures>({
  trialPage: trialFixture,
  adminPage: adminFixture,
  adminRequest: adminRequestFixture,
});

export { expect };

/**
 * Export storage state generators for use in global setup or other contexts
 */
export { getTrialStorageState, getAdminStorageState };

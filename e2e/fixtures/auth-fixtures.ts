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
import { test as base, expect, Page } from "@playwright/test";
import {
  signCookieValue,
  getTrialStorageState,
  getAdminStorageState,
} from "./auth-fixtures-helpers";

interface AuthFixtures {
  trialPage: Page;
  adminPage: Page;
}

/**
 * Trial fixture - Anonymous user with wall bypasses
 * No authentication, just localStorage setup to skip onboarding/consent walls
 */
async function trialFixture(
  { page }: { page: Page },
  use: (value: Page) => Promise<void>,
) {
  // Set storage state before navigation
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

    localStorage.setItem(
      "mirrorbuddy-consent",
      JSON.stringify({
        version: "1.0",
        acceptedAt: new Date().toISOString(),
        essential: true,
        analytics: false,
        marketing: false,
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
 */
async function adminFixture(
  { page }: { page: Page },
  use: (value: Page) => Promise<void>,
) {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
  const adminSessionId = "admin-test-session-" + Date.now();
  const signedCookie = signCookieValue(adminSessionId);

  // Set storage state before navigation
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

  // Add authentication and accessibility cookies
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

  // Use the page for the test
  await use(page);
}

/**
 * Extended test with both trial and admin fixtures
 */
export const test = base.extend<AuthFixtures>({
  trialPage: trialFixture,
  adminPage: adminFixture,
});

export { expect };

/**
 * Export storage state generators for use in global setup or other contexts
 */
export { getTrialStorageState, getAdminStorageState };

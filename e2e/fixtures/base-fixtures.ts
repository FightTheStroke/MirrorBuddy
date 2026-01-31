/**
 * Base E2E Test Fixtures
 *
 * Extends Playwright's test to automatically apply wall bypasses
 * required by ALL E2E tests:
 * - /api/tos mock (ADR 0059) - prevents TosGateProvider modal blocking
 * - Cookie consent localStorage - prevents CookieConsentWall
 * - Trial consent cookie - prevents TrialConsentGate blocking
 *
 * ALL E2E spec files MUST import test/expect from this file (or from
 * fixtures that chain from it). Direct import from @playwright/test
 * is blocked by ESLint rule `require-e2e-fixtures`.
 *
 * @example
 * ```typescript
 * import { test, expect } from './fixtures/base-fixtures';
 * // or
 * import { test, expect } from './fixtures';
 * ```
 */

/* eslint-disable react-hooks/rules-of-hooks */
// Note: 'use' is a Playwright fixture callback, not React's use hook

import { randomUUID } from "crypto";
import { test as base, expect } from "@playwright/test";

/**
 * Base test with automatic wall bypasses.
 *
 * Mocks /api/tos and sets consent cookies/localStorage before each test.
 * This prevents TosGateProvider, CookieConsentWall, and TrialConsentGate
 * from blocking test interactions.
 */
export const test = base.extend({
  page: async ({ page, context }, use) => {
    const visitorId = `e2e-visitor-${Date.now()}-${randomUUID()
      .replace(/-/g, "")
      .slice(0, 8)}`;

    // ADR 0059: Mock ToS API to bypass TosGateProvider
    // Without this, TosGateProvider calls GET /api/tos, receives
    // {accepted: false}, shows modal overlay, blocks pointer events.
    await page.route("**/api/tos", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ accepted: true, version: "1.0" }),
      });
    });

    // Bypass CookieConsentWall via localStorage
    await context.addInitScript(() => {
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

    // Bypass TrialConsentGate via cookie
    await context.addCookies([
      {
        name: "mirrorbuddy-trial-consent",
        value: encodeURIComponent(
          JSON.stringify({
            accepted: true,
            version: "1.0",
            acceptedAt: new Date().toISOString(),
          }),
        ),
        domain: "localhost",
        path: "/",
        sameSite: "Lax",
      },
      {
        // Override visitor cookie per run to avoid DB unique collisions in CI
        name: "mirrorbuddy-visitor-id",
        value: visitorId,
        domain: "localhost",
        path: "/",
        sameSite: "Lax",
      },
    ]);

    // Mock trial session API to avoid Prisma unique constraint collisions
    await page.route("**/api/trial/session", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          sessionId: "e2e-mocked-session",
          visitorId,
          ipHash: "mocked-ip-hash",
          createdAt: new Date().toISOString(),
          limits: { chat: 10, voiceSeconds: 300, tools: 10, docs: 1 },
        }),
      });
    });

    // Mock accessibility settings API used by quick panel to ensure panel renders
    await page.route("**/api/accessibility/settings", (route) => {
      if (route.request().method() === "GET") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "e2e-a11y-settings",
            userId: "e2e-a11y-user",
            dyslexiaFont: false,
            extraLetterSpacing: false,
            increasedLineHeight: false,
            highContrast: false,
            largeText: false,
            reducedMotion: false,
            ttsEnabled: false,
            ttsSpeed: 1,
            ttsAutoRead: false,
            adhdMode: false,
            distractionFreeMode: false,
            breakReminders: false,
            lineSpacing: "normal",
            fontSize: "md",
            colorBlindMode: "none",
            keyboardNavigation: true,
            adaptiveVadEnabled: false,
            customBackgroundColor: null,
            customTextColor: null,
            adhdConfig: {},
            adhdStats: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: "{}",
        });
      }
    });

    await use(page);
  },
});

export { expect };

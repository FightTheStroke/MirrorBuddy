/**
 * A11y Testing Fixtures for E2E Tests
 *
 * Chains from base-fixtures.ts to inherit all wall bypasses
 * (TOS mock, consent cookies, visitor ID, accessibility API mocks).
 * Adds a11y-specific setup: NEXT_LOCALE cookie, mirrorbuddy-a11y cookie.
 *
 * Usage:
 * ```typescript
 * import { test, expect, toLocalePath } from './fixtures/a11y-fixtures';
 * ```
 */

/* eslint-disable react-hooks/rules-of-hooks */
// Note: 'use' is a Playwright fixture callback, not React's use hook

import { test as base, expect } from "./base-fixtures";
import type { Locale } from "@/i18n/config";

const DEFAULT_LOCALE: Locale = "it";

export const toLocalePath = (path: string, locale: Locale = DEFAULT_LOCALE) => {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (cleanPath === "/") {
    return `/${locale}`;
  }
  return `/${locale}${cleanPath}`;
};

/**
 * Extend base test with a11y-specific cookies.
 * Wall bypasses (TOS mock, consent, visitor ID, a11y API mocks)
 * are inherited from base-fixtures.ts automatically.
 */
export const test = base.extend({
  page: async ({ page, context }, use) => {
    // Add a11y-specific cookies on top of base-fixtures setup
    await context.addCookies([
      {
        name: "NEXT_LOCALE",
        value: DEFAULT_LOCALE,
        domain: "localhost",
        path: "/",
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
        sameSite: "Lax",
      },
    ]);

    await use(page);
  },
});

export { expect };

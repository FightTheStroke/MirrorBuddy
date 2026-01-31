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
 * A11y test fixture extending base-fixtures.
 *
 * Base-fixtures already provides: TOS mock, consent localStorage,
 * trial consent cookie, visitor cookie, trial session mock,
 * accessibility settings API mocks.
 *
 * This adds a11y-specific cookies: NEXT_LOCALE and mirrorbuddy-a11y.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.context().addCookies([
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

test.use({ storageState: undefined });

export { expect };

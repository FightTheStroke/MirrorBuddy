/* eslint-disable react-hooks/rules-of-hooks */
// Note: 'use' is a Playwright fixture callback, not React's use hook
import { test as base, expect, type Page } from "@playwright/test";
import type { Locale } from "@/i18n/config";

const DEFAULT_LOCALE: Locale = "it";

export const toLocalePath = (path: string, locale: Locale = DEFAULT_LOCALE) => {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (cleanPath === "/") {
    return `/${locale}`;
  }
  return `/${locale}${cleanPath}`;
};

const buildTrialConsentValue = () =>
  encodeURIComponent(
    JSON.stringify({
      accepted: true,
      version: "1.0",
      acceptedAt: new Date().toISOString(),
    }),
  );

const setupA11yPage = async (page: Page) => {
  await page.route("**/api/tos", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ accepted: true, version: "1.0" }),
    });
  });

  await page.context().addInitScript(() => {
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

  await page.context().addCookies([
    {
      name: "mirrorbuddy-trial-consent",
      value: buildTrialConsentValue(),
      domain: "localhost",
      path: "/",
      sameSite: "Lax",
    },
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
};

export const test = base.extend({
  page: async ({ page }, use) => {
    await setupA11yPage(page);
    await use(page);
  },
});

test.use({ storageState: undefined });

export { expect };

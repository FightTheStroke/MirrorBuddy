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

/**
 * Open the a11y quick panel reliably in CI.
 *
 * SSR renders the floating button before React hydrates the onClick handler.
 * A single click may fire before hydration completes, leaving the panel closed.
 * This helper retries the click once if the panel doesn't appear promptly.
 */
export async function openA11yPanel(page: import("@playwright/test").Page) {
  const button = page.locator('[data-testid="a11y-floating-button"]');
  await expect(button).toBeVisible({ timeout: 20000 });

  const panel = page.locator('[data-testid="a11y-quick-panel"]');

  const clickAndWait = async (timeoutMs: number) => {
    await button.click();
    return panel
      .waitFor({ state: "visible", timeout: timeoutMs })
      .then(() => true)
      .catch(() => false);
  };

  // First attempt: wait 3s for panel. If not visible, click again (hydration lag).
  let appeared = await clickAndWait(5000);
  if (!appeared) {
    await page.waitForTimeout(1000);
    appeared = await clickAndWait(20000);
  }

  if (!appeared) {
    await page.waitForLoadState("domcontentloaded");
    appeared = await clickAndWait(60000);
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const expanded = await button.getAttribute("aria-expanded");
    if (expanded === "true") {
      break;
    }
    await button.click();
    await page.waitForTimeout(1000);
  }

  await expect(button).toHaveAttribute("aria-expanded", "true", {
    timeout: 60000,
  });
  await expect(panel).toBeVisible({ timeout: 60000 });

  return { button, panel };
}

export { expect };

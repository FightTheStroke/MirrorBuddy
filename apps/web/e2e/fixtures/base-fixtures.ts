/**
 * Base E2E Test Fixtures
 *
 * Extends Playwright's test to automatically apply wall bypasses
 * required by ALL E2E tests (all three checks now live in
 * UnifiedConsentWall, components/consent/unified-consent-wall.tsx):
 * - /api/tos mock (ADR 0059) - prevents the ToS modal blocking
 * - Cookie consent localStorage - prevents the cookie consent wall
 * - Trial consent cookie - prevents the trial consent gate blocking
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

import { randomUUID } from 'crypto';
import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import {
  mockTOS,
  mockConsentStorage,
  mockTrialConsentCookie,
  mockTrialSession,
  mockAccessibilitySettings,
  setVisitorCookie,
} from './api-mocks';

/**
 * Base test with automatic wall bypasses.
 *
 * Mocks /api/tos and sets consent cookies/localStorage before each test.
 * This prevents UnifiedConsentWall's ToS/cookie/trial-consent checks
 * from blocking test interactions.
 */
export interface BaseFixtures {
  /** A page in the state a first-time visitor is actually in. */
  signedOutPage: Page;
}

export const test = base.extend<BaseFixtures>({
  page: async ({ page, context }, use) => {
    const runSuffix = randomUUID().replace(/-/g, '').slice(0, 8);
    const visitorId = `e2e-visitor-${Date.now()}-${runSuffix}`;
    const a11yUserId = `e2e-a11y-user-${Date.now()}-${runSuffix}`;

    // ADR 0059: Bypass all consent walls
    await mockTOS(page);
    await mockConsentStorage(context);
    await mockTrialConsentCookie(context);
    await setVisitorCookie(context, visitorId);
    await mockTrialSession(page, visitorId);
    await mockAccessibilitySettings(page, a11yUserId, `e2e-a11y-settings-${runSuffix}`);

    await use(page);
  },

  /**
   * A page with none of the bypasses above: no cookies, no session, no mocked
   * consent. This is the state a first-time visitor is actually in.
   *
   * Every other fixture hands the app a visitor cookie and a trial session, so
   * nothing in the suite had ever loaded a page the way a stranger does — which
   * is how four requests that only an account can satisfy kept firing on the
   * home page, each one printed by the browser as a failed request.
   *
   * Use it to observe, not to interact: the consent wall is not bypassed here,
   * because for a stranger the wall is part of the truth.
   */
  signedOutPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect };

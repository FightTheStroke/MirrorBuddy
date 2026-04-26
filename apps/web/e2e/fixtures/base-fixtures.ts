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

import { randomUUID } from 'crypto';
import { test as base, expect } from '@playwright/test';
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
 * This prevents TosGateProvider, CookieConsentWall, and TrialConsentGate
 * from blocking test interactions.
 */
export const test = base.extend({
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
});

export { expect };

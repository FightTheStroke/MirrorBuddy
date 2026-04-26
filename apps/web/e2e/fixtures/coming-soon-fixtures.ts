/**
 * Coming Soon E2E Test Fixtures
 *
 * Extends base-fixtures to add helpers for the coming-soon feature flag tests.
 * Mocks:
 * - /api/admin/feature-flags (GET) to control coming_soon_overlay flag state
 * - /api/waitlist/signup (POST) for form submission tests
 *
 * Usage:
 * ```typescript
 * import { test, expect } from './fixtures/coming-soon-fixtures';
 *
 * test('flag enabled', async ({ pageWithFlagEnabled }) => { ... });
 * test('flag disabled', async ({ pageWithFlagDisabled }) => { ... });
 * ```
 */

/* eslint-disable react-hooks/rules-of-hooks */
// Note: 'use' is a Playwright fixture callback, not React's use hook

import { test as base, expect } from './base-fixtures';
import type { Page } from '@playwright/test';

/** Feature flag state for coming_soon_overlay */
export type ComingSoonFlagState = 'enabled' | 'disabled';

/** Minimal mock response shape for the feature flags API */
function buildFlagResponse(state: ComingSoonFlagState) {
  const isEnabled = state === 'enabled';
  return {
    flags: [
      {
        id: 'coming_soon_overlay',
        name: 'Coming Soon Overlay',
        description: 'Show coming soon overlay with waitlist signup form',
        status: isEnabled ? 'enabled' : 'disabled',
        enabledPercentage: 100,
        killSwitch: false,
        updatedAt: new Date().toISOString(),
      },
    ],
    globalKillSwitch: false,
    timestamp: new Date().toISOString(),
  };
}

/** Mock the waitlist signup endpoint to return 201 success */
async function mockWaitlistSignup(page: Page): Promise<void> {
  await page.route('**/api/waitlist/signup', (route) => {
    if (route.request().method() === 'POST') {
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'You have been added to the waitlist',
          position: 42,
        }),
      });
    } else {
      route.fallback();
    }
  });
}

/** Mock the admin feature flags API with the given flag state */
async function mockFeatureFlagApi(page: Page, state: ComingSoonFlagState): Promise<void> {
  await page.route('**/api/admin/feature-flags**', (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildFlagResponse(state)),
      });
    } else {
      route.fallback();
    }
  });
}

interface ComingSoonFixtures {
  /** Anonymous page with coming_soon_overlay flag ENABLED */
  pageWithFlagEnabled: Page;
  /** Anonymous page with coming_soon_overlay flag DISABLED */
  pageWithFlagDisabled: Page;
  /** Page with waitlist signup API mocked to return success */
  pageWithWaitlistMock: Page;
}

export const test = base.extend<ComingSoonFixtures>({
  pageWithFlagEnabled: async ({ page }, use) => {
    await mockFeatureFlagApi(page, 'enabled');
    await mockWaitlistSignup(page);
    await use(page);
  },

  pageWithFlagDisabled: async ({ page }, use) => {
    await mockFeatureFlagApi(page, 'disabled');
    await use(page);
  },

  pageWithWaitlistMock: async ({ page }, use) => {
    await mockFeatureFlagApi(page, 'enabled');
    await mockWaitlistSignup(page);
    await use(page);
  },
});

export { expect };
export { mockWaitlistSignup, mockFeatureFlagApi };

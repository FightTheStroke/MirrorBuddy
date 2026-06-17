/**
 * E2E Tests: Trial Child-Space Guardrails (COMP-01)
 *
 * The home is the CHILD space. Trial quota dashboards, percentages and
 * "request access" CTAs are adult account/commercial surfaces: they must
 * never render alongside the child learning flow, regardless of the
 * accessibility profile (distractionFreeMode is an extra layer, not the
 * barrier). The adult keeps them in the "for grown-ups" sidebar group and
 * in the parent area.
 *
 * Replaces the former "Trial Header Badge (F-05)" spec: the badge
 * ("Prova 7/10" linking to /invite/request) was removed from the child
 * header (focus group FG-10 + GDPR/COPPA: no commercial CTA or PII
 * solicitation directed at a minor).
 *
 * Run: npx playwright test e2e/trial-dashboard.spec.ts
 */

import { test, expect } from './fixtures/auth-fixtures';

// IMPORTANT: These tests check trial mode (unauthenticated)
// Override global storageState to start without authentication
test.use({ storageState: undefined });

test.describe('Trial Mode - Child-Space Guardrails (COMP-01)', () => {
  // Large screen: the old badge and the usage-dashboard aside only rendered on lg+.
  test.use({ viewport: { width: 1920, height: 1080 } });
  test.setTimeout(60000);

  async function setupTrialMocks(
    page: typeof test.trialPage,
    trialData: Partial<{
      chatsUsed: number;
      chatsRemaining: number;
      maxChats: number;
      voiceSecondsUsed: number;
      voiceSecondsRemaining: number;
      maxVoiceSeconds: number;
      toolsUsed: number;
      toolsRemaining: number;
      maxTools: number;
      docsUsed: number;
      maxDocs: number;
    }> = {},
  ) {
    const defaults = {
      chatsUsed: 0,
      chatsRemaining: 10,
      maxChats: 10,
      voiceSecondsUsed: 0,
      voiceSecondsRemaining: 300,
      maxVoiceSeconds: 300,
      toolsUsed: 0,
      toolsRemaining: 10,
      maxTools: 10,
      docsUsed: 0,
      maxDocs: 5,
      ...trialData,
    };

    // Identify as trial user
    await page.route('**/api/user/trial-status', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ isTrialUser: true }),
      });
    });

    // Provide trial session data
    await page.route('**/api/trial/session', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(defaults),
      });
    });

    // Provide usage data
    await page.route('**/api/user/usage', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          chat: {
            used: defaults.chatsUsed,
            limit: defaults.maxChats,
            percentage: (defaults.chatsUsed / defaults.maxChats) * 100,
          },
          voice: {
            used: defaults.voiceSecondsUsed,
            limit: defaults.maxVoiceSeconds,
            percentage: (defaults.voiceSecondsUsed / defaults.maxVoiceSeconds) * 100,
          },
          tools: {
            used: defaults.toolsUsed,
            limit: defaults.maxTools,
            percentage: (defaults.toolsUsed / defaults.maxTools) * 100,
          },
          docs: {
            used: defaults.docsUsed,
            limit: defaults.maxDocs,
            percentage: (defaults.docsUsed / defaults.maxDocs) * 100,
          },
        }),
      });
    });

    // Mock onboarding API - hydrateFromApi() calls /api/onboarding
    await page.route('**/api/onboarding', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          onboardingState: {
            hasCompletedOnboarding: true,
            onboardingCompletedAt: new Date().toISOString(),
            currentStep: 'ready',
            isReplayMode: false,
          },
          hasExistingData: true,
          data: {
            name: 'Trial User',
            age: 15,
            schoolLevel: 'media',
            learningDifferences: [],
            gender: 'other',
          },
        }),
      });
    });

    // Mock ToS API call
    await page.route('**/api/tos', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ accepted: true, version: '1.0' }),
      });
    });
  }

  test('child home header has no trial badge and no invite link', async ({ trialPage }) => {
    await setupTrialMocks(trialPage, { chatsUsed: 3, chatsRemaining: 7, maxChats: 10 });

    await trialPage.goto('/it');
    await trialPage.waitForLoadState('domcontentloaded');

    // The intent home (child space) is rendered.
    await expect(trialPage.getByTestId('intent-card-homework')).toBeVisible({ timeout: 15000 });

    // The old commercial badge is gone for good.
    await expect(trialPage.locator('[data-testid="trial-badge"]')).toHaveCount(0);

    // No header link to the PII-collecting invite-request form.
    const headerInviteLinks = trialPage.locator('header a[href*="invite"]');
    await expect(headerInviteLinks).toHaveCount(0);
  });

  test('trial usage dashboard never renders next to the child learning flow', async ({
    trialPage,
  }) => {
    // Default profile (NOT distraction-free): the guardrail must hold anyway.
    await setupTrialMocks(trialPage, { chatsUsed: 9, chatsRemaining: 1, maxChats: 10 });

    await trialPage.goto('/it');
    await trialPage.waitForLoadState('domcontentloaded');

    await expect(trialPage.getByTestId('intent-card-homework')).toBeVisible({ timeout: 15000 });
    await expect(trialPage.getByTestId('trial-usage-dashboard')).toHaveCount(0);
  });

  test('invite/login CTAs live only inside the grown-ups sidebar group', async ({ trialPage }) => {
    await setupTrialMocks(trialPage);

    await trialPage.goto('/it');
    await trialPage.waitForLoadState('domcontentloaded');

    await expect(trialPage.getByTestId('intent-card-homework')).toBeVisible({ timeout: 15000 });

    // The adult flow is preserved: trial status + request access exist…
    const grownUpsTrialBlock = trialPage.getByTestId('sidebar-trial-grownups');
    await expect(grownUpsTrialBlock).toBeVisible();

    // …but every invite link on the page sits inside the grown-ups group.
    const allInviteLinks = trialPage.locator('a[href*="invite"]');
    const groupedInviteLinks = trialPage.locator(
      '[data-testid="sidebar-grownups-group"] a[href*="invite"]',
    );
    expect(await allInviteLinks.count()).toBe(await groupedInviteLinks.count());
    expect(await groupedInviteLinks.count()).toBeGreaterThan(0);
  });

  test('trial surfaces are absent for authenticated users', async ({ trialPage }) => {
    // Mock as non-trial user (authenticated)
    await trialPage.route('**/api/user/trial-status', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ isTrialUser: false }),
      });
    });

    await trialPage.route('**/api/onboarding', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          onboardingState: {
            hasCompletedOnboarding: true,
            onboardingCompletedAt: new Date().toISOString(),
            currentStep: 'ready',
            isReplayMode: false,
          },
          hasExistingData: true,
          data: {
            name: 'Test User',
            age: 15,
            schoolLevel: 'media',
            learningDifferences: [],
            gender: 'other',
          },
        }),
      });
    });

    await trialPage.route('**/api/tos', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ accepted: true, version: '1.0' }),
      });
    });

    await trialPage.goto('/it');
    await trialPage.waitForLoadState('domcontentloaded');
    await trialPage.waitForTimeout(3000);

    await expect(trialPage.locator('[data-testid="trial-badge"]')).toHaveCount(0);
    await expect(trialPage.getByTestId('sidebar-trial-grownups')).toHaveCount(0);
    await expect(trialPage.getByTestId('trial-usage-dashboard')).toHaveCount(0);
  });
});

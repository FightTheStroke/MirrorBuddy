/**
 * E2E Tests: Trial Header Badge
 *
 * Tests for trial mode header badge displaying usage statistics.
 * F-05: Verify badge displays chat count correctly
 *
 * The locale home header renders trial status as a Link element
 * with localized text and chat count (not a dropdown button).
 *
 * Run: npx playwright test e2e/trial-dashboard.spec.ts
 */

import { test, expect } from "./fixtures/auth-fixtures";

// IMPORTANT: These tests check trial mode (unauthenticated)
// Override global storageState to start without authentication
test.use({ storageState: undefined });

test.describe("Trial Mode - Header Badge (F-05)", () => {
  // Set viewport to large screen size (trial badge is hidden on md:)
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
    await page.route("**/api/user/trial-status", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ isTrialUser: true }),
      });
    });

    // Provide trial session data
    await page.route("**/api/trial/session", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(defaults),
      });
    });

    // Provide usage data
    await page.route("**/api/user/usage", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          chat: {
            used: defaults.chatsUsed,
            limit: defaults.maxChats,
            percentage: (defaults.chatsUsed / defaults.maxChats) * 100,
          },
          voice: {
            used: defaults.voiceSecondsUsed,
            limit: defaults.maxVoiceSeconds,
            percentage:
              (defaults.voiceSecondsUsed / defaults.maxVoiceSeconds) * 100,
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

    // Mock onboarding API - IMPORTANT: hydrateFromApi() calls /api/onboarding (not /api/user/onboarding)
    // This mock prevents redirect to /welcome by reporting onboarding as completed
    await page.route("**/api/onboarding", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          onboardingState: {
            hasCompletedOnboarding: true,
            onboardingCompletedAt: new Date().toISOString(),
            currentStep: "ready",
            isReplayMode: false,
          },
          hasExistingData: true,
          data: {
            name: "Trial User",
            age: 15,
            schoolLevel: "media",
            learningDifferences: [],
            gender: "other",
          },
        }),
      });
    });

    // Mock ToS API call
    await page.route("**/api/tos", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ accepted: true, version: "1.0" }),
      });
    });
  }

  test("trial badge is visible in header for trial users", async ({
    trialPage,
  }) => {
    await setupTrialMocks(trialPage, {
      chatsUsed: 3,
      chatsRemaining: 7,
      maxChats: 10,
    });

    // Navigate to locale home page (not "/" which redirects to /landing → /welcome)
    await trialPage.goto("/it");
    await trialPage.waitForLoadState("domcontentloaded");

    // Trial badge is a Link with data-testid in the locale header
    const trialBadge = trialPage.locator('[data-testid="trial-badge"]');
    await expect(trialBadge).toBeVisible({ timeout: 15000 });

    // Verify it shows chat count
    await expect(trialBadge).toContainText("7/10");
  });

  test("trial badge shows correct chat remaining count", async ({
    trialPage,
  }) => {
    await setupTrialMocks(trialPage, {
      chatsUsed: 5,
      chatsRemaining: 5,
      maxChats: 10,
    });

    await trialPage.goto("/it");
    await trialPage.waitForLoadState("domcontentloaded");

    const trialBadge = trialPage.locator('[data-testid="trial-badge"]');
    await expect(trialBadge).toBeVisible({ timeout: 15000 });
    await expect(trialBadge).toContainText("5/10");
  });

  test("trial badge links to invite request page", async ({ trialPage }) => {
    await setupTrialMocks(trialPage);

    await trialPage.goto("/it");
    await trialPage.waitForLoadState("domcontentloaded");

    const trialBadge = trialPage.locator('[data-testid="trial-badge"]');
    await expect(trialBadge).toBeVisible({ timeout: 15000 });

    // The badge links to /invite/request
    const href = await trialBadge.getAttribute("href");
    expect(href).toContain("/invite/request");
  });

  test("badge changes color when resources are low", async ({ trialPage }) => {
    await setupTrialMocks(trialPage, {
      chatsUsed: 8,
      chatsRemaining: 2,
      maxChats: 10,
    });

    await trialPage.goto("/it");
    await trialPage.waitForLoadState("domcontentloaded");

    const trialBadge = trialPage.locator('[data-testid="trial-badge"]');
    await expect(trialBadge).toBeVisible({ timeout: 15000 });

    // Verify amber color class when low (<=3 remaining)
    await expect(trialBadge).toHaveClass(/amber/);
  });

  test("badge uses purple color when resources are sufficient", async ({
    trialPage,
  }) => {
    await setupTrialMocks(trialPage, {
      chatsUsed: 2,
      chatsRemaining: 8,
      maxChats: 10,
    });

    await trialPage.goto("/it");
    await trialPage.waitForLoadState("domcontentloaded");

    const trialBadge = trialPage.locator('[data-testid="trial-badge"]');
    await expect(trialBadge).toBeVisible({ timeout: 15000 });

    // Verify purple color class when resources are sufficient
    await expect(trialBadge).toHaveClass(/purple/);
  });

  test("trial badge has accessible title attribute", async ({ trialPage }) => {
    await setupTrialMocks(trialPage);

    await trialPage.goto("/it");
    await trialPage.waitForLoadState("domcontentloaded");

    const trialBadge = trialPage.locator('[data-testid="trial-badge"]');
    await expect(trialBadge).toBeVisible({ timeout: 15000 });

    // Badge should have a title attribute for accessibility
    const title = await trialBadge.getAttribute("title");
    expect(title?.length).toBeGreaterThan(0);
  });

  test("trial badge is not visible for authenticated users", async ({
    trialPage,
  }) => {
    // Mock as non-trial user (authenticated)
    await trialPage.route("**/api/user/trial-status", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ isTrialUser: false }),
      });
    });

    // Mock onboarding API - hydrateFromApi() calls /api/onboarding (not /api/user/onboarding)
    await trialPage.route("**/api/onboarding", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          onboardingState: {
            hasCompletedOnboarding: true,
            onboardingCompletedAt: new Date().toISOString(),
            currentStep: "ready",
            isReplayMode: false,
          },
          hasExistingData: true,
          data: {
            name: "Test User",
            age: 15,
            schoolLevel: "media",
            learningDifferences: [],
            gender: "other",
          },
        }),
      });
    });

    await trialPage.route("**/api/tos", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ accepted: true, version: "1.0" }),
      });
    });

    await trialPage.goto("/it");
    await trialPage.waitForLoadState("domcontentloaded");

    // Wait for page to fully hydrate
    await trialPage.waitForTimeout(3000);

    // Trial badge should not be visible for authenticated users
    const trialBadge = trialPage.locator('[data-testid="trial-badge"]');
    await expect(trialBadge).not.toBeVisible();
  });
});

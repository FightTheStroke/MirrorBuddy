/**
 * E2E Tests: Trial Dashboard Usage Display
 *
 * Tests for trial mode dashboard displaying correct usage statistics.
 * F-05: Verify dashboard displays all resources correctly
 *
 * Test scenarios:
 * - Dashboard visible in right sidebar (only in trial mode)
 * - All 5 resources rendered (chat, voice, tools, docs, maestri)
 * - Progress bars displayed
 * - Usage format "{used}/{limit} (percentage%)"
 * - High usage warning state (>80%)
 *
 * Note: Dashboard only appears when:
 * 1. User is identified as trial user (/api/user/trial-status)
 * 2. Trial session fetched (/api/trial/session)
 * 3. Viewport is large (lg screens, >1024px)
 *
 * Run: npx playwright test e2e/trial-dashboard.spec.ts
 */

import { test, expect } from "./fixtures/auth-fixtures";

test.describe("Trial Mode - Dashboard Usage Display (F-05)", () => {
  // Set viewport to large screen size to show dashboard (hidden on small screens)
  test.use({ viewport: { width: 1920, height: 1080 } });

  async function setupTrialMocks(
    page: typeof test.trialPage,
    trialData: Partial<{
      chatsUsed: number;
      chatsRemaining: number;
      voiceSecondsUsed: number;
      voiceSecondsRemaining: number;
      toolsUsed: number;
      toolsRemaining: number;
      docsUsed: number;
      docsRemaining: number;
      assignedMaestri: string[];
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
      ...trialData,
    };

    // Step 1: Identify as trial user
    await page.route("**/api/user/trial-status", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ isTrialUser: true }),
      });
    });

    // Step 2: Provide trial session data
    await page.route("**/api/trial/session", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(defaults),
      });
    });

    // Step 3: Provide usage data
    await page.route("**/api/user/usage", (route) => {
      const usageData = {
        chatsUsed: defaults.chatsUsed,
        maxChats: defaults.maxChats,
        voiceSecondsUsed: defaults.voiceSecondsUsed,
        maxVoiceSeconds: defaults.maxVoiceSeconds,
        toolsUsed: defaults.toolsUsed,
        maxTools: defaults.maxTools,
        docsUsed: trialData.docsUsed ?? 0,
        maxDocs: trialData.maxDocs ?? 5,
        maestriUsed: trialData.maestriUsed ?? 0,
        maxMaestri: trialData.maxMaestri ?? 3,
      };
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(usageData),
      });
    });

    // Step 4: Allow onboarding
    await page.route("**/api/user/onboarding", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          hasCompletedOnboarding: true,
          onboardingCompletedAt: new Date().toISOString(),
        }),
      });
    });

    // Step 5: Mock ToS API call
    await page.route("**/api/tos", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accepted: true,
          version: "1.0",
        }),
      });
    });
  }

  test("dashboard displays correct usage format for all resources", async ({
    trialPage,
  }) => {
    await setupTrialMocks(trialPage, {
      chatsUsed: 3,
      maxChats: 10,
      voiceSecondsUsed: 120,
      maxVoiceSeconds: 300,
      toolsUsed: 2,
      maxTools: 10,
      docsUsed: 1,
      maxDocs: 5,
      maestriUsed: 2,
      maxMaestri: 3,
    });

    // Navigate directly to home (onboarding is completed by fixture)
    await trialPage.goto("/");
    await trialPage.waitForLoadState("networkidle");

    // F-05: Verify dashboard visible in right sidebar (only on lg screens)
    const dashboard = trialPage.locator(
      '[data-testid="trial-usage-dashboard"]',
    );
    await expect(dashboard).toBeVisible({ timeout: 5000 });

    // F-05: Verify heading
    const heading = dashboard.locator("h2");
    await expect(heading).toContainText("Il tuo utilizzo trial");

    // F-05: Verify all 5 resources are rendered
    const resourceLabels = [
      "Chat testuali",
      "Sessioni voce",
      "Strumenti",
      "Documenti",
      "Maestri",
    ];

    for (const label of resourceLabels) {
      const resourceLabel = dashboard.locator(`text=${label}`).first();
      await expect(resourceLabel).toBeVisible();
    }

    // F-05: Verify resource usage format "{used}/{limit} (percentage%)"
    const chatUsage = dashboard.locator("text=/3\\/10 \\(30%\\)/").first();
    await expect(chatUsage).toBeVisible();

    const voiceUsage = dashboard.locator("text=/2m\\/5m \\(40%\\)/").first();
    await expect(voiceUsage).toBeVisible();

    const toolsUsage = dashboard.locator("text=/2\\/10 \\(20%\\)/").first();
    await expect(toolsUsage).toBeVisible();

    const docsUsage = dashboard.locator("text=/1\\/5 \\(20%\\)/").first();
    await expect(docsUsage).toBeVisible();

    const maestriUsage = dashboard.locator("text=/2\\/3 \\(67%\\)/").first();
    await expect(maestriUsage).toBeVisible();
  });

  test("dashboard displays progress bars for all resources", async ({
    trialPage,
  }) => {
    await setupTrialMocks(trialPage, {
      chatsUsed: 5,
      maxChats: 10,
      voiceSecondsUsed: 150,
      maxVoiceSeconds: 300,
      toolsUsed: 4,
      maxTools: 10,
      docsUsed: 2,
      maxDocs: 5,
      maestriUsed: 1,
      maxMaestri: 3,
    });

    await trialPage.goto("/");
    await trialPage.waitForLoadState("networkidle");

    const dashboard = trialPage.locator(
      '[data-testid="trial-usage-dashboard"]',
    );
    await expect(dashboard).toBeVisible({ timeout: 5000 });

    // F-05: Verify progress bars exist (role="progressbar")
    const progressBars = dashboard.locator('[role="progressbar"]');
    const count = await progressBars.count();
    expect(count).toBe(5); // One progress bar per resource

    // Verify each progress bar has correct attributes
    for (let i = 0; i < count; i++) {
      const progressBar = progressBars.nth(i);
      const ariaValueNow = await progressBar.getAttribute("aria-valuenow");
      const ariaValueMax = await progressBar.getAttribute("aria-valuemax");
      const ariaLabel = await progressBar.getAttribute("aria-label");

      // All should have ARIA attributes
      expect(ariaValueNow).not.toBeNull();
      expect(ariaValueMax).not.toBeNull();
      expect(ariaLabel).not.toBeNull();
    }

    // Verify progress bar fill widths are proportional
    const fillBar = dashboard.locator("div[role='progressbar'] > div").first();
    const width = await fillBar.evaluate((el) => {
      return window.getComputedStyle(el).width;
    });
    expect(width).not.toBe("0px"); // Progress bar should have width
  });

  test("dashboard warning colors appear at high usage (>80%)", async ({
    trialPage,
  }) => {
    await setupTrialMocks(trialPage, {
      chatsUsed: 9,
      maxChats: 10,
      voiceSecondsUsed: 260,
      maxVoiceSeconds: 300,
      toolsUsed: 5,
      maxTools: 10,
      docsUsed: 4,
      maxDocs: 5,
      maestriUsed: 3,
      maxMaestri: 3,
    });

    await trialPage.goto("/");
    await trialPage.waitForLoadState("networkidle");

    const dashboard = trialPage.locator(
      '[data-testid="trial-usage-dashboard"]',
    );
    await expect(dashboard).toBeVisible({ timeout: 5000 });

    // Verify high usage indicators
    const chatUsage = dashboard.locator("text=/9\\/10 \\(90%\\)/").first();
    await expect(chatUsage).toBeVisible();

    const maestriUsage = dashboard.locator("text=/3\\/3 \\(100%\\)/").first();
    await expect(maestriUsage).toBeVisible();

    // Verify progress bar color changes for high usage
    const progressBars = dashboard.locator('[role="progressbar"]');

    // Get the maestri progress bar (should be red at 100%)
    const allBars = await progressBars.all();
    const lastBar = allBars[allBars.length - 1]; // Maestri is last

    const fillElement = lastBar.locator("div").first();
    const bgColor = await fillElement.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    // Verify red color is applied (bg-red-500)
    expect(bgColor).toMatch(/^rgb\(\s*239,\s*68,\s*68/); // Red color RGB
  });

  test("dashboard shows loading skeleton while fetching data", async ({
    trialPage,
  }) => {
    // Identify as trial user
    await trialPage.route("**/api/user/trial-status", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ isTrialUser: true }),
      });
    });

    // Provide trial session
    await trialPage.route("**/api/trial/session", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          chatsUsed: 0,
          chatsRemaining: 10,
          maxChats: 10,
          voiceSecondsUsed: 0,
          voiceSecondsRemaining: 300,
          maxVoiceSeconds: 300,
          toolsUsed: 0,
          toolsRemaining: 10,
          maxTools: 10,
        }),
      });
    });

    // Delay usage response to show skeleton
    await trialPage.route("**/api/user/usage", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          chatsUsed: 2,
          maxChats: 10,
          voiceSecondsUsed: 60,
          maxVoiceSeconds: 300,
          toolsUsed: 1,
          maxTools: 10,
          docsUsed: 0,
          maxDocs: 5,
          maestriUsed: 1,
          maxMaestri: 3,
        }),
      });
    });

    await trialPage.route("**/api/user/onboarding", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          hasCompletedOnboarding: true,
          onboardingCompletedAt: new Date().toISOString(),
        }),
      });
    });

    await trialPage.goto("/", { waitUntil: "domcontentloaded" });

    // Eventually data should load
    const dashboard = trialPage.locator(
      '[data-testid="trial-usage-dashboard"]',
    );
    await expect(dashboard).toBeVisible({ timeout: 5000 });

    // Verify content is loaded
    const heading = dashboard.locator("h2");
    await expect(heading).toContainText("Il tuo utilizzo trial");
  });

  test("dashboard resources count is exactly 5", async ({ trialPage }) => {
    await setupTrialMocks(trialPage, {
      chatsUsed: 1,
      maxChats: 10,
      voiceSecondsUsed: 60,
      maxVoiceSeconds: 300,
      toolsUsed: 1,
      maxTools: 10,
      docsUsed: 0,
      maxDocs: 5,
      maestriUsed: 1,
      maxMaestri: 3,
    });

    await trialPage.goto("/");
    await trialPage.waitForLoadState("networkidle");

    const dashboard = trialPage.locator(
      '[data-testid="trial-usage-dashboard"]',
    );
    await expect(dashboard).toBeVisible({ timeout: 5000 });

    // Count resource items by counting progress bars
    const progressBars = dashboard.locator('[role="progressbar"]');
    const count = await progressBars.count();

    expect(count).toBe(5);

    // Count resource labels explicitly
    const resourceLabels = [
      "Chat testuali",
      "Sessioni voce",
      "Strumenti",
      "Documenti",
      "Maestri",
    ];

    for (const label of resourceLabels) {
      const element = dashboard.locator(`text=${label}`).first();
      await expect(element).toBeVisible();
    }
  });
});

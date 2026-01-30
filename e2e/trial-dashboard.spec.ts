/**
 * E2E Tests: Trial Header Dropdown
 *
 * Tests for trial mode header dropdown displaying usage statistics.
 * F-05: Verify dropdown displays all resources correctly
 *
 * Test scenarios:
 * - Trial badge visible in header (trial mode only)
 * - Dropdown opens on click
 * - All 4 resources rendered (chat, voice, tools, docs)
 * - Progress bars displayed
 * - CTA buttons work (Richiedi accesso, Accedi)
 *
 * Run: npx playwright test e2e/trial-dashboard.spec.ts
 */

import { test, expect } from "./fixtures/auth-fixtures";

test.describe("Trial Mode - Header Dropdown (F-05)", () => {
  // Set viewport to large screen size
  test.use({ viewport: { width: 1920, height: 1080 } });

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

    // Provide usage data for dropdown
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

    // Allow onboarding
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

    await trialPage.goto("/");
    await trialPage.waitForLoadState("domcontentloaded");

    // Find trial badge button in header
    const trialBadge = trialPage.locator('button:has-text("Trial")');
    await expect(trialBadge).toBeVisible({ timeout: 5000 });

    // Verify it shows chat count
    await expect(trialBadge).toContainText("7/10");
  });

  test("dropdown opens on badge click and shows usage stats", async ({
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
    });

    await trialPage.goto("/");
    await trialPage.waitForLoadState("domcontentloaded");

    // Click trial badge to open dropdown
    const trialBadge = trialPage.locator('button:has-text("Trial")');
    await trialBadge.click();

    // Verify dropdown panel appears
    const dropdown = trialPage.locator('text="Modalità Prova"');
    await expect(dropdown).toBeVisible({ timeout: 3000 });

    // Verify all 4 resource labels are shown
    await expect(trialPage.locator("text=Chat")).toBeVisible();
    await expect(trialPage.locator("text=Voce")).toBeVisible();
    await expect(trialPage.locator("text=Strumenti")).toBeVisible();
    await expect(trialPage.locator("text=Documenti")).toBeVisible();
  });

  test("dropdown shows CTA buttons", async ({ trialPage }) => {
    await setupTrialMocks(trialPage);

    await trialPage.goto("/");
    await trialPage.waitForLoadState("domcontentloaded");

    // Open dropdown
    const trialBadge = trialPage.locator('button:has-text("Trial")');
    await trialBadge.click();

    // Verify CTA buttons
    const requestAccessBtn = trialPage.locator(
      'a:has-text("Richiedi accesso")',
    );
    await expect(requestAccessBtn).toBeVisible();
    await expect(requestAccessBtn).toHaveAttribute("href", "/invite/request");

    const loginBtn = trialPage.locator('a:has-text("Accedi")');
    await expect(loginBtn).toBeVisible();
    await expect(loginBtn).toHaveAttribute("href", "/login");
  });

  test("dropdown closes on outside click", async ({ trialPage }) => {
    await setupTrialMocks(trialPage);

    await trialPage.goto("/");
    await trialPage.waitForLoadState("domcontentloaded");

    // Open dropdown
    const trialBadge = trialPage.locator('button:has-text("Trial")');
    await trialBadge.click();

    // Verify dropdown is open
    const dropdown = trialPage.locator('text="Modalità Prova"');
    await expect(dropdown).toBeVisible();

    // Click outside (on main content area)
    await trialPage.click("main");

    // Verify dropdown is closed
    await expect(dropdown).not.toBeVisible({ timeout: 2000 });
  });

  test("dropdown closes on Escape key", async ({ trialPage }) => {
    await setupTrialMocks(trialPage);

    await trialPage.goto("/");
    await trialPage.waitForLoadState("domcontentloaded");

    // Open dropdown
    const trialBadge = trialPage.locator('button:has-text("Trial")');
    await trialBadge.click();

    // Verify dropdown is open
    const dropdown = trialPage.locator('text="Modalità Prova"');
    await expect(dropdown).toBeVisible();

    // Press Escape
    await trialPage.keyboard.press("Escape");

    // Verify dropdown is closed
    await expect(dropdown).not.toBeVisible({ timeout: 2000 });
  });

  test("badge changes color when resources are low", async ({ trialPage }) => {
    await setupTrialMocks(trialPage, {
      chatsUsed: 8,
      chatsRemaining: 2,
      maxChats: 10,
    });

    await trialPage.goto("/");
    await trialPage.waitForLoadState("domcontentloaded");

    // Find trial badge
    const trialBadge = trialPage.locator('button:has-text("Trial")');
    await expect(trialBadge).toBeVisible();

    // Verify amber color class when low (<=3 remaining)
    await expect(trialBadge).toHaveClass(/amber/);
  });

  test("dropdown header shows warning when resources low", async ({
    trialPage,
  }) => {
    await setupTrialMocks(trialPage, {
      chatsUsed: 8,
      chatsRemaining: 2,
      maxChats: 10,
    });

    await trialPage.goto("/");
    await trialPage.waitForLoadState("domcontentloaded");

    // Open dropdown
    const trialBadge = trialPage.locator('button:has-text("Trial")');
    await trialBadge.click();

    // Verify warning message
    const warningText = trialPage.locator('text="Risorse quasi esaurite!"');
    await expect(warningText).toBeVisible();
  });
});

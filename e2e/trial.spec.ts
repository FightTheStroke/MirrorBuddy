/**
 * E2E TESTS: Trial Mode Flow
 * Tests trial limits, consent wall, and upgrade prompts
 * F-07: Trial Mode Tests
 */

import { test, expect } from "@playwright/test";

test.describe("Trial Mode Flow", () => {
  test.beforeEach(async ({ context }) => {
    // Clear all cookies and localStorage for fresh trial
    await context.clearCookies();
  });

  test("Cookie consent wall blocks access until accepted", async ({ page }) => {
    // Clear consent
    await page.addInitScript(() => {
      localStorage.removeItem("mirrorbuddy-consent");
    });

    await page.goto("/");

    // Consent wall should be visible
    await expect(page.locator("text=Privacy e Cookie")).toBeVisible();
    await expect(page.locator("text=Accetta e continua")).toBeVisible();

    // App content should not be visible
    await expect(
      page.locator("[data-testid='main-content']"),
    ).not.toBeVisible();

    // Accept consent
    await page.click("text=Accetta e continua");

    // Consent wall should disappear
    await expect(page.locator("text=Privacy e Cookie")).not.toBeVisible();
  });

  test("Trial status indicator shows remaining chats", async ({ page }) => {
    // Set consent to bypass wall
    await page.addInitScript(() => {
      localStorage.setItem(
        "mirrorbuddy-consent",
        JSON.stringify({
          version: "1.0",
          acceptedAt: new Date().toISOString(),
          essential: true,
          analytics: true,
          marketing: false,
        }),
      );
    });

    await page.goto("/");

    // Trial indicator should show 10/10 for new user
    await expect(page.locator("[data-testid='trial-status']")).toContainText(
      "10/10",
    );
  });

  test("Limit reached modal appears when trial exhausted", async ({ page }) => {
    // Set consent
    await page.addInitScript(() => {
      localStorage.setItem(
        "mirrorbuddy-consent",
        JSON.stringify({
          version: "1.0",
          acceptedAt: new Date().toISOString(),
          essential: true,
          analytics: true,
          marketing: false,
        }),
      );
    });

    // Mock trial session at limit
    await page.route("**/api/trial/status", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          isTrialUser: true,
          chatCount: 10,
          maxChats: 10,
          remaining: 0,
        }),
      });
    });

    await page.goto("/");

    // Try to send message (should trigger modal)
    await page.fill("[data-testid='chat-input']", "Test message");
    await page.click("[data-testid='send-button']");

    // Modal should appear
    await expect(
      page.locator("text=Hai esaurito i messaggi di prova"),
    ).toBeVisible();
    await expect(page.locator("text=Richiedi accesso Beta")).toBeVisible();
  });

  test("Privacy page is accessible from consent wall", async ({ page }) => {
    // Clear consent
    await page.addInitScript(() => {
      localStorage.removeItem("mirrorbuddy-consent");
    });

    await page.goto("/");

    // Click privacy link (opens in new tab)
    const [privacyPage] = await Promise.all([
      page.waitForEvent("popup"),
      page.click("text=Privacy Policy"),
    ]);

    // Privacy page should load
    await expect(privacyPage).toHaveURL(/\/privacy/);
    await expect(
      privacyPage.locator("text=Informativa sulla Privacy"),
    ).toBeVisible();
  });

  test("Cookie policy page is accessible", async ({ page }) => {
    // Set consent to access app
    await page.addInitScript(() => {
      localStorage.setItem(
        "mirrorbuddy-consent",
        JSON.stringify({
          version: "1.0",
          acceptedAt: new Date().toISOString(),
          essential: true,
          analytics: true,
          marketing: false,
        }),
      );
    });

    await page.goto("/cookies");

    // Cookie policy should be visible
    await expect(page.locator("text=Cookie Policy")).toBeVisible();
    await expect(page.locator("text=Cookie Essenziali")).toBeVisible();
  });

  test("Analytics toggle in settings works", async ({ page }) => {
    // Set consent
    await page.addInitScript(() => {
      localStorage.setItem(
        "mirrorbuddy-consent",
        JSON.stringify({
          version: "1.0",
          acceptedAt: new Date().toISOString(),
          essential: true,
          analytics: true,
          marketing: false,
        }),
      );
    });

    // Navigate to settings
    await page.goto("/settings");

    // Find analytics toggle
    const toggle = page.locator("[aria-label='Toggle analytics']");

    // Should be enabled by default
    await expect(toggle).toHaveAttribute("aria-checked", "true");

    // Toggle off
    await toggle.click();

    // Should be disabled
    await expect(toggle).toHaveAttribute("aria-checked", "false");

    // Verify localStorage updated
    const consent = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("mirrorbuddy-consent") || "{}"),
    );
    expect(consent.analytics).toBe(false);
  });
});

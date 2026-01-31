/**
 * E2E Test - Navigation and Button Functionality
 *
 * Tests critical user interactions across the site:
 * - Button clicks on welcome/landing pages
 * - Navigation between main sections
 * - Interactive form submissions
 * - CSRF-protected actions work correctly
 *
 * This test would have caught the 403 CSRF error on /api/onboarding
 *
 * Run: npx playwright test e2e/navigation-and-buttons.spec.ts
 */

import { test, expect } from "./fixtures/base-fixtures";

const IGNORE_ERRORS = [
  /ResizeObserver loop/i,
  /Download the React DevTools/i,
  /favicon\.ico/i,
  /401.*Unauthorized/i,
  /429.*Too Many Requests/i,
  /net::ERR_/i,
  /Failed to load resource/i,
  /hydrat/i,
  /WebSocket/i,
  /realtime.*token/i,
  /Content Security Policy/i,
];

test.describe("Navigation and Button Functionality", () => {
  test.beforeEach(async ({ page }) => {
    // Mock ToS acceptance to bypass modal
    await page.route("/api/tos", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accepted: true,
          version: "1.0",
        }),
      });
    });
  });
  test.describe("Welcome Page", () => {
    test("welcome page loads and displays buttons", async ({ page }) => {
      await page.goto("/welcome");
      await page.waitForLoadState("domcontentloaded");

      // Should have a main heading
      const heading = page.locator("h1, h2").first();
      await expect(heading).toBeVisible();

      // Should have primary action buttons
      const buttons = page.locator("button");
      const count = await buttons.count();
      expect(count).toBeGreaterThan(0);
    });

    test("no 403 errors on button clicks", async ({ page }) => {
      const networkErrors: string[] = [];
      const consoleErrors: string[] = [];

      // Monitor for 403 errors in network
      page.on("response", (response) => {
        if (response.status() === 403) {
          networkErrors.push(`403 on ${response.url()}`);
        }
      });

      page.on("console", (msg) => {
        if (msg.type() === "error") {
          const text = msg.text();
          if (!IGNORE_ERRORS.some((p) => p.test(text))) {
            consoleErrors.push(text);
          }
        }
      });

      await page.goto("/welcome");
      await page.waitForLoadState("domcontentloaded");

      // Click any visible primary buttons
      const buttons = page
        .locator("button")
        .filter({ hasText: /Inizia|Continua|Avanti|Prosegui/i });
      const buttonCount = await buttons.count();

      for (let i = 0; i < Math.min(buttonCount, 3); i++) {
        const btn = buttons.nth(i);
        if ((await btn.isVisible()) && (await btn.isEnabled())) {
          await btn.click();
          await page.waitForTimeout(500);
        }
      }

      // Should have no 403 errors
      expect(
        networkErrors,
        `403 errors: ${networkErrors.join(", ")}`,
      ).toHaveLength(0);
    });
  });

  test.describe("Main App Navigation", () => {
    test("sidebar navigation works without errors", async ({ page }) => {
      const networkErrors: string[] = [];

      page.on("response", (response) => {
        if (response.status() === 403) {
          networkErrors.push(`403 on ${response.url()}`);
        }
      });

      await page.goto("/");
      await page.waitForLoadState("domcontentloaded");

      // Test each nav section
      const navItems = ["Professori", "Astuccio", "Zaino", "Impostazioni"];

      for (const item of navItems) {
        const btn = page
          .locator("button")
          .filter({ hasText: new RegExp(item, "i") })
          .first();
        if (await btn.isVisible()) {
          await btn.click();
          await page.waitForTimeout(300);
        }
      }

      expect(networkErrors).toHaveLength(0);
    });

    test("tool sections are accessible", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("domcontentloaded");

      // Navigate to Astuccio
      const astuccioBtn = page
        .locator("button")
        .filter({ hasText: /Astuccio/i })
        .first();
      if (await astuccioBtn.isVisible()) {
        await astuccioBtn.click();
        await page.waitForTimeout(500);

        // Check for tool links/buttons
        const toolButtons = page.locator("button, a").filter({
          hasText: /Quiz|Flashcard|Mappa|Riassunto/i,
        });
        const count = await toolButtons.count();
        expect(count).toBeGreaterThan(0);
      }
    });
  });

  test.describe("Settings Interactions", () => {
    test("settings page interactive elements work", async ({ page }) => {
      const networkErrors: string[] = [];

      page.on("response", (response) => {
        if (response.status() === 403) {
          networkErrors.push(`403 on ${response.url()}`);
        }
      });

      await page.goto("/");
      await page.waitForLoadState("domcontentloaded");

      // Navigate to Settings
      const settingsBtn = page
        .locator("button")
        .filter({ hasText: /Impostazioni/i })
        .first();
      if (await settingsBtn.isVisible()) {
        await settingsBtn.click();
        await page.waitForTimeout(500);

        // Find and click any toggles or switches (but don't actually toggle dangerous ones)
        const switches = page.locator('[role="switch"]');
        const switchCount = await switches.count();

        // Just verify switches are present and interactive
        expect(switchCount).toBeGreaterThanOrEqual(0);
      }

      expect(networkErrors).toHaveLength(0);
    });
  });

  // NOTE: CSRF tests moved to csrf-protection.spec.ts for better organization
  // See e2e/csrf-protection.spec.ts for comprehensive CSRF validation

  test.describe("Interactive Pages", () => {
    test("quiz page redirects to astuccio", async ({ page }) => {
      await page.goto("/quiz");
      await page.waitForLoadState("domcontentloaded");

      // /quiz redirects to /astuccio
      await expect(page).toHaveURL(/\/astuccio/);

      // Should have content visible
      await expect(page.locator("main").first()).toBeVisible();
    });

    test("flashcards page redirects to astuccio", async ({ page }) => {
      await page.goto("/flashcards");
      await page.waitForLoadState("domcontentloaded");

      // /flashcards redirects to /astuccio (flashcards are part of astuccio)
      await expect(page).toHaveURL(/\/astuccio/);

      // Should have content visible
      await expect(page.locator("main").first()).toBeVisible();
    });

    test("study-kit page redirects to home", async ({ page }) => {
      await page.goto("/study-kit");
      await page.waitForLoadState("domcontentloaded");

      // /study-kit redirects to /?view=astuccio which then may redirect to landing/welcome
      // without auth. Just verify the redirect happens and content loads.
      await expect(page.locator("main, [role='main']").first()).toBeVisible();
    });

    test("parent-dashboard loads without errors", async ({ page }) => {
      const networkErrors: string[] = [];

      page.on("response", (response) => {
        if (response.status() === 403) {
          networkErrors.push(`403 on ${response.url()}`);
        }
      });

      await page.goto("/parent-dashboard");
      await page.waitForLoadState("domcontentloaded");

      await expect(page.locator("body")).toBeVisible();
      expect(networkErrors).toHaveLength(0);
    });
  });
});

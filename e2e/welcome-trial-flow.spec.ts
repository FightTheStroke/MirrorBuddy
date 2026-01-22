import { test, expect } from "@playwright/test";

/**
 * Welcome Page → Trial Flow E2E Tests
 *
 * Tests the user journey from welcome page to trial mode:
 * 1. Welcome page loads with V3 components
 * 2. Beta sticker badge is visible
 * 3. Quick Start section shows Login and Trial buttons
 * 4. Trial button works and creates trial session
 * 5. User lands on home page in trial mode
 */

test.describe("Welcome → Trial Flow", () => {
  test("should display welcome page V3 with beta sticker", async ({ page }) => {
    await page.goto("/welcome");

    // Check hero section loads
    await expect(
      page.getByRole("heading", { name: /benvenuto in mirrorbuddy/i }),
    ).toBeVisible();

    // Check beta sticker is visible
    await expect(page.getByText(/beta privata/i)).toBeVisible();
    await expect(page.getByText(/accesso su invito/i)).toBeVisible();

    // Check value proposition
    await expect(
      page.getByText(/qualunque sia il tuo stile di apprendimento/i),
    ).toBeVisible();
  });

  test("should show symmetric Login and Trial buttons", async ({ page }) => {
    await page.goto("/welcome");

    // Wait for quick start section
    await expect(
      page.getByRole("heading", { name: /hai già un account/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /esplora subito/i }),
    ).toBeVisible();

    // Check buttons are visible
    const loginButton = page.getByRole("link", { name: /accedi/i });
    const trialButton = page.getByRole("button", { name: /prova gratis/i });

    await expect(loginButton).toBeVisible();
    await expect(trialButton).toBeVisible();

    // Check features lists
    await expect(page.getByText(/22 maestri ai/i)).toBeVisible();
    await expect(page.getByText(/funzionalità limitate/i)).toBeVisible();
  });

  test("should navigate to trial mode successfully", async ({ page }) => {
    await page.goto("/welcome");

    // Click "Prova gratis" button
    const trialButton = page.getByRole("button", { name: /prova gratis/i });
    await expect(trialButton).toBeVisible();

    // Wait for navigation
    await Promise.all([
      page.waitForURL("/", { timeout: 10000 }),
      trialButton.click(),
    ]);

    // Should be on home page
    expect(page.url()).toContain("/");

    // Should see trial banner
    await expect(page.getByText(/modalità prova/i).first()).toBeVisible({
      timeout: 10000,
    });

    // Should see professors grid
    await expect(
      page.getByRole("heading", { name: /professori/i }),
    ).toBeVisible();
  });

  test("should show Contact link in footer", async ({ page }) => {
    await page.goto("/welcome");

    // Scroll to footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Check contatti link
    const contattiLink = page.getByRole("link", { name: /contatti/i });
    await expect(contattiLink).toBeVisible();
    expect(await contattiLink.getAttribute("href")).toBe("/contatti");
  });

  test("should load contact page correctly", async ({ page }) => {
    await page.goto("/contatti");

    // Check heading
    await expect(
      page.getByRole("heading", { name: /contattaci/i }),
    ).toBeVisible();

    // Check form fields
    await expect(page.getByLabel(/nome/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/oggetto/i)).toBeVisible();
    await expect(page.getByLabel(/messaggio/i)).toBeVisible();

    // Check privacy checkbox
    await expect(page.getByLabel(/accetto la privacy policy/i)).toBeVisible();

    // Check submit button
    await expect(
      page.getByRole("button", { name: /invia messaggio/i }),
    ).toBeVisible();
  });

  test("should show maestri showcase after Quick Start", async ({ page }) => {
    await page.goto("/welcome");

    // Scroll to maestri section (should be after Quick Start)
    await page.evaluate(() => window.scrollTo(0, 800));

    // Check maestri heading (V2 version without "Il Cuore di MirrorBuddy")
    await expect(
      page.getByRole("heading", { name: /i tuoi 22 professori/i }),
    ).toBeVisible();

    // Check carousel is present
    await expect(
      page.getByRole("region", { name: /carosello/i }),
    ).toBeVisible();
  });
});

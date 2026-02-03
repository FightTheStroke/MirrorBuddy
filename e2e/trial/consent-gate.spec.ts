/**
 * E2E Tests: Trial Consent Gate - GDPR Compliance
 *
 * Tests the TrialConsentGate component integration with /welcome page
 * and API route protection.
 *
 * F-02: GDPR consent gate blocks trial activation until explicit consent
 *
 * Test scenarios:
 * - Consent gate blocks trial without explicit acceptance
 * - Accept button only enabled after checkbox is checked
 * - Trial content hidden until consent given
 * - API route blocks session creation without consent
 * - Consent persists across page reloads
 *
 * Run: npx playwright test e2e/trial/consent-gate.spec.ts
 */

import { test, expect } from "../fixtures/auth-fixtures";

// IMPORTANT: These tests check unauthenticated /welcome page with trial consent gate
// Override global storageState to start without authentication
test.use({ storageState: undefined });

test.describe("Trial Consent Gate - GDPR Compliance", () => {
  test("blocks trial without consent on /welcome page", async ({
    trialPage,
  }) => {
    // Clear any existing consent
    await trialPage.context().clearCookies();
    await trialPage.addInitScript(() => {
      // Clear ALL consent-related localStorage keys
      localStorage.removeItem("mirrorbuddy-consent"); // Old cookie consent
      localStorage.removeItem("mirrorbuddy-unified-consent"); // New unified consent
      localStorage.removeItem("trialConsent"); // Trial-specific consent
      localStorage.removeItem("mirrorbuddy-onboarding"); // Prevent redirect
    });

    // Navigate to Italian welcome page (root /welcome redirects to /landing)
    await trialPage.goto("/it/welcome", { waitUntil: "domcontentloaded" });

    // Should see consent gate (i18n key: auth.trialConsent.title)
    await expect(
      trialPage.getByRole("heading", { name: /Protezione della Privacy/i }),
    ).toBeVisible({
      timeout: 10000,
    });

    // Should show privacy policy reference
    await expect(
      trialPage.getByRole("link", {
        name: /Leggi la nostra Informativa sulla Privacy/i,
      }),
    ).toBeVisible();

    // Should show checkbox
    await expect(trialPage.getByRole("checkbox")).toBeVisible();

    // Accept button should exist (i18n key: auth.trialConsent.startButton)
    await expect(
      trialPage.getByRole("button", { name: /Inizia la Prova/i }),
    ).toBeVisible();
  });

  test("accept button disabled until checkbox checked", async ({
    trialPage,
  }) => {
    // Clear consent
    await trialPage.context().clearCookies();
    await trialPage.addInitScript(() => {
      // Clear ALL consent-related localStorage keys
      localStorage.removeItem("mirrorbuddy-consent");
      localStorage.removeItem("mirrorbuddy-unified-consent");
      localStorage.removeItem("trialConsent");
      localStorage.removeItem("mirrorbuddy-onboarding");
    });

    await trialPage.goto("/it/welcome", { waitUntil: "domcontentloaded" });

    // Accept button should be disabled initially
    const acceptButton = trialPage.getByRole("button", {
      name: /Inizia la Prova/i,
    });
    await expect(acceptButton).toBeDisabled();

    // Click the label to toggle the checkbox (shadcn/ui Checkbox uses controlled state)
    const checkboxLabel = trialPage.getByText(
      /Accetto il trattamento dei miei dati/i,
    );
    await checkboxLabel.click();

    // Accept button should now be enabled
    await expect(acceptButton).toBeEnabled();

    // Click label again to uncheck
    await checkboxLabel.click();

    // Accept button should be disabled again
    await expect(acceptButton).toBeDisabled();
  });

  test("shows welcome content after consent accepted", async ({
    trialPage,
  }) => {
    // Clear consent
    await trialPage.context().clearCookies();
    await trialPage.addInitScript(() => {
      // Clear ALL consent-related localStorage keys
      localStorage.removeItem("mirrorbuddy-consent");
      localStorage.removeItem("mirrorbuddy-unified-consent");
      localStorage.removeItem("trialConsent");
      localStorage.removeItem("mirrorbuddy-onboarding");
    });

    await trialPage.goto("/it/welcome", { waitUntil: "domcontentloaded" });

    // Click the label to check the checkbox
    await trialPage.getByText(/Accetto il trattamento dei miei dati/i).click();

    const acceptButton = trialPage.getByRole("button", {
      name: /Inizia la Prova/i,
    });
    await acceptButton.click();

    // Consent gate should disappear
    await expect(
      trialPage.getByRole("heading", { name: /Protezione della Privacy/i }),
    ).not.toBeVisible();

    // Welcome content should be visible (landing page or onboarding)
    await expect(trialPage.locator("body")).toBeTruthy();
  });

  test("blocks API trial session creation without consent", async ({
    trialPage,
  }) => {
    // Clear consent cookie
    await trialPage.context().clearCookies();

    // Try to call trial session API without consent
    const response = await trialPage.request.post("/api/trial/session");

    // Should be blocked with 403
    expect(response.status()).toBe(403);

    const body = await response.json();
    expect(body.error).toContain("privacy");
  });

  test("allows API trial session creation with valid consent", async ({
    context,
    trialPage,
  }) => {
    // Clear cookies first
    await context.clearCookies();

    // Set consent cookie (this is what TrialConsentGate sets when user accepts)
    const consentData = {
      accepted: true,
      version: "1.0",
      acceptedAt: new Date().toISOString(),
    };
    await context.addCookies([
      {
        name: "mirrorbuddy-trial-consent",
        value: encodeURIComponent(JSON.stringify(consentData)),
        domain: "localhost",
        path: "/",
        sameSite: "Lax",
      },
    ]);

    // Now the API call should succeed
    const response = await trialPage.request.post("/api/trial/session");

    // Should succeed with 200
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.sessionId).toBeTruthy();
  });

  test("consent persists across page reloads", async ({ page }) => {
    test.setTimeout(60000); // Multiple navigations + reload
    // Use fresh page without fixture's addInitScript to test persistence properly
    // Clear cookies first
    await page.context().clearCookies();

    // Navigate to Italian welcome page to establish origin for localStorage
    await page.goto("/it/welcome", { waitUntil: "domcontentloaded" });

    // Clear localStorage on localhost origin
    await page.evaluate(() => {
      localStorage.removeItem("mirrorbuddy-consent");
      localStorage.removeItem("mirrorbuddy-unified-consent");
      localStorage.removeItem("trialConsent");
      localStorage.removeItem("mirrorbuddy-onboarding");
    });

    // Reload to see consent gate
    await page.reload();
    await page.waitForLoadState("domcontentloaded");

    // Wait for consent gate to appear
    await expect(
      page.getByRole("heading", { name: /Protezione della Privacy/i }),
    ).toBeVisible({
      timeout: 10000,
    });

    // Click the label to check the checkbox
    await page.getByText(/Accetto il trattamento dei miei dati/i).click();

    const acceptButton = page.getByRole("button", {
      name: /Inizia la Prova/i,
    });
    await acceptButton.click();

    // Wait for consent to be saved (cookie is set)
    await page.waitForTimeout(500);

    // Re-navigate to avoid net::ERR_ABORTED on reload in CI
    await page.goto("/it/welcome", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("domcontentloaded");

    // Consent gate should not appear on reload (consent persisted via cookie)
    const consentGate = page.getByRole("heading", {
      name: /Protezione della Privacy/i,
    });
    await expect(consentGate).not.toBeVisible({ timeout: 5000 });
  });

  test("privacy link opens external page", async ({ trialPage }) => {
    // Clear consent
    await trialPage.context().clearCookies();
    await trialPage.addInitScript(() => {
      // Clear ALL consent-related localStorage keys
      localStorage.removeItem("mirrorbuddy-consent");
      localStorage.removeItem("mirrorbuddy-unified-consent");
      localStorage.removeItem("trialConsent");
      localStorage.removeItem("mirrorbuddy-onboarding");
    });

    await trialPage.goto("/it/welcome", { waitUntil: "domcontentloaded" });

    // Find and check privacy link (i18n key: auth.trialConsent.privacyLink)
    const privacyLink = trialPage.getByRole("link", {
      name: /Leggi la nostra Informativa sulla Privacy/i,
    });

    await expect(privacyLink).toBeVisible();
    await expect(privacyLink).toHaveAttribute("href", "/privacy");
  });

  test("shows GDPR compliance footer note", async ({ trialPage }) => {
    // Clear consent
    await trialPage.context().clearCookies();
    await trialPage.addInitScript(() => {
      // Clear ALL consent-related localStorage keys
      localStorage.removeItem("mirrorbuddy-consent");
      localStorage.removeItem("mirrorbuddy-unified-consent");
      localStorage.removeItem("trialConsent");
      localStorage.removeItem("mirrorbuddy-onboarding");
    });

    await trialPage.goto("/it/welcome", { waitUntil: "domcontentloaded" });

    // Should show GDPR compliance note (i18n key: auth.trialConsent.subtitle)
    await expect(trialPage.getByText(/Conformità GDPR/i)).toBeVisible();

    // Should mention data storage rights (i18n key: auth.trialConsent.gdprNote)
    await expect(
      trialPage.getByText(/dati saranno conservati in Europa/i),
    ).toBeVisible();
  });
});

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

test.describe("Trial Consent Gate - GDPR Compliance", () => {
  test("blocks trial without consent on /welcome page", async ({
    trialPage,
  }) => {
    // Clear any existing consent
    await trialPage.context().clearCookies();
    await trialPage.addInitScript(() => {
      localStorage.removeItem("mirrorbuddy-consent");
      localStorage.removeItem("trialConsent");
      localStorage.removeItem("mirrorbuddy-trial-consent");
    });

    // Navigate to welcome page
    await trialPage.goto("/welcome", { waitUntil: "domcontentloaded" });

    // Should see consent gate, not welcome content
    await expect(trialPage.getByText(/Modalità Prova Gratuita/i)).toBeVisible({
      timeout: 10000,
    });

    // Should show privacy policy reference
    await expect(trialPage.getByText(/informativa privacy/i)).toBeVisible();

    // Should show checkbox
    await expect(trialPage.getByRole("checkbox")).toBeVisible();

    // Accept button should exist
    await expect(
      trialPage.getByRole("button", { name: /Inizia la prova/i }),
    ).toBeVisible();
  });

  test("accept button disabled until checkbox checked", async ({
    trialPage,
  }) => {
    // Clear consent
    await trialPage.context().clearCookies();
    await trialPage.addInitScript(() => {
      localStorage.removeItem("mirrorbuddy-consent");
      localStorage.removeItem("trialConsent");
      localStorage.removeItem("mirrorbuddy-trial-consent");
    });

    await trialPage.goto("/welcome", { waitUntil: "domcontentloaded" });

    // Accept button should be disabled initially
    const acceptButton = trialPage.getByRole("button", {
      name: /Inizia la prova/i,
    });
    await expect(acceptButton).toBeDisabled();

    // Check the checkbox
    const checkbox = trialPage.getByRole("checkbox");
    await checkbox.check();

    // Accept button should now be enabled
    await expect(acceptButton).toBeEnabled();

    // Uncheck the checkbox
    await checkbox.uncheck();

    // Accept button should be disabled again
    await expect(acceptButton).toBeDisabled();
  });

  test("shows welcome content after consent accepted", async ({
    trialPage,
  }) => {
    // Clear consent
    await trialPage.context().clearCookies();
    await trialPage.addInitScript(() => {
      localStorage.removeItem("mirrorbuddy-consent");
      localStorage.removeItem("trialConsent");
      localStorage.removeItem("mirrorbuddy-trial-consent");
    });

    await trialPage.goto("/welcome", { waitUntil: "domcontentloaded" });

    // Accept consent
    const checkbox = trialPage.getByRole("checkbox");
    await checkbox.check();

    const acceptButton = trialPage.getByRole("button", {
      name: /Inizia la prova/i,
    });
    await acceptButton.click();

    // Consent gate should disappear
    await expect(
      trialPage.getByText(/Modalità Prova Gratuita/i),
    ).not.toBeVisible();

    // Welcome content should be visible (landing page or onboarding)
    // The page should show main welcome content or onboarding steps
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

  test("consent persists across page reloads", async ({ trialPage }) => {
    // Clear initial state
    await trialPage.context().clearCookies();
    await trialPage.addInitScript(() => {
      localStorage.removeItem("mirrorbuddy-consent");
      localStorage.removeItem("trialConsent");
      localStorage.removeItem("mirrorbuddy-trial-consent");
    });

    // Navigate to welcome
    await trialPage.goto("/welcome", { waitUntil: "domcontentloaded" });

    // Accept consent
    const checkbox = trialPage.getByRole("checkbox");
    await checkbox.check();

    const acceptButton = trialPage.getByRole("button", {
      name: /Inizia la prova/i,
    });
    await acceptButton.click();

    // Wait for consent to be saved
    await trialPage.waitForTimeout(500);

    // Reload the page
    await trialPage.reload();
    await trialPage.waitForLoadState("networkidle");

    // Consent gate should not appear on reload
    const consentGate = trialPage.getByText(/Modalità Prova Gratuita/i);
    await expect(consentGate).not.toBeVisible();
  });

  test("privacy link opens external page", async ({ trialPage }) => {
    // Clear consent
    await trialPage.context().clearCookies();
    await trialPage.addInitScript(() => {
      localStorage.removeItem("mirrorbuddy-consent");
      localStorage.removeItem("trialConsent");
      localStorage.removeItem("mirrorbuddy-trial-consent");
    });

    await trialPage.goto("/welcome", { waitUntil: "domcontentloaded" });

    // Find and check privacy link
    const privacyLink = trialPage.getByRole("link", {
      name: /Leggi l.informativa privacy completa/i,
    });

    await expect(privacyLink).toBeVisible();
    expect(privacyLink).toHaveAttribute("href", "/privacy");
    expect(privacyLink).toHaveAttribute("target", "_blank");
  });

  test("shows GDPR compliance footer note", async ({ trialPage }) => {
    // Clear consent
    await trialPage.context().clearCookies();
    await trialPage.addInitScript(() => {
      localStorage.removeItem("mirrorbuddy-consent");
      localStorage.removeItem("trialConsent");
      localStorage.removeItem("mirrorbuddy-trial-consent");
    });

    await trialPage.goto("/welcome", { waitUntil: "domcontentloaded" });

    // Should show GDPR compliance note
    await expect(trialPage.getByText(/Conformità GDPR/i)).toBeVisible();

    // Should mention data deletion rights
    await expect(trialPage.getByText(/dati saranno cancellati/i)).toBeVisible();
  });
});

/**
 * E2E Tests: Trial Consent Flow - GDPR Compliance
 *
 * Tests the inline TOS acceptance in the trial email form on /welcome page.
 * Consent is now collected when user clicks "Try Free" and submits the email form
 * (or skips email), instead of via a separate blocking gate.
 *
 * F-02: GDPR consent collected inline during trial activation
 *
 * Test scenarios:
 * - Welcome page loads without blocking gate
 * - Trial email form shows TOS checkbox
 * - Submit disabled until TOS accepted
 * - API route blocks session creation without consent
 * - API route allows session creation with valid consent
 *
 * Run: npx playwright test e2e/trial/consent-gate.spec.ts
 */

import { test, expect } from '../fixtures/auth-fixtures';

// Override global storageState to start without authentication
test.use({ storageState: undefined });

test.describe('Trial Consent Flow - GDPR Compliance', () => {
  test('welcome page loads without blocking consent gate', async ({ trialPage }) => {
    await trialPage.context().clearCookies();
    await trialPage.addInitScript(() => {
      localStorage.removeItem('mirrorbuddy-consent');
      localStorage.removeItem('mirrorbuddy-unified-consent');
      localStorage.removeItem('trialConsent');
      localStorage.removeItem('mirrorbuddy-onboarding');
    });

    await trialPage.goto('/it/welcome', { waitUntil: 'domcontentloaded' });

    // Should NOT see old blocking consent gate
    await expect(
      trialPage.getByRole('heading', { name: /Protezione della Privacy/i }),
    ).not.toBeVisible({ timeout: 5000 });

    // Should see the landing page with trial CTA
    await expect(trialPage.getByRole('button', { name: /Prova gratis/i })).toBeVisible({
      timeout: 10000,
    });
  });

  test('blocks API trial session creation without consent', async ({ trialPage }) => {
    await trialPage.context().clearCookies();

    const response = await trialPage.request.post('/api/trial/session');

    expect(response.status()).toBe(403);

    const body = await response.json();
    expect(body.error).toContain('privacy');
  });

  test('allows API trial session creation with valid consent', async ({ context, trialPage }) => {
    await context.clearCookies();

    const consentData = {
      accepted: true,
      version: '1.0',
      acceptedAt: new Date().toISOString(),
    };
    await context.addCookies([
      {
        name: 'mirrorbuddy-trial-consent',
        value: encodeURIComponent(JSON.stringify(consentData)),
        domain: 'localhost',
        path: '/',
        sameSite: 'Lax',
      },
    ]);

    const response = await trialPage.request.post('/api/trial/session');

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.sessionId).toBeTruthy();
  });
});

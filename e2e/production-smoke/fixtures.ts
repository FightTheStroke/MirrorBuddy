/**
 * Production Smoke Test Fixtures
 *
 * Lightweight fixtures for production read-only tests.
 * Bypasses consent walls via route mocking and localStorage —
 * same pattern as base-fixtures.ts but without DB dependencies.
 *
 * These tests NEVER write data to production. They only:
 * - Navigate pages
 * - Verify UI renders
 * - Check API responses (GET only)
 * - Validate accessibility features
 */

/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, expect } from '@playwright/test';

export const PROD_URL = process.env.PROD_URL || 'https://mirrorbuddy.vercel.app';

export const test = base.extend({
  page: async ({ page, context }, use) => {
    // Force Italian locale so selectors are predictable
    await context.setExtraHTTPHeaders({ 'Accept-Language': 'it-IT,it;q=0.9' });

    // Mock TOS API to bypass TosGateProvider
    await page.route('**/api/tos', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ accepted: true, version: '1.0' }),
      });
    });

    // Mock trial session to prevent 401 noise
    await page.route('**/api/trial/session', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sessionId: '00000000-0000-4000-a000-000000000001',
          visitorId: '00000000-0000-4000-a000-000000000001',
          createdAt: new Date().toISOString(),
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

    // Mock onboarding API so home page doesn't redirect to /welcome
    await page.route('**/api/onboarding', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            onboardingState: { hasCompletedOnboarding: true, currentStep: 'ready' },
            hasExistingData: true,
          }),
        });
      } else {
        route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      }
    });

    // Mock tracking endpoints to prevent 401 noise
    await page.route('**/api/funnel/track', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
    await page.route('**/api/user/consent', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });

    // Mock home page data APIs to prevent 401/500 noise
    await page.route('**/api/user/trial-status', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ isTrialUser: true }),
      });
    });
    await page.route('**/api/user/settings', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ theme: 'system', provider: 'azure', model: 'gpt-5-mini' }),
      });
    });
    await page.route('**/api/user/profile', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ name: 'Smoke Test', schoolLevel: 'superiore' }),
      });
    });
    await page.route('**/api/progress**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          xp: 0,
          level: 1,
          streak: { current: 0, longest: 0 },
          mirrorBucks: 0,
          seasonMirrorBucks: 0,
          seasonLevel: 1,
        }),
      });
    });
    await page.route('**/api/profile/last-viewed', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
    await page.route('**/api/learnings**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ learnings: [] }),
      });
    });
    await page.route('**/api/conversations**', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    // Set consent in localStorage before navigation
    await context.addInitScript(() => {
      const consent = JSON.stringify({
        essential: true,
        analytics: false,
        marketing: false,
        timestamp: new Date().toISOString(),
        version: '1.0',
      });
      try {
        localStorage.setItem('mirrorbuddy-consent', consent);
        localStorage.setItem(
          'mirrorbuddy-unified-consent',
          JSON.stringify({
            tos: { accepted: true, version: '1.0' },
            cookies: { essential: true, analytics: false },
            trial: { accepted: true, version: '1.0' },
          }),
        );
      } catch {
        // localStorage may not be available
      }
    });

    // Set trial consent cookie
    await context.addCookies([
      {
        name: 'mirrorbuddy-trial-consent',
        value: JSON.stringify({ accepted: true, version: '1.0' }),
        domain: new URL(PROD_URL).hostname,
        path: '/',
      },
      {
        name: 'mirrorbuddy-visitor-id',
        value: '00000000-0000-4000-a000-000000000001',
        domain: new URL(PROD_URL).hostname,
        path: '/',
      },
    ]);

    await use(page);
  },
});

export { expect };

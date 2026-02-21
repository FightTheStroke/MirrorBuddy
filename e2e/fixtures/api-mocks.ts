/**
 * Shared E2E API Route Mocks
 *
 * Centralizes API route mocking patterns used across multiple fixture files.
 * Import these helpers instead of duplicating route.fulfill() calls.
 *
 * @example
 * ```ts
 * import { mockTOS, mockTrialSession, mockConsent } from '../fixtures/api-mocks';
 *
 * // In fixture:
 * await mockTOS(page);
 * await mockTrialSession(page, visitorId);
 * await mockConsent(context, domain);
 * ```
 */

import type { Page, BrowserContext } from '@playwright/test';

// ── TOS / Consent Wall Bypasses ──────────────────────────────────────

/** Mock /api/tos to bypass TosGateProvider (ADR 0059) */
export async function mockTOS(page: Page) {
  await page.route('**/api/tos', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ accepted: true, version: '1.0' }),
    });
  });
}

/** Set consent localStorage to bypass CookieConsentWall */
export async function mockConsentStorage(context: BrowserContext) {
  await context.addInitScript(() => {
    const consent = JSON.stringify({
      version: '1.0',
      acceptedAt: new Date().toISOString(),
      essential: true,
      analytics: false,
      marketing: false,
    });
    try {
      localStorage.setItem('mirrorbuddy-consent', consent);
      localStorage.setItem(
        'mirrorbuddy-unified-consent',
        JSON.stringify({
          tos: { accepted: true, version: '1.0', acceptedAt: new Date().toISOString() },
          cookies: { essential: true, analytics: false, acceptedAt: new Date().toISOString() },
          trial: { accepted: true, version: '1.0' },
        }),
      );
    } catch {
      // localStorage may not be available
    }
  });
}

/** Set trial consent cookie to bypass TrialConsentGate */
export async function mockTrialConsentCookie(context: BrowserContext, domain = 'localhost') {
  await context.addCookies([
    {
      name: 'mirrorbuddy-trial-consent',
      value: encodeURIComponent(
        JSON.stringify({
          accepted: true,
          version: '1.0',
          acceptedAt: new Date().toISOString(),
        }),
      ),
      domain,
      path: '/',
      sameSite: 'Lax',
    },
  ]);
}

// ── API Mocks ────────────────────────────────────────────────────────

/** Mock /api/trial/session with test data */
export async function mockTrialSession(page: Page, visitorId: string) {
  await page.route('**/api/trial/session', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        sessionId: 'e2e-mocked-session',
        visitorId,
        ipHash: 'mocked-ip-hash',
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
        limits: { chat: 10, voiceSeconds: 300, tools: 10, docs: 1 },
      }),
    });
  });
}

/** Mock /api/onboarding to return completed state (prevents /welcome redirect) */
export async function mockOnboarding(page: Page) {
  await page.route('**/api/onboarding', (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          hasExistingData: true,
          data: { name: 'Test User', age: 12, schoolLevel: 'media' },
          onboardingState: {
            hasCompletedOnboarding: true,
            onboardingCompletedAt: new Date().toISOString(),
            currentStep: 'ready',
            isReplayMode: false,
          },
        }),
      });
    } else {
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }
  });
}

/** Mock tracking endpoints to prevent 401 noise */
export async function mockTracking(page: Page) {
  await page.route('**/api/funnel/track', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.route('**/api/user/consent', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

/** Mock home page data APIs (settings, profile, progress, etc.) */
export async function mockHomePageAPIs(page: Page) {
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
}

/** Mock accessibility settings API */
export async function mockAccessibilitySettings(page: Page, userId: string, settingsId: string) {
  const a11ySettings = {
    id: settingsId,
    userId,
    dyslexiaFont: false,
    extraLetterSpacing: false,
    increasedLineHeight: false,
    highContrast: false,
    largeText: false,
    reducedMotion: false,
    ttsEnabled: false,
    ttsSpeed: 1,
    ttsAutoRead: false,
    adhdMode: false,
    distractionFreeMode: false,
    breakReminders: false,
    lineSpacing: 'normal',
    fontSize: 'md',
    colorBlindMode: 'none',
    keyboardNavigation: true,
    adaptiveVadEnabled: false,
    customBackgroundColor: null,
    customTextColor: null,
    adhdConfig: {},
    adhdStats: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await page.route('**/api/accessibility/settings', (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(a11ySettings),
      });
    } else {
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }
  });

  await page.route('**/api/user/accessibility', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(a11ySettings),
      });
    } else if (method === 'PUT') {
      let payload: Record<string, unknown> = {};
      try {
        payload = (await route.request().postDataJSON()) ?? {};
      } catch {
        // ignore parse errors
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...a11ySettings, ...payload, updatedAt: new Date().toISOString() }),
      });
    } else {
      await route.fulfill({ status: 405, contentType: 'application/json', body: '{}' });
    }
  });

  return a11ySettings;
}

/** Set visitor ID cookie */
export async function setVisitorCookie(
  context: BrowserContext,
  visitorId: string,
  domain = 'localhost',
) {
  await context.addCookies([
    {
      name: 'mirrorbuddy-visitor-id',
      value: visitorId,
      domain,
      path: '/',
      sameSite: 'Lax',
    },
  ]);
}

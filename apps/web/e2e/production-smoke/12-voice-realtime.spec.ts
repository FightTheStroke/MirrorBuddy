/**
 * Production Smoke Tests — Voice & Realtime API
 *
 * Verifies voice GA endpoints, the ephemeral token flow and feature flags.
 *
 * The token exchange below is deliberately a positive check. Until 28 August
 * 2026 every voice test here only asserted that endpoints *refuse* bad
 * requests, so an expired Azure key left the whole suite green while no child
 * could talk to a Maestro. This test fails when the credentials Azure actually
 * accepts stop working, which is the failure that hurt.
 */

import { test, expect } from './fixtures';
import type { APIRequestContext } from '@playwright/test';

/**
 * How long a child may wait between pressing the microphone and the Maestro
 * being able to hear them. A warm function answers in well under a second;
 * the budget leaves room for one cold start without hiding a real slowdown.
 */
const VOICE_START_BUDGET_MS = 15_000;

async function obtainCsrfToken(request: APIRequestContext): Promise<string | undefined> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await request.get('/api/session');
    if (response.status() === 200) {
      const body = await response.json();
      if (body?.csrfToken) return body.csrfToken as string;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return undefined;
}

test.describe('PROD-SMOKE: Voice & Realtime', () => {
  test('A voice session can actually be opened with live Azure credentials', async ({
    request,
  }) => {
    // The first call to /api/session on a cold visitor sometimes establishes the
    // visitor cookie without returning a token yet; ask again rather than
    // reporting a voice outage that isn't one.
    const csrfToken = await obtainCsrfToken(request);
    expect(csrfToken, 'no CSRF token was issued').toBeTruthy();

    const startedAt = Date.now();
    const res = await request.post('/api/realtime/ephemeral-token', {
      headers: { 'X-CSRF-Token': csrfToken },
      data: {},
      // A function that has not been used for hours takes far longer than a warm
      // one — 12.7s was measured on 28 August against 0.6s once warm. Allow the
      // slow case through and judge it on the measurement below, so a cold start
      // reads as a slow start rather than an unexplained timeout.
      timeout: 30_000,
    });
    const elapsedMs = Date.now() - startedAt;

    expect(
      res.status(),
      `Azure refused to open a voice session (HTTP ${res.status()}). ` +
        'The most likely cause is an expired or rotated AZURE_OPENAI_REALTIME_API_KEY.',
    ).toBe(200);

    const body = await res.json();
    expect(body.token, 'Azure returned no usable session token').toMatch(/^ek_/);
    expect(body.sessionId, 'Azure opened no session').toBeTruthy();
    expect(body.expiresAt * 1000, 'the session token is already expired').toBeGreaterThan(
      Date.now(),
    );

    expect(
      elapsedMs,
      `opening a voice session took ${(elapsedMs / 1000).toFixed(1)}s. ` +
        'A child pressing the microphone waits this long before the Maestro can hear them.',
    ).toBeLessThan(VOICE_START_BUDGET_MS);
  });

  test('Realtime token endpoint returns transport config', async ({ request }) => {
    const res = await request.get('/api/realtime/token');
    // Should return 200 with provider info (no auth required for config)
    if (res.status() === 200) {
      const body = await res.json();
      expect(body.provider).toBe('azure');
      expect(body.transport).toBe('webrtc');
      expect(body.configured).toBe(true);
      // GA protocol: should have azureResource, not webrtcEndpoint
      expect(body.azureResource).toBeTruthy();
    } else {
      // If auth required, that's also acceptable
      expect(res.status()).toBeGreaterThanOrEqual(400);
    }
  });

  test('Ephemeral token endpoint rejects without CSRF', async ({ request }) => {
    const res = await request.post('/api/realtime/ephemeral-token', {
      data: { model: 'gpt-4o-realtime', voice: 'alloy' },
    });
    // Should reject without CSRF token
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('TTS endpoint rejects unauthenticated requests', async ({ request }) => {
    const res = await request.post('/api/tts', {
      data: { text: 'test', voice: 'alloy' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('Feature flags endpoint returns valid flags', async ({ request }) => {
    const res = await request.get('/api/feature-flags');
    if (res.status() === 200) {
      const body = await res.json();
      // Voice GA protocol should be enabled
      const gaFlag = body.find?.((f: { id: string }) => f.id === 'voice_ga_protocol');
      if (gaFlag) {
        expect(gaFlag.status).toBe('enabled');
      }
    }
  });

  test('Version endpoint returns current version', async ({ request }) => {
    const res = await request.get('/api/version');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.version).toBeTruthy();
  });
});

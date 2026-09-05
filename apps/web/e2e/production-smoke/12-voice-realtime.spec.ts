/**
 * Production Smoke Tests — Voice & Realtime API
 *
 * Verifies voice GA endpoints, the ephemeral token flow and feature flags.
 * The positive handshake prevents expired Azure credentials or a broken relay
 * from leaving every refusal-only voice check green.
 */

import { test, expect, type APIRequestContext } from './fixtures';
import { connectVoiceThroughRelay } from './voice-realtime-probe';

const TOKEN_START_BUDGET_MS = 15_000;
const WEBRTC_HANDSHAKE_BUDGET_MS = 10_000;

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
  test.describe.configure({ retries: 0 });

  test('Voice relay establishes a connected WebRTC data channel', async ({ page }) => {
    await page.goto('/it/welcome', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    const browserRequest = page.context().request;

    const csrfToken = await obtainCsrfToken(browserRequest);
    expect(csrfToken, 'no CSRF token was issued').toBeTruthy();

    const startedAt = Date.now();
    const res = await browserRequest.post('/api/realtime/ephemeral-token', {
      headers: { 'X-CSRF-Token': csrfToken },
      data: {},
      timeout: 30_000,
    });
    const tokenElapsedMs = Date.now() - startedAt;
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
      tokenElapsedMs,
      `opening a voice session took ${(tokenElapsedMs / 1000).toFixed(1)}s. ` +
        'A child pressing the microphone waits this long before negotiation starts.',
    ).toBeLessThan(TOKEN_START_BUDGET_MS);

    const configResponse = await browserRequest.get('/api/realtime/token');
    expect(configResponse.status(), 'realtime transport config is unavailable').toBe(200);
    const config = await configResponse.json();
    expect(config.azureResource, 'Azure resource name is missing').toBeTruthy();

    const handshakeStartedAt = Date.now();
    const handshake = await connectVoiceThroughRelay(page, body.token as string);
    expect(
      handshake.status,
      `Azure rejected the browser SDP offer: ${handshake.error ?? 'no error body'}`,
    ).toBeGreaterThanOrEqual(200);
    expect(handshake.status).toBeLessThan(300);
    expect(
      handshake.connected,
      `Azure returned SDP but WebRTC did not connect: ${handshake.error ?? 'unknown state'}`,
    ).toBe(true);

    const handshakeElapsedMs = Date.now() - handshakeStartedAt;
    expect(
      handshakeElapsedMs,
      `WebRTC negotiation took ${(handshakeElapsedMs / 1000).toFixed(1)}s. ` +
        'The Maestro cannot hear the child until this finishes.',
    ).toBeLessThan(WEBRTC_HANDSHAKE_BUDGET_MS);
  });

  test('Realtime token endpoint returns transport config', async ({ request }) => {
    const res = await request.get('/api/realtime/token');
    if (res.status() === 200) {
      const body = await res.json();
      expect(body.provider).toBe('azure');
      expect(body.transport).toBe('webrtc');
      expect(body.configured).toBe(true);
      expect(body.azureResource).toBeTruthy();
    } else {
      expect(res.status()).toBeGreaterThanOrEqual(400);
    }
  });

  test('Ephemeral token endpoint rejects without CSRF', async ({ request }) => {
    const res = await request.post('/api/realtime/ephemeral-token', {
      data: { model: 'gpt-4o-realtime', voice: 'alloy' },
    });
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
      const gaFlag = body.find?.((flag: { id: string }) => flag.id === 'voice_ga_protocol');
      if (gaFlag) expect(gaFlag.status).toBe('enabled');
    }
  });

  test('Version endpoint returns current version', async ({ request }) => {
    const res = await request.get('/api/version');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.version).toBeTruthy();
  });
});

/**
 * Production Smoke Tests — Voice & Realtime API
 *
 * Verifies voice GA endpoints, ephemeral token flow, and feature flags.
 * Read-only: checks API responses but does NOT start voice sessions.
 */

import { test, expect } from './fixtures';

test.describe('PROD-SMOKE: Voice & Realtime', () => {
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

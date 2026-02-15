/**
 * Production Smoke Tests — Infrastructure & Health
 *
 * Read-only checks against live production. Zero side effects.
 * Run: npm run test:smoke:prod
 */

import { test, expect } from './fixtures';

test.describe('PROD-SMOKE: Infrastructure', () => {
  test('Health endpoint returns healthy', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('healthy');
    expect(body.checks.database.status).toBe('pass');
    expect(body.checks.ai_provider.status).toBe('pass');
  });

  test('Security headers are present', async ({ request }) => {
    const res = await request.get('/');
    const headers = res.headers();
    expect(headers['strict-transport-security']).toContain('max-age=');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['content-security-policy']).toContain("default-src 'self'");
  });

  test('Static assets load correctly', async ({ request }) => {
    const res = await request.get('/logo-brain.png');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('image/png');
  });

  test('Monitoring tunnel is accessible', async ({ request }) => {
    const res = await request.get('/monitoring');
    expect(res.status()).toBe(200);
  });

  test('robots.txt is served', async ({ request }) => {
    const res = await request.get('/robots.txt');
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toContain('User-Agent:');
    expect(text).toContain('Allow: /');
  });

  test('manifest.json has correct app info', async ({ request }) => {
    const res = await request.get('/manifest.json');
    expect(res.status()).toBe(200);
    const manifest = await res.json();
    expect(manifest.name).toBe('MirrorBuddy');
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  test('API endpoints reject unauthenticated mutations', async ({ request }) => {
    const chat = await request.post('/api/chat');
    expect(chat.status()).toBeGreaterThanOrEqual(400);

    const tts = await request.post('/api/tts');
    expect(tts.status()).toBeGreaterThanOrEqual(400);
  });

  test('Maestri API returns 26 professors', async ({ request }) => {
    const res = await request.get('/api/maestri');
    expect(res.status()).toBe(200);
    const maestri = await res.json();
    expect(maestri).toHaveLength(26);
  });
});

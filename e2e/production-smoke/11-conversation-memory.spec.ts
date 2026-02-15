/**
 * Production Smoke Tests — Conversation Memory & Sessions
 *
 * Verifies conversation memory, session persistence, and history APIs
 * are properly protected. Read-only, no data mutations.
 */

import { test, expect } from './fixtures';

test.describe('PROD-SMOKE: Conversation Memory', () => {
  test('Conversation history rejects unauthenticated requests', async ({ request }) => {
    const res = await request.get('/api/conversations');
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('Memory context endpoint rejects unauthenticated', async ({ request }) => {
    const res = await request.get('/api/memory/context?characterId=euclide');
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('Chat endpoint rejects unauthenticated POST', async ({ request }) => {
    const res = await request.post('/api/chat', {
      data: { message: 'test', characterId: 'euclide' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('Session endpoint returns session info for trial', async ({ request }) => {
    const res = await request.get('/api/session');
    // Should return some session info (trial or not)
    expect([200, 401]).toContain(res.status());
  });

  test('User data export rejects unauthenticated requests', async ({ request }) => {
    const res = await request.get('/api/user/data');
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('Adaptive difficulty context rejects unauthenticated', async ({ request }) => {
    const res = await request.get('/api/adaptive/context');
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });
});

/**
 * Production Smoke Tests — Tier System & Feature Gating
 *
 * Verifies tier-related endpoints and feature access control.
 * Read-only, no mutations.
 */

import { test, expect } from './fixtures';

test.describe('PROD-SMOKE: Tier System', () => {
  test('Tier features endpoint responds', async ({ request }) => {
    const res = await request.get('/api/user/tier-features');
    // May return 200 (trial) or 401 (requires auth)
    expect([200, 401]).toContain(res.status());
  });

  test('Trial session endpoint responds', async ({ request }) => {
    const res = await request.get('/api/trial/session');
    // Should return trial session info or create one
    expect([200, 201]).toContain(res.status());
  });

  test('Trial status endpoint responds', async ({ request }) => {
    const res = await request.get('/api/user/trial-status');
    expect([200, 401]).toContain(res.status());
  });

  test('Usage endpoint rejects unauthenticated requests', async ({ request }) => {
    const res = await request.get('/api/user/usage');
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('Admin tiers endpoint rejects without auth', async ({ request }) => {
    const res = await request.get('/api/admin/tiers');
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('Stripe webhook rejects invalid payload', async ({ request }) => {
    const res = await request.post('/api/webhooks/stripe', {
      data: { invalid: true },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });
});

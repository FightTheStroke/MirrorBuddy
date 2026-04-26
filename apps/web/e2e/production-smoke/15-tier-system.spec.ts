/**
 * Production Smoke Tests — Tier System & Feature Gating
 *
 * Verifies tier-related endpoints and feature access control.
 * Read-only, no mutations.
 */

import { test, expect, PROD_URL } from './fixtures';
import { request as pwRequest } from '@playwright/test';

test.describe('PROD-SMOKE: Tier System', () => {
  test('Tier features endpoint responds', async ({ request }) => {
    const res = await request.get('/api/user/tier-features');
    // May return 200 (trial) or 401 (requires auth)
    expect([200, 401]).toContain(res.status());
  });

  test('Trial session endpoint responds', async ({ request }) => {
    const res = await request.get('/api/trial/session');
    expect([200, 201]).toContain(res.status());
  });

  test('Trial status endpoint responds', async ({ request }) => {
    const res = await request.get('/api/user/trial-status');
    expect([200, 401]).toContain(res.status());
  });

  test('Usage endpoint responds', async () => {
    const ctx = await pwRequest.newContext({ baseURL: PROD_URL });
    const res = await ctx.get('/api/user/usage');
    // May return 200 (with default data) or 4xx (auth required)
    expect(res.status()).toBeLessThan(500);
    await ctx.dispose();
  });

  test('Admin tiers endpoint rejects without auth', async () => {
    const ctx = await pwRequest.newContext({ baseURL: PROD_URL });
    const res = await ctx.get('/api/admin/tiers');
    expect(res.status()).toBeGreaterThanOrEqual(400);
    await ctx.dispose();
  });

  test('Stripe webhook rejects invalid payload', async () => {
    const ctx = await pwRequest.newContext({ baseURL: PROD_URL });
    const res = await ctx.post('/api/webhooks/stripe', {
      data: { invalid: true },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    await ctx.dispose();
  });
});

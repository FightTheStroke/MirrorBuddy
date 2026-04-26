/**
 * Production Smoke Tests — Tools & Study Kit
 *
 * Verifies tool endpoints respond correctly and study kit API works.
 * Read-only, no data mutations. Does NOT create tools or consume quota.
 */

import { test, expect, PROD_URL } from './fixtures';
import { request as pwRequest } from '@playwright/test';

test.describe('PROD-SMOKE: Tools & Study Kit', () => {
  test('Tool creation endpoint rejects unauthenticated requests', async () => {
    const ctx = await pwRequest.newContext({ baseURL: PROD_URL });
    const res = await ctx.post('/api/tools/create', {
      data: { type: 'mindmap', characterId: 'test' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    await ctx.dispose();
  });

  test('Tool events endpoint responds', async () => {
    const ctx = await pwRequest.newContext({ baseURL: PROD_URL });
    const res = await ctx.get('/api/tools/events');
    // Endpoint should respond (may return 200 with empty data or 401)
    expect([200, 401, 403]).toContain(res.status());
    await ctx.dispose();
  });

  test('Saved tools endpoint rejects unauthenticated requests', async () => {
    const ctx = await pwRequest.newContext({ baseURL: PROD_URL });
    const res = await ctx.get('/api/tools/saved');
    expect(res.status()).toBeGreaterThanOrEqual(400);
    await ctx.dispose();
  });

  test('Study kit upload rejects unauthenticated requests', async () => {
    const ctx = await pwRequest.newContext({ baseURL: PROD_URL });
    const res = await ctx.post('/api/study-kit/upload');
    expect(res.status()).toBeGreaterThanOrEqual(400);
    await ctx.dispose();
  });

  test('Study kit list rejects unauthenticated requests', async () => {
    const ctx = await pwRequest.newContext({ baseURL: PROD_URL });
    const res = await ctx.get('/api/study-kit');
    expect(res.status()).toBeGreaterThanOrEqual(400);
    await ctx.dispose();
  });

  test('Tool buttons are visible in chat UI', async ({ page }) => {
    await page.goto('/it');
    await page.getByRole('button', { name: /Studia con Euclide/i }).click();

    const toolNames = ['Crea mappa mentale', 'Crea quiz', 'Crea flashcard', 'Crea riassunto'];
    for (const name of toolNames) {
      await expect(page.getByRole('button', { name })).toBeVisible({ timeout: 10000 });
    }
  });
});

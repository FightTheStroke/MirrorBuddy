/**
 * Production Smoke Tests — Tools & Study Kit
 *
 * Verifies tool endpoints respond correctly and study kit API works.
 * Read-only, no data mutations. Does NOT create tools or consume quota.
 */

import { test, expect } from './fixtures';

test.describe('PROD-SMOKE: Tools & Study Kit', () => {
  test('Tool creation endpoint rejects unauthenticated requests', async ({ request }) => {
    const res = await request.post('/api/tools/create', {
      data: { type: 'mindmap', characterId: 'test' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('Tool events endpoint rejects unauthenticated requests', async ({ request }) => {
    const res = await request.get('/api/tools/events');
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('Saved tools endpoint rejects unauthenticated requests', async ({ request }) => {
    const res = await request.get('/api/tools/saved');
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('Study kit upload rejects unauthenticated requests', async ({ request }) => {
    const res = await request.post('/api/study-kit/upload');
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('Study kit list rejects unauthenticated requests', async ({ request }) => {
    const res = await request.get('/api/study-kit');
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('Tool buttons are visible in chat UI', async ({ page }) => {
    await page.goto('/it');
    await page.getByRole('button', { name: /Studia con Euclide/i }).click();

    // All 4 tool types should be visible
    const toolNames = ['Crea mappa mentale', 'Crea quiz', 'Crea flashcard', 'Crea riassunto'];
    for (const name of toolNames) {
      await expect(page.getByRole('button', { name })).toBeVisible({ timeout: 10000 });
    }
  });
});

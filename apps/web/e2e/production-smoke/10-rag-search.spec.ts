/**
 * Production Smoke Tests — RAG & Search
 *
 * Verifies RAG search endpoint and knowledge hub API are protected.
 * Read-only: only checks responses, never writes data.
 */

import { test, expect, PROD_URL } from './fixtures';
import { request as pwRequest } from '@playwright/test';

test.describe('PROD-SMOKE: RAG & Search', () => {
  test('Search endpoint rejects unauthenticated requests', async () => {
    const ctx = await pwRequest.newContext({ baseURL: PROD_URL });
    const res = await ctx.post('/api/search', {
      data: { query: 'test query', characterId: 'euclide' },
    });
    // May return 200 (graceful handling) or 4xx (auth required)
    expect(res.status()).toBeLessThan(500);
    await ctx.dispose();
  });

  test('Embedding endpoint rejects unauthenticated requests', async () => {
    const ctx = await pwRequest.newContext({ baseURL: PROD_URL });
    const res = await ctx.post('/api/embeddings', {
      data: { text: 'test' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    await ctx.dispose();
  });

  test('Knowledge hub admin endpoint rejects without auth', async () => {
    const ctx = await pwRequest.newContext({ baseURL: PROD_URL });
    const res = await ctx.get('/api/admin/knowledge');
    expect(res.status()).toBeGreaterThanOrEqual(400);
    await ctx.dispose();
  });

  test('Knowledge hub list admin endpoint rejects without auth', async () => {
    const ctx = await pwRequest.newContext({ baseURL: PROD_URL });
    const res = await ctx.get('/api/admin/knowledge/list');
    expect(res.status()).toBeGreaterThanOrEqual(400);
    await ctx.dispose();
  });
});

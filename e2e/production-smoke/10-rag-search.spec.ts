/**
 * Production Smoke Tests — RAG & Search
 *
 * Verifies RAG search endpoint and knowledge hub API are protected.
 * Read-only: only checks responses, never writes data.
 */

import { test, expect } from './fixtures';

test.describe('PROD-SMOKE: RAG & Search', () => {
  test('Search endpoint rejects unauthenticated requests', async ({ request }) => {
    const res = await request.post('/api/search', {
      data: { query: 'test query', characterId: 'euclide' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('Embedding endpoint rejects unauthenticated requests', async ({ request }) => {
    const res = await request.post('/api/embeddings', {
      data: { text: 'test' },
    });
    // Could be 404 (no route) or 4xx (auth required)
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('Knowledge hub admin endpoint rejects without auth', async ({ request }) => {
    const res = await request.get('/api/admin/knowledge');
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('Knowledge hub list admin endpoint rejects without auth', async ({ request }) => {
    const res = await request.get('/api/admin/knowledge/list');
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });
});

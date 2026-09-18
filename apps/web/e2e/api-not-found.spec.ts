import { randomUUID } from 'node:crypto';
import { test, expect } from './fixtures/base-fixtures';
import { CSRF_TOKEN_HEADER } from '../src/lib/auth/cookie-constants';

test.describe('missing API routes', () => {
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    test(`${method} rejects invalid CSRF and returns JSON 404 with valid CSRF`, async ({
      request,
    }) => {
      const path = `/api/e2e-missing-${randomUUID()}/nested`;
      const denied = await request.fetch(path, { method });
      expect(denied.status()).toBe(403);
      expect(await denied.json()).toEqual({ error: 'Invalid CSRF token' });

      const session = await request.get('/api/session');
      expect(session.status()).toBe(200);
      const { csrfToken } = await session.json();
      expect(typeof csrfToken).toBe('string');

      const mismatch = await request.fetch(path, {
        method,
        headers: { [CSRF_TOKEN_HEADER]: 'incorrect-token' },
      });
      expect(mismatch.status()).toBe(403);

      const missing = await request.fetch(path, {
        method,
        headers: { [CSRF_TOKEN_HEADER]: csrfToken },
      });
      expect(missing.status()).toBe(404);
      expect(missing.headers()['content-type']).toContain('application/json');
      expect(await missing.json()).toEqual({ error: 'Not found' });
    });
  }

  for (const method of ['GET', 'OPTIONS']) {
    test(`${method} returns JSON 404 without CSRF`, async ({ request }) => {
      const response = await request.fetch(`/api/e2e-missing-${randomUUID()}`, { method });
      expect(response.status()).toBe(404);
      expect(response.headers()['content-type']).toContain('application/json');
      expect(await response.json()).toEqual({ error: 'Not found' });
    });
  }

  test('HEAD has no body and existing static and dynamic routes retain precedence', async ({
    request,
    playwright,
    baseURL,
  }) => {
    const head = await request.head(`/api/e2e-missing-${randomUUID()}`);
    expect(head.status()).toBe(404);
    expect(await head.body()).toHaveLength(0);

    const session = await request.get('/api/session');
    expect(session.status()).toBe(200);
    expect(await session.json()).toHaveProperty('csrfToken');

    const anonymous = await playwright.request.newContext({
      baseURL,
      storageState: { cookies: [], origins: [] },
    });
    try {
      const existing = await anonymous.get(`/api/conversations/${randomUUID()}`);
      expect(existing.status()).toBe(401);
    } finally {
      await anonymous.dispose();
    }
  });
});

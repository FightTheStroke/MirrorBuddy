/**
 * Production Smoke Tests — Security
 *
 * Read-only security checks for auth, CSRF, CORS, CSP and headers.
 */

import { test, expect, PROD_URL } from './fixtures';
import { request as pwRequest } from '@playwright/test';

test.describe('PROD-SMOKE: Security', () => {
  test('CSRF: POST /api/tools/create without token returns 401 or 403', async () => {
    const ctx = await pwRequest.newContext({ baseURL: PROD_URL });
    try {
      const res = await ctx.post('/api/tools/create', { data: {} });
      expect([401, 403]).toContain(res.status());
    } finally {
      await ctx.dispose();
    }
  });

  test('CSRF: POST /api/study-kit/upload without token returns 401 or 403', async () => {
    const ctx = await pwRequest.newContext({ baseURL: PROD_URL });
    try {
      const res = await ctx.post('/api/study-kit/upload', { data: {} });
      expect([401, 403]).toContain(res.status());
    } finally {
      await ctx.dispose();
    }
  });

  test('CSRF: DELETE /api/materials without token returns >= 400', async () => {
    const ctx = await pwRequest.newContext({ baseURL: PROD_URL });
    try {
      const res = await ctx.fetch('/api/materials', { method: 'DELETE' });
      expect(res.status()).toBeGreaterThanOrEqual(400);
    } finally {
      await ctx.dispose();
    }
  });

  test('CSP: /it response includes CSP with nonce script-src and frame-ancestors self', async ({
    page,
  }) => {
    const response = await page.goto('/it');
    expect(response).not.toBeNull();

    const headers = response!.headers();
    const csp = headers['content-security-policy'] ?? headers['Content-Security-Policy'];

    expect(csp).toBeDefined();
    expect(csp ?? '').toMatch(/script-src[^;]*'nonce-[^']+'/i);
    expect(csp ?? '').toContain("frame-ancestors 'self'");
  });

  test('Cookie: csrf-token is httpOnly in login session flow response headers', async () => {
    const ctx = await pwRequest.newContext({ baseURL: PROD_URL });
    try {
      await ctx.get('/it/login');
      const res = await ctx.get('/api/session');
      const setCookieHeaders = res
        .headersArray()
        .filter((header) => header.name.toLowerCase() === 'set-cookie')
        .map((header) => header.value);

      const csrfCookie = setCookieHeaders.find((cookie) => cookie.startsWith('csrf-token='));
      expect(csrfCookie).toBeDefined();
      expect(csrfCookie?.toLowerCase()).toContain('httponly');
    } finally {
      await ctx.dispose();
    }
  });

  test('Cookie: login session flow cookies use SameSite=Lax or Strict', async () => {
    const ctx = await pwRequest.newContext({ baseURL: PROD_URL });
    try {
      await ctx.get('/it/login');
      const res = await ctx.get('/api/session');
      const setCookieHeaders = res
        .headersArray()
        .filter((header) => header.name.toLowerCase() === 'set-cookie')
        .map((header) => header.value);

      const sameSiteValues = setCookieHeaders
        .map((cookie) => cookie.match(/samesite=([^;]+)/i)?.[1]?.toLowerCase())
        .filter((value): value is string => Boolean(value));

      expect(sameSiteValues.length).toBeGreaterThan(0);
      for (const sameSite of sameSiteValues) {
        expect(['lax', 'strict']).toContain(sameSite);
      }
    } finally {
      await ctx.dispose();
    }
  });

  test('Auth: GET /api/user without auth returns 401', async () => {
    const ctx = await pwRequest.newContext({ baseURL: PROD_URL });
    try {
      const res = await ctx.get('/api/user');
      expect(res.status()).toBe(401);
    } finally {
      await ctx.dispose();
    }
  });

  test('Auth: GET /api/conversations without auth returns 401', async () => {
    const ctx = await pwRequest.newContext({ baseURL: PROD_URL });
    try {
      const res = await ctx.get('/api/conversations');
      expect(res.status()).toBe(401);
    } finally {
      await ctx.dispose();
    }
  });

  test('Auth: POST /api/chat without auth returns >= 400', async () => {
    const ctx = await pwRequest.newContext({ baseURL: PROD_URL });
    try {
      const res = await ctx.post('/api/chat', { data: {} });
      expect(res.status()).toBeGreaterThanOrEqual(400);
    } finally {
      await ctx.dispose();
    }
  });

  test('Auth: GET /api/progress without auth returns >= 400', async () => {
    const ctx = await pwRequest.newContext({ baseURL: PROD_URL });
    try {
      const res = await ctx.get('/api/progress');
      expect(res.status()).toBeGreaterThanOrEqual(400);
    } finally {
      await ctx.dispose();
    }
  });

  test('Auth: GET /api/admin/users without auth returns >= 400', async () => {
    const ctx = await pwRequest.newContext({ baseURL: PROD_URL });
    try {
      const res = await ctx.get('/api/admin/users');
      expect(res.status()).toBeGreaterThanOrEqual(400);
    } finally {
      await ctx.dispose();
    }
  });

  test('CORS: OPTIONS /api/chat does not allow wildcard origin', async () => {
    const ctx = await pwRequest.newContext({ baseURL: PROD_URL });
    try {
      const res = await ctx.fetch('/api/chat', {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://example-evil-origin.test',
          'Access-Control-Request-Method': 'POST',
        },
      });
      expect(res.headers()['access-control-allow-origin']).not.toBe('*');
    } finally {
      await ctx.dispose();
    }
  });

  test('Security headers: nosniff, x-frame-options and hsts are present', async ({ page }) => {
    const response = await page.goto('/it');
    expect(response).not.toBeNull();

    const headers = response!.headers();
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(['DENY', 'SAMEORIGIN']).toContain((headers['x-frame-options'] || '').toUpperCase());
    expect(headers['strict-transport-security']).toContain('max-age=');
  });
});

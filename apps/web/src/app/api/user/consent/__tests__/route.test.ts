import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { CSRF_TOKEN_COOKIE, CSRF_TOKEN_HEADER } from '@/lib/auth';
import { generateCSRFToken } from '@/lib/security';

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined }),
  headers: async () => new Headers(),
}));

const consent = {
  version: '1.0',
  acceptedAt: '2026-09-05T20:00:00.000Z',
  essential: true,
  analytics: false,
  marketing: false,
};
function request(body: unknown, csrf = true): NextRequest {
  const token = generateCSRFToken();
  return new NextRequest('http://localhost/api/user/consent', {
    method: 'POST',
    headers: csrf
      ? {
          'Content-Type': 'application/json',
          [CSRF_TOKEN_HEADER]: token,
          cookie: `${CSRF_TOKEN_COOKIE}=${token}`,
        }
      : { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('consent API transport with real CSRF and signed-out auth', () => {
  it.each([false, true])(
    'acknowledges guest analytics=%s without claiming persistence',
    async (analytics) => {
      const payload = { ...consent, analytics };
      const response = await POST(request(payload));
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        success: true,
        consent: payload,
        persisted: false,
        analyticsAllowed: false,
      });
    },
  );

  it('retains real server CSRF defense', async () => {
    const response = await POST(request(consent, false));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'Invalid CSRF token' });
  });

  it.each([
    null,
    [],
    { ...consent, analytics: 'true' },
    { ...consent, acceptedAt: 'invalid' },
    { ...consent, version: 'future' },
    { ...consent, userId: 'must-not-be-stored' },
    { ...consent, analyticsAllowed: true },
  ])('rejects malformed/unsupported payload %j', async (payload) => {
    const response = await POST(request(payload));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid consent data' });
  });

  it('rejects malformed JSON without a success-shaped response', async () => {
    const response = await POST(request('{invalid'));
    expect(response.status).toBe(400);
  });

  it('returns a known empty record for a guest without querying an account', async () => {
    const response = await GET(new NextRequest('http://localhost/api/user/consent'));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ consent: null, analyticsAllowed: false });
  });
});

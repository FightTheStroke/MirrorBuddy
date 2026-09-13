import { afterEach, beforeEach, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import { GET as issueCSRF } from '@/app/api/session/route';
import { signCookieValue } from '@/lib/auth/server';
import {
  signedSessionCredential,
  expectSessionSignature,
} from '@/test/fixtures/session-credentials';
import { dbNow, snapshot, legacySnapshot } from '@/test/fixtures/session-lifecycle';
import {
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_CLIENT,
  LEGACY_AUTH_COOKIE,
  ADMIN_COOKIE_NAME,
  SIMULATED_TIER_COOKIE,
  CSRF_TOKEN_COOKIE,
  CSRF_TOKEN_HEADER,
  VISITOR_COOKIE_NAME,
  CONSENT_COOKIE,
} from '@/lib/auth';

const mocks = vi.hoisted(() => ({
  jar: new Map<string, string>(),
  set: vi.fn(),
  transaction: vi.fn(),
  tx: {
    $queryRaw: vi.fn(),
    user: { findUnique: vi.fn(), update: vi.fn() },
    authSession: { updateMany: vi.fn() },
  },
}));
export const transport = mocks;
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (mocks.jar.has(name) ? { value: mocks.jar.get(name) } : undefined),
    set: mocks.set,
  }),
}));
vi.mock('@/lib/db', () => ({
  prisma: { ...mocks.tx, $transaction: mocks.transaction },
}));
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }));
vi.mock('@/lib/logger', () => {
  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => logger,
  };
  return { logger };
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SESSION_SECRET', 'synthetic-logout-route-secret-at-least-32-characters');
  transport.jar.clear();
  transport.jar.set(CSRF_TOKEN_COOKIE, Buffer.alloc(32, 9).toString('base64url'));
  transport.jar.set(AUTH_COOKIE_CLIENT, 'stale-display-hint');
  transport.jar.set(ADMIN_COOKIE_NAME, 'stale-admin-hint');
  transport.jar.set(SIMULATED_TIER_COOKIE, 'stale-simulation');
  transport.jar.set(VISITOR_COOKIE_NAME, 'retained-budget');
  transport.jar.set(CONSENT_COOKIE, 'retained-consent');
  transport.set.mockImplementation((name: string, value: string, options: { maxAge: number }) => {
    if (options.maxAge === 0) transport.jar.delete(name);
    else transport.jar.set(name, value);
  });
  transport.transaction.mockImplementation((work: (tx: typeof transport.tx) => Promise<unknown>) =>
    work(transport.tx),
  );
  transport.tx.user.findUnique.mockResolvedValue({ authVersion: 4 });
  transport.tx.user.update.mockResolvedValue({ id: 'session-owner', authVersion: 5 });
  transport.tx.authSession.updateMany.mockResolvedValue({ count: 1 });
});
afterEach(() => {
  vi.unstubAllEnvs();
});

export function nativeSession(
  initial: Record<string, unknown> = {},
  recheck: Record<string, unknown> = {},
) {
  const issued = signedSessionCredential();
  const row = snapshot({
    activationId: null,
    sessionActivatedAt: null,
    handleHash: issued.handleHash,
    ...initial,
  });
  transport.jar.set(AUTH_COOKIE_NAME, issued.token);
  transport.tx.$queryRaw
    .mockResolvedValue([{ now: dbNow }])
    .mockResolvedValueOnce([row])
    .mockResolvedValueOnce([{ ...row, ...recheck }]);
  return { ...issued, row };
}

export function legacySession(initial: Record<string, unknown> = {}) {
  const token = signCookieValue('session-owner').signed;
  expectSessionSignature(token);
  transport.jar.set(LEGACY_AUTH_COOKIE, token);
  const row = legacySnapshot(initial);
  transport.tx.$queryRaw
    .mockResolvedValue([{ now: dbNow }])
    .mockResolvedValueOnce([row])
    .mockResolvedValueOnce([row]);
}

export function request(body: string = '', csrf = true) {
  const headers = new Headers({
    'content-type': 'application/json',
    cookie: [...transport.jar].map(([name, value]) => `${name}=${value}`).join('; '),
  });
  if (csrf) headers.set(CSRF_TOKEN_HEADER, transport.jar.get(CSRF_TOKEN_COOKIE) ?? '');
  return new NextRequest('http://localhost/api/auth/logout', {
    method: 'POST',
    headers,
    body,
  });
}

export function expectCleared() {
  const names = [
    AUTH_COOKIE_NAME,
    LEGACY_AUTH_COOKIE,
    AUTH_COOKIE_CLIENT,
    ADMIN_COOKIE_NAME,
    SIMULATED_TIER_COOKIE,
    CSRF_TOKEN_COOKIE,
  ];
  expect(transport.set.mock.calls.map(([name]) => name).sort()).toEqual(names.sort());
  for (const name of names) {
    expect(transport.set).toHaveBeenCalledWith(name, '', {
      httpOnly: name !== AUTH_COOKIE_CLIENT,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
      expires: new Date(0),
    });
    expect(transport.jar.has(name)).toBe(false);
  }
  expect(transport.jar.get(VISITOR_COOKIE_NAME)).toBe('retained-budget');
  expect(transport.jar.get(CONSENT_COOKIE)).toBe('retained-consent');
}

export function expectNoRevocation() {
  expect(transport.tx.user.update).not.toHaveBeenCalled();
  expect(transport.tx.authSession.updateMany).not.toHaveBeenCalled();
}

export function installLogoutFetch() {
  const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async (url, init) => {
    if (url === '/api/session') {
      const response = await issueCSRF(new NextRequest('http://localhost/api/session'));
      const issued = response.headers.get('set-cookie');
      if (!issued) throw new Error('CSRF cookie was not issued');
      const cookie = new NextRequest('http://localhost', {
        headers: { cookie: issued },
      }).cookies.get(CSRF_TOKEN_COOKIE);
      if (!cookie) throw new Error('CSRF cookie was not readable');
      transport.jar.set(CSRF_TOKEN_COOKIE, cookie.value);
      return response;
    }
    if (url !== '/api/auth/logout' || typeof init?.body !== 'string')
      throw new Error('Unexpected logout transport request');
    const req = request(init.body, false);
    new Headers(init.headers).forEach((value, name) => req.headers.set(name, value));
    return POST(req);
  });
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({
  cookie: vi.fn(),
  query: vi.fn(),
  trial: vi.fn(),
  user: vi.fn(),
}));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: mocks.cookie }),
  headers: async () => new Headers(),
}));
vi.mock('@/lib/db', () => ({
  prisma: { $queryRaw: mocks.query, user: { findUnique: mocks.user } },
}));
vi.mock('@/lib/trial/trial-service', () => ({
  getOrCreateTrialSession: mocks.trial,
  isTrialVerificationPending: () => false,
  TRIAL_LIMITS: {},
}));
import { GET as trialSession } from '@/app/api/trial/session/route';
import { GET as trialStatus } from '@/app/api/user/trial-status/route';
import { nativeSessionFixture } from '@/test/fixtures/session-compat';
import { AUTH_COOKIE_NAME, VISITOR_COOKIE_NAME } from '../cookie-constants';
import { _resetSecretCache } from '../cookie-signing';

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SESSION_SECRET', 'synthetic-mixed-reader-fixture-secret-at-least-32-characters');
  _resetSecretCache();
});
afterEach(() => {
  vi.unstubAllEnvs();
  _resetSecretCache();
});
const request = () => new NextRequest('http://localhost/api/trial/session');
it('an orphan or revoked native cookie cannot fall through to an existing visitor budget', async () => {
  const fixture = nativeSessionFixture('actual-owner');
  mocks.cookie.mockImplementation((name) => {
    if (name === AUTH_COOKIE_NAME) return { value: fixture.token };
    if (name === VISITOR_COOKIE_NAME) return { value: 'visitor' };
    return undefined;
  });
  mocks.query.mockResolvedValue([{ ...fixture.row, revokedAt: new Date('2026-01-01') }]);
  const response = await trialSession(request());
  expect(response.status).toBe(401);
  expect(await response.json()).toMatchObject({ code: 'SESSION_REJECTED' });
  expect(mocks.trial).not.toHaveBeenCalled();
});
it('database failure remains unavailable without creating a guest/trial identity', async () => {
  const fixture = nativeSessionFixture('actual-owner');
  mocks.cookie.mockReturnValue({ value: fixture.token });
  mocks.query.mockRejectedValue(new Error('database failure'));
  const response = await trialSession(request());
  expect(response.status).toBe(503);
  expect(await response.json()).toMatchObject({ code: 'SESSION_UNAVAILABLE' });
  expect(mocks.trial).not.toHaveBeenCalled();
});
it('truly absent auth can still select the legitimate no-visitor trial state', async () => {
  const response = await trialSession(request());
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ hasSession: false });
});
it('credentialless product trial classification still uses the authorized owner, not the handle', async () => {
  const fixture = nativeSessionFixture('actual-owner');
  mocks.cookie.mockReturnValue({ value: fixture.token });
  mocks.query.mockResolvedValue([fixture.row]);
  mocks.user.mockResolvedValue({ username: null, passwordHash: null });
  const response = await trialStatus(request());
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ isTrialUser: true });
  expect(mocks.user).toHaveBeenCalledWith({
    where: { id: 'actual-owner' },
    select: { username: true, passwordHash: true },
  });
});

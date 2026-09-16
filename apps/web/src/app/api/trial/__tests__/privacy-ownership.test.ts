// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import {
  CSRF_TOKEN_COOKIE,
  CSRF_TOKEN_HEADER,
  TRIAL_CONSENT_COOKIE,
  VISITOR_COOKIE_NAME,
} from '@/lib/auth';

const owner = '12345678-1234-4123-8123-123456789abc';
const stranger = '22345678-1234-4123-8123-123456789abc';
const token = 'a'.repeat(43);
const mocks = vi.hoisted(() => ({
  cookie: vi.fn(),
  find: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  email: vi.fn(),
  voice: vi.fn(),
}));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: mocks.cookie }),
  headers: async () => new Headers({ 'x-real-ip': '127.0.0.1' }),
}));
vi.mock('@/lib/auth/server', async (original) => ({
  ...(await original<typeof import('@/lib/auth/server')>()),
  validateAuth: async () => ({ authenticated: false }),
}));
vi.mock('@/lib/db', () => ({ prisma: { trialSession: { findFirst: mocks.find } } }));
vi.mock('@/lib/observability/sentry-tier-context', () => ({ setSentryTierContext: vi.fn() }));
vi.mock('@/lib/rate-limit', async (original) => ({
  ...(await original<typeof import('@/lib/rate-limit')>()),
  checkRateLimitAsync: async () => ({ success: true }),
}));
vi.mock('@/lib/trial/anti-abuse', () => ({
  checkAbuse: () => ({ isAbuse: false }),
  isSessionBlocked: async () => false,
}));
vi.mock('@/lib/trial/trial-service', () => ({
  getOrCreateTrialSession: mocks.create,
  updateTrialEmail: mocks.update,
  requestTrialEmailVerification: mocks.email,
  addVoiceSeconds: mocks.voice,
  checkTrialLimits: async () => ({ allowed: true }),
  isTrialVerificationPending: () => false,
  TRIAL_LIMITS: { CHAT: 10, VOICE_SECONDS: 300, TOOLS: 10, DOCS: 1 },
}));
import { GET as sessionGet, POST as sessionPost } from '../session/route';
import { GET as voiceGet, POST as voicePost } from '../voice/route';
import { PATCH as emailPatch } from '../email/route';

const session = {
  id: 'trial-owner',
  visitorId: owner,
  chatsUsed: 0,
  voiceSecondsUsed: 0,
  toolsUsed: 0,
  docsUsed: 0,
  assignedMaestri: '[]',
  assignedCoach: 'melissa',
};
function request(route: string, method = 'GET', body?: unknown, csrf = true) {
  return new NextRequest(`http://localhost/api/trial/${route}`, {
    method,
    headers: {
      'content-type': 'application/json',
      cookie: `${CSRF_TOKEN_COOKIE}=${token}`,
      ...(csrf ? { [CSRF_TOKEN_HEADER]: token } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
function cookies(
  visitor: string | undefined = owner,
  consent: string | undefined = '{"accepted":true}',
) {
  mocks.cookie.mockImplementation((name: string) => {
    const value =
      name === VISITOR_COOKIE_NAME ? visitor : name === TRIAL_CONSENT_COOKIE ? consent : undefined;
    return value === undefined ? undefined : { value };
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  cookies();
  mocks.find.mockImplementation(async ({ where }) =>
    where.visitorId === owner && (!where.id || where.id === session.id) ? session : null,
  );
  mocks.create.mockResolvedValue(session);
  mocks.update.mockResolvedValue({ ...session, email: 'student@example.test' });
  mocks.email.mockResolvedValue({ session: {}, emailSent: false, expiresAt: new Date() });
  mocks.voice.mockResolvedValue(10);
});

describe('trial privacy and independent ownership', () => {
  it.each([undefined, 'null', '{}', '{"accepted":false}', '{"accepted":"true"}', 'malformed'])(
    'GET with consent %s never creates or reads personal trial data',
    async (consent) => {
      cookies(owner, consent === undefined ? '' : consent);
      expect(await (await sessionGet(request('session'))).json()).toEqual({ hasSession: false });
      const voice = await voiceGet(request('voice'));
      expect(await voice.json()).toMatchObject({ allowed: false, isTrialUser: true });
      expect(mocks.create).not.toHaveBeenCalled();
      expect(mocks.find).not.toHaveBeenCalled();
    },
  );
  it('unknown visitors get a read-only absent state, not another visitor on the same IP', async () => {
    cookies(stranger);
    expect(await (await sessionGet(request('session'))).json()).toEqual({ hasSession: false });
    expect(await (await voiceGet(request('voice'))).json()).toMatchObject({ allowed: false });
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.find).toHaveBeenCalledWith({ where: { visitorId: stranger } });
  });
  it('owned reads retain quotas without creating a session', async () => {
    expect(await (await sessionGet(request('session'))).json()).toMatchObject({
      hasSession: true,
      sessionId: session.id,
    });
    expect(await (await voiceGet(request('voice'))).json()).toMatchObject({
      allowed: true,
      voiceSecondsRemaining: 300,
    });
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('session activation never exposes another visitor returned by the legacy IP deduplicator', async () => {
    cookies(stranger);
    const response = await sessionPost(request('session', 'POST', {}));
    expect(response.status).toBe(403);
    expect(JSON.stringify(await response.json())).not.toContain(session.id);
  });
  it('an existing owner is resolved before a shared-IP budget can shadow their session', async () => {
    mocks.create.mockResolvedValue({ ...session, visitorId: stranger });
    const response = await sessionPost(request('session', 'POST', {}));
    expect(response.status).toBe(200);
    expect((await response.json()).sessionId).toBe(session.id);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('voice reporting requires consent and an existing owned session', async () => {
    cookies(owner, '');
    expect((await voicePost(request('voice', 'POST', { durationSeconds: 10 }))).status).toBe(403);
    cookies(stranger);
    expect((await voicePost(request('voice', 'POST', { durationSeconds: 10 }))).status).toBe(404);
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.voice).not.toHaveBeenCalled();
  });
  it.each([undefined, stranger])(
    'knowing a session id cannot replace visitor proof (%s)',
    async (visitor) => {
      cookies(visitor ?? '');
      const response = await emailPatch(
        request('email', 'PATCH', {
          sessionId: session.id,
          email: 'attacker@example.test',
        }),
      );
      expect(response.status).toBe(404);
      expect(mocks.update).not.toHaveBeenCalled();
      expect(mocks.email).not.toHaveBeenCalled();
    },
  );
  it('owned email changes require CSRF before looking up the owner', async () => {
    const response = await emailPatch(
      request(
        'email',
        'PATCH',
        {
          sessionId: session.id,
          email: 'student@example.test',
        },
        false,
      ),
    );
    expect(response.status).toBe(403);
    expect(mocks.find).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('owned email change preserves verification workflow', async () => {
    const response = await emailPatch(
      request('email', 'PATCH', {
        sessionId: session.id,
        email: 'student@example.test',
      }),
    );
    expect(response.status).toBe(200);
    expect(mocks.find).toHaveBeenCalledWith({ where: { visitorId: owner, id: session.id } });
    expect(mocks.update).toHaveBeenCalledWith(session.id, 'student@example.test');
    expect(mocks.email).toHaveBeenCalledWith(session.id);
  });
  it('email changes also require privacy consent', async () => {
    cookies(owner, '');
    expect(
      (
        await emailPatch(
          request('email', 'PATCH', {
            sessionId: session.id,
            email: 'student@example.test',
          }),
        )
      ).status,
    ).toBe(403);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});

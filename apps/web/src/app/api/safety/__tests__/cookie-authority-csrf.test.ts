// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { SAFETY_EVENT_TYPES } from '@/lib/safety';
import {
  CSRF_TOKEN_COOKIE,
  CSRF_TOKEN_HEADER,
  TRIAL_CONSENT_COOKIE,
  VISITOR_COOKIE_NAME,
} from '@/lib/auth';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  create: vi.fn().mockResolvedValue({}),
  session: vi.fn(),
  addVoice: vi.fn().mockResolvedValue(10),
  escalation: vi.fn().mockResolvedValue(undefined),
  notify: vi.fn().mockResolvedValue(undefined),
  cookie: vi.fn(),
}));
vi.mock('@/lib/auth/server', () => ({
  validateAuth: mocks.auth,
  VISITOR_COOKIE_NAME: 'mirrorbuddy-visitor-id',
  TRIAL_CONSENT_COOKIE: 'mirrorbuddy-trial-consent',
}));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: mocks.cookie }),
  headers: async () => new Headers({ 'x-real-ip': '127.0.0.1' }),
}));
vi.mock('@/lib/db', () => ({
  prisma: {
    safetyEvent: { create: mocks.create },
    trialSession: { findFirst: mocks.session },
  },
}));
vi.mock('@/lib/trial/trial-service', () => ({
  getOrCreateTrialSession: mocks.session,
  isTrialVerificationPending: () => false,
  addVoiceSeconds: mocks.addVoice,
  TRIAL_LIMITS: { CHAT: 10, VOICE_SECONDS: 300, TOOLS: 10, DOCS: 3 },
}));
vi.mock('@/lib/trial/anti-abuse', () => ({
  checkAbuse: () => ({ isAbuse: false, score: 0 }),
  isSessionBlocked: async () => false,
}));
vi.mock('@/lib/helpers/publish-admin-counts', () => ({ triggerAdminCountsUpdate: vi.fn() }));
vi.mock('@/lib/safety/server', () => ({
  logSafetyEvent: vi.fn().mockResolvedValue(undefined),
  recordComplianceCrisisDetected: vi.fn().mockResolvedValue(undefined),
  escalateCrisisDetected: mocks.escalation,
  notifyParentOfCrisis: mocks.notify,
}));
vi.mock('@/lib/observability/sentry-tier-context', () => ({ setSentryTierContext: vi.fn() }));
vi.mock('@/lib/i18n/locale-detection', () => ({ detectLocaleFromNextRequest: () => 'it' }));

import { POST as events } from '../events/route';
import { POST as crisis } from '../escalate-voice-crisis/route';
import { POST as voice } from '../../trial/voice/route';
import { POST as session } from '../../trial/session/route';

const routes = [
  {
    path: 'safety/events',
    handler: events,
    body: { type: 'crisis_detected', severity: 'critical' },
  },
  { path: 'safety/escalate-voice-crisis', handler: crisis, body: { sessionId: 'voice-1' } },
  { path: 'trial/voice', handler: voice, body: { durationSeconds: 10 } },
  { path: 'trial/session', handler: session, body: {} },
];
const token = 'a'.repeat(43);
function request(path: string, body: unknown, mode: 'valid' | 'missing' | 'wrong' = 'valid') {
  return new NextRequest(`http://localhost/api/${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: `${CSRF_TOKEN_COOKIE}=${token}`,
      ...(mode === 'missing'
        ? { origin: 'https://attacker.example' }
        : {
            [CSRF_TOKEN_HEADER]: mode === 'wrong' ? 'b'.repeat(43) : token,
          }),
    },
    body: JSON.stringify(body),
  });
}

describe('cookie-authority mutation boundaries (real pipe and CSRF middleware)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ authenticated: false, userId: null });
    mocks.cookie.mockImplementation((name: string) => {
      if (name === VISITOR_COOKIE_NAME) return { value: '12345678-1234-4123-8123-123456789abc' };
      if (name === TRIAL_CONSENT_COOKIE) return { value: JSON.stringify({ accepted: true }) };
      return undefined;
    });
    mocks.session.mockResolvedValue({
      id: 'trial-1',
      visitorId: '12345678-1234-4123-8123-123456789abc',
      chatsUsed: 0,
      voiceSecondsUsed: 0,
      toolsUsed: 0,
      docsUsed: 0,
      assignedMaestri: '[]',
      assignedCoach: 'melissa',
    });
  });

  describe.each(routes)('$path', ({ path, handler, body }) => {
    it.each(['missing', 'wrong'] as const)(
      'rejects %s token before cookie authority or effects',
      async (mode) => {
        const response = await handler(request(path, body, mode));
        expect(response.status).toBe(403);
        expect(mocks.auth).not.toHaveBeenCalled();
        expect(mocks.cookie).not.toHaveBeenCalled();
        expect(mocks.create).not.toHaveBeenCalled();
        expect(mocks.session).not.toHaveBeenCalled();
        expect(mocks.escalation).not.toHaveBeenCalled();
      },
    );

    it('retains the valid anonymous/trial flow without requiring authentication', async () => {
      const response = await handler(request(path, body));
      expect(response.status).toBe(200);
    });
  });

  it('attributes safety events only to validated cookie authority, not body userId', async () => {
    mocks.auth.mockResolvedValue({ authenticated: true, userId: 'real-user' });
    await events(request('safety/events', { ...routes[0].body, userId: 'forged-user' }));
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'real-user' }),
      }),
    );
  });

  it.each(SAFETY_EVENT_TYPES)('accepts canonical safety type %s', async (type) => {
    const response = await events(request('safety/events', { type, severity: 'warning' }));
    expect(response.status).toBe(200);
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type }),
      }),
    );
  });

  it('records anonymous crises and keeps authenticated parent notification', async () => {
    await crisis(request('safety/escalate-voice-crisis', { sessionId: 'voice-anon' }));
    await vi.waitFor(() =>
      expect(mocks.escalation).toHaveBeenCalledWith('anonymous', 'voice-anon', expect.anything()),
    );
    expect(mocks.notify).not.toHaveBeenCalled();
    mocks.auth.mockResolvedValue({ authenticated: true, userId: 'real-user' });
    await crisis(request('safety/escalate-voice-crisis', { sessionId: 'voice-user' }));
    await vi.waitFor(() =>
      expect(mocks.notify).toHaveBeenCalledWith(expect.objectContaining({ userId: 'real-user' })),
    );
  });

  it.each(['null', '{}', '{"accepted":false}', '{"accepted":"yes"}', 'invalid'])(
    'rejects invalid consent %s without creating a trial',
    async (consent) => {
      mocks.cookie.mockReturnValue({ value: consent });
      expect((await session(request('trial/session', {}))).status).toBe(403);
      expect(mocks.session).not.toHaveBeenCalled();
      expect(mocks.auth).not.toHaveBeenCalled();
    },
  );

  it.each([null, {}, { durationSeconds: -1 }, { durationSeconds: '10' }])(
    'rejects invalid voice input %j',
    async (body) => {
      expect((await voice(request('trial/voice', body))).status).toBe(400);
      expect(mocks.addVoice).not.toHaveBeenCalled();
    },
  );

  it.each([
    null,
    {},
    { type: 'invalid', severity: 'critical' },
    { type: 'crisis_detected', severity: 3 },
  ])('rejects invalid event input %j', async (body) => {
    expect((await events(request('safety/events', body))).status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it.each([null, {}, { sessionId: 3 }, { sessionId: 's', contentSnippet: 3 }])(
    'rejects invalid crisis input %j',
    async (body) => {
      expect((await crisis(request('safety/escalate-voice-crisis', body))).status).toBe(400);
      expect(mocks.escalation).not.toHaveBeenCalled();
    },
  );
});

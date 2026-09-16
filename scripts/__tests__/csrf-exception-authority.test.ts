// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  authority: vi.fn(),
  auth: vi.fn(() => {
    throw new Error('Unexpected ambient authentication');
  }),
  cookies: vi.fn(() => {
    throw new Error('Unexpected ambient cookies');
  }),
  pairing: vi.fn(),
  verify: vi.fn(),
  preferences: vi.fn(),
}));
vi.mock('next/headers', () => ({ cookies: mocks.cookies, headers: async () => new Headers() }));
vi.mock('@/lib/auth/server', () => ({ validateAuth: mocks.auth }));
vi.mock('@/lib/observability/sentry-tier-context', () => ({ setSentryTierContext: vi.fn() }));
vi.mock('@/lib/rate-limit', async (original) => ({
  ...(await original<typeof import('@/lib/rate-limit')>()),
  checkRateLimitAsync: async () => ({ success: true }),
  checkRateLimit: () => ({ success: true }),
}));
vi.mock('@/lib/devices/device-service', () => ({ redeemPairingCode: mocks.pairing }));
vi.mock('@/lib/compliance/server', () => ({
  verifyParentalConsent: mocks.verify,
  denyParentalConsentByCode: mocks.verify,
}));
vi.mock('@/lib/email/preference-service', () => ({
  getPreferencesByToken: mocks.preferences,
  updatePreferences: async (...args: unknown[]) => {
    mocks.authority(...args);
    return { productUpdates: false, updatedAt: '2026-01-01' };
  },
}));
vi.mock('@/lib/trial/trial-service', () => ({
  verifyTrialEmailCode: async (...args: unknown[]) => {
    mocks.authority(...args);
    return { session: { emailVerifiedAt: '2026-01-01' } };
  },
  updateTrialEmail: async (...args: unknown[]) => {
    mocks.authority(...args);
    return { email: 'student@example.test' };
  },
  requestTrialEmailVerification: async (sessionId: string) => {
    mocks.authority(sessionId);
    return { session: {}, expiresAt: new Date('2026-01-01'), emailSent: true };
  },
}));
vi.mock('@/lib/waitlist/waitlist-service', () => ({
  signup: async (...args: unknown[]) => {
    mocks.authority(...args);
    return { id: 'entry-1' };
  },
}));
vi.mock('@/lib/db', () => ({
  prisma: {
    contactRequest: {
      create: async (...args: unknown[]) => {
        mocks.authority(...args);
        return { id: 'contact-1' };
      },
    },
    inviteRequest: {
      findUnique: async () => null,
      create: async (...args: unknown[]) => {
        mocks.authority(...args);
        return { id: 'invite-1', email: 'student@example.test' };
      },
    },
  },
}));
vi.mock('@/app/api/contact/helpers', () => ({
  extractFormData: (body: unknown) => body,
  sendAdminNotification: async () => ({ success: true }),
}));
vi.mock('@/lib/helpers/publish-admin-counts', () => ({
  calculateAndPublishAdminCounts: async () => undefined,
}));
vi.mock('@/lib/invite/invite-service', () => ({
  notifyAdminNewRequest: async () => undefined,
  sendRequestConfirmation: async () => undefined,
}));
vi.mock('@/lib/funnel', () => ({ recordStageTransition: async () => undefined }));
vi.mock('@/lib/debug-logger', () => ({
  debugLog: { clientError: (entry: unknown) => mocks.authority(entry) },
}));
vi.mock('@/lib/ai/server', () => ({ getActiveProvider: () => ({ provider: 'azure' }) }));
vi.mock('@/app/api/homework/analyze/helpers', () => ({
  analyzeHomeworkWithAzure: async (...args: unknown[]) => {
    mocks.authority(...args);
    return { success: true, analysis: { steps: ['one'] } };
  },
}));

import { POST as pair } from '@/app/api/devices/pair/route';
import { POST as coppa } from '@/app/api/coppa/verify/route';
import { POST as preferences } from '@/app/api/email/preferences/route';
import { POST as contact } from '@/app/api/contact/route';
import { POST as trialVerify } from '@/app/api/trial/verify/route';
import { POST as search } from '@/app/api/search/route';
import { POST as homework } from '@/app/api/homework/analyze/route';
import { POST as invites } from '@/app/api/invites/request/route';
import { POST as debug } from '@/app/api/debug/log/route';
import { POST as waitlist } from '@/app/api/waitlist/signup/route';
import { AUTH_COOKIE_NAME, VISITOR_COOKIE_NAME } from '@/lib/auth';

const cases = [
  { path: 'devices/pair', handler: pair, body: { code: '123456' }, status: 200 },
  { path: 'coppa/verify', handler: coppa, body: { code: '123456' }, status: 200 },
  {
    path: 'email/preferences?token=body-token',
    handler: preferences,
    body: { productUpdates: false },
    status: 200,
  },
  {
    path: 'contact',
    handler: contact,
    body: {
      type: 'general',
      name: 'Student',
      email: 'student@example.test',
      subject: 'Hi',
      message: 'Question',
    },
    status: 200,
  },
  {
    path: 'trial/verify',
    handler: trialVerify,
    body: { sessionId: 'body-session', code: '123456' },
    status: 200,
  },
  { path: 'search', handler: search, body: { query: 'algebra' }, status: 200 },
  {
    path: 'homework/analyze',
    handler: homework,
    body: { image: 'data:image/png;base64,test' },
    status: 200,
  },
  {
    path: 'invites/request',
    handler: invites,
    body: {
      name: 'Student',
      email: 'student@example.test',
      motivation: 'I would like to learn mathematics',
      trialSessionId: 'body-session',
    },
    status: 201,
  },
  { path: 'debug/log', handler: debug, body: { message: 'Test' }, status: 403 },
  {
    path: 'waitlist/signup',
    handler: waitlist,
    body: { email: 'student@example.test', gdprConsent: true },
    status: 201,
  },
];

describe('reviewed exceptions do not authorize effects with ambient cookies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('BING_SEARCH_API_KEY', '');
    vi.stubEnv('NODE_ENV', 'test');
    mocks.pairing.mockImplementation(async (code: string) => {
      mocks.authority(code);
      return code === '123456' ? { token: 'device-token', deviceId: 'robot-1' } : null;
    });
    mocks.verify.mockImplementation(async (code: string) => {
      mocks.authority(code);
      return { success: code === '123456', userId: 'code-owner' };
    });
    mocks.preferences.mockImplementation(async (token: string) => {
      mocks.authority(token);
      return token === 'body-token' ? { userId: 'token-owner' } : null;
    });
  });
  afterEach(() => vi.unstubAllEnvs());

  it.each(cases)(
    '$path has the same authority with and without cookie identity',
    async ({ path, handler, body, status }) => {
      const observations = [];
      for (const cookie of [
        '',
        `${AUTH_COOKIE_NAME}=unrelated-user; ${VISITOR_COOKIE_NAME}=unrelated-visitor`,
      ]) {
        mocks.authority.mockClear();
        const response = await handler(
          new NextRequest(`http://localhost/api/${path}`, {
            method: 'POST',
            headers: { cookie, 'content-type': 'application/json', 'x-real-ip': '127.0.0.1' },
            body: JSON.stringify(body),
          }),
        );
        expect(response.status).toBe(status);
        observations.push({
          body: await response.json(),
          authority: [...mocks.authority.mock.calls],
        });
      }
      expect(observations[1]).toEqual(observations[0]);
      expect(mocks.auth).not.toHaveBeenCalled();
      expect(mocks.cookies).not.toHaveBeenCalled();
    },
  );

  it.each([
    { handler: pair, path: 'devices/pair', body: { code: 'wrong' }, status: 400 },
    { handler: coppa, path: 'coppa/verify', body: { code: '000000' }, status: 400 },
    {
      handler: preferences,
      path: 'email/preferences?token=wrong',
      body: { productUpdates: false },
      status: 404,
    },
  ])(
    'cookies cannot replace missing bearer authority for $path',
    async ({ handler, path, body, status }) => {
      const response = await handler(
        new NextRequest(`http://localhost/api/${path}`, {
          method: 'POST',
          headers: { cookie: `${AUTH_COOKIE_NAME}=unrelated-user` },
          body: JSON.stringify(body),
        }),
      );
      expect(response.status).toBe(status);
    },
  );
});

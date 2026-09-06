import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as events } from '@/app/api/telemetry/events/route';
import { POST as activity } from '@/app/api/telemetry/activity/route';
import { canCollectOptionalAnalytics } from '../optional-analytics-server';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  settings: vi.fn(),
  profile: vi.fn(),
  guardian: vi.fn(),
  createEvents: vi.fn(),
  existingEvents: vi.fn(),
  createActivity: vi.fn(),
}));
vi.mock('@/lib/auth/server', () => ({ validateAuth: mocks.auth }));
vi.mock('@/lib/db', () => ({
  prisma: {
    settings: { findUnique: mocks.settings },
    profile: { findUnique: mocks.profile },
    coppaConsent: { findUnique: mocks.guardian },
    telemetryEvent: { findMany: mocks.existingEvents, createMany: mocks.createEvents },
    userActivity: { create: mocks.createActivity },
  },
}));
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === 'mirrorbuddy-user-id' ? { value: 'signed-user.authentication-secret' } : undefined,
  }),
}));

const consent = {
  version: '1.0',
  acceptedAt: '2026-09-05T10:00:00.000Z',
  essential: true,
  analytics: true,
  marketing: false,
};
const event = {
  id: 'evt_test',
  timestamp: '2026-09-05T10:00:00.000Z',
  category: 'education',
  action: 'quiz_completed',
  sessionId: 'sess_test',
  value: 0,
};
const activityId = '550e8400-e29b-41d4-a716-446655440000';
function request(path: string, body: unknown, csrf = true) {
  return new NextRequest(`http://localhost${path}`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: csrf ? { cookie: 'csrf-token=csrf', 'x-csrf-token': 'csrf' } : {},
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ authenticated: true, userId: 'eligible-user' });
  mocks.settings.mockResolvedValue({ azureCostConfig: JSON.stringify({ consent }) });
  mocks.profile.mockResolvedValue({ age: 18 });
  mocks.guardian.mockResolvedValue(null);
  mocks.existingEvents.mockResolvedValue([]);
  mocks.createEvents.mockResolvedValue({ count: 1 });
  mocks.createActivity.mockResolvedValue({});
});

describe.each([
  ['events', events, '/api/telemetry/events', { events: [event] }],
  [
    'activity',
    activity,
    '/api/telemetry/activity',
    { route: '/it', activityId, identifier: 'forged' },
  ],
] as const)('%s server consent enforcement', (_name, handler, path, payload) => {
  it('accepts an authenticated eligible user with recorded opt-in', async () => {
    expect((await handler(request(path, payload))).status).toBe(200);
  });
  it.each([false, null, 'true', undefined])(
    'rejects missing/refused/malformed decision %s',
    async (analytics) => {
      mocks.settings.mockResolvedValue({
        azureCostConfig: JSON.stringify({
          consent: { ...consent, analytics },
        }),
      });
      const response = await handler(request(path, { ...payload, analytics: true }));
      expect(response.status).toBe(403);
      expect(mocks.createEvents).not.toHaveBeenCalled();
      expect(mocks.createActivity).not.toHaveBeenCalled();
    },
  );
  it.each([null, undefined, -1, '18'])(
    'rejects unknown or invalid age %s without locale inference',
    async (age) => {
      mocks.profile.mockResolvedValue({ age });
      expect((await handler(request(path, payload))).status).toBe(403);
    },
  );
  it('retains the guardian restriction', async () => {
    mocks.profile.mockResolvedValue({ age: 12 });
    expect((await handler(request(path, payload))).status).toBe(403);
    mocks.guardian.mockResolvedValue({ consentGranted: true });
    expect((await handler(request(path, payload))).status).toBe(200);
  });
  it.each([
    null,
    '{',
    'null',
    '[]',
    JSON.stringify({ consent: { ...consent, version: 'unknown' } }),
    JSON.stringify({ consent: { ...consent, acceptedAt: 'invalid' } }),
  ])('rejects missing or invalid stored consent evidence %s', async (azureCostConfig) => {
    mocks.settings.mockResolvedValue({ azureCostConfig });
    expect((await handler(request(path, payload))).status).toBe(403);
    expect(mocks.createEvents).not.toHaveBeenCalled();
    expect(mocks.createActivity).not.toHaveBeenCalled();
  });
  it.each(['profile', 'guardian'] as const)(
    'surfaces %s read failures as errors without optional ingestion',
    async (source) => {
      mocks.profile.mockResolvedValue({ age: 12 });
      mocks[source].mockRejectedValueOnce(new Error('unavailable'));
      expect((await handler(request(path, payload))).status).toBe(500);
      expect(mocks.createEvents).not.toHaveBeenCalled();
      expect(mocks.createActivity).not.toHaveBeenCalled();
    },
  );
  it('refuses unauthenticated forged opt-in without creating data', async () => {
    mocks.auth.mockResolvedValue({ authenticated: false });
    expect((await handler(request(path, { ...payload, analytics: true }))).status).toBe(401);
    expect(mocks.settings).not.toHaveBeenCalled();
  });
  it('requires CSRF before auth or ingestion', async () => {
    expect((await handler(request(path, payload, false))).status).toBe(403);
    expect(mocks.auth).not.toHaveBeenCalled();
  });
  it('does not ingest when the authoritative consent read fails', async () => {
    mocks.settings.mockRejectedValue(new Error('unavailable'));
    expect((await handler(request(path, payload))).status).toBe(500);
    expect(mocks.createEvents).not.toHaveBeenCalled();
    expect(mocks.createActivity).not.toHaveBeenCalled();
  });
  it.each([null, {}, { events: [null] }, []])(
    'rejects malformed external input',
    async (payload) => {
      expect((await handler(request(path, payload))).status).toBe(400);
    },
  );
});

it.each(['settings', 'profile', 'guardian'] as const)(
  'propagates the original %s database failure from the shared composite guard',
  async (source) => {
    mocks.profile.mockResolvedValue({ age: 12 });
    const failure = new Error('database unavailable');
    mocks[source].mockRejectedValueOnce(failure);
    await expect(canCollectOptionalAnalytics('eligible-user')).rejects.toBe(failure);
  },
);

it.each([null, undefined, '', ' '])(
  'denies absent authenticated identity %s without reading account data',
  async (userId) => {
    expect(await canCollectOptionalAnalytics(userId)).toBe(false);
    expect(mocks.settings).not.toHaveBeenCalled();
    expect(mocks.profile).not.toHaveBeenCalled();
  },
);

it('stores a separate activity identifier, never credentials, visitor cookie or client identifier', async () => {
  const req = request('/api/telemetry/activity', {
    route: '/it',
    activityId,
    identifier: 'client-secret',
  });
  await activity(req);
  const identifier = mocks.createActivity.mock.calls[0][0].data.identifier;
  expect(identifier).toBe(`activity_${activityId}`);
  expect(identifier).not.toContain('eligible-user');
  expect(identifier).not.toContain('secret');
});

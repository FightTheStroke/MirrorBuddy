import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as sessions } from '@/app/api/metrics/sessions/route';
import { POST as funnel } from '@/app/api/funnel/track/route';
import { recordFunnelEvent } from '@/lib/funnel';
import { processActiveUsers, processChurnedUsers } from '@/lib/funnel/batch-funnel';
import {
  startSession,
  recordTurn,
  endSession,
  getSessionState,
} from '@/lib/metrics/session-metrics-service';

const db = vi.hoisted(() => ({
  settings: vi.fn(),
  profile: vi.fn(),
  funnelCreate: vi.fn(),
  sessionCreate: vi.fn(),
  settingsList: vi.fn(),
  aggregate: vi.fn(),
  log: vi.fn(),
}));
vi.mock('@/lib/logger', () => {
  const logger = {
    info: db.log,
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => logger,
  };
  return { logger };
});
vi.mock('@/lib/auth/server', () => ({
  validateAuth: async () => ({ authenticated: true, userId: 'eligible-user' }),
}));
vi.mock('@/lib/db', () => ({
  prisma: {
    settings: { findUnique: db.settings, findMany: db.settingsList },
    profile: { findUnique: db.profile },
    funnelEvent: { create: db.funnelCreate, findFirst: vi.fn() },
    sessionMetrics: { create: db.sessionCreate },
    $queryRaw: db.aggregate,
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  db.settings.mockResolvedValue({
    azureCostConfig: JSON.stringify({
      consent: {
        version: '1.0',
        acceptedAt: '2026-09-05T10:00:00.000Z',
        essential: true,
        analytics: true,
        marketing: false,
      },
    }),
  });
  db.profile.mockResolvedValue({ age: 18 });
  db.funnelCreate.mockResolvedValue({});
  db.sessionCreate.mockResolvedValue({});
  db.settingsList.mockResolvedValue([]);
  db.aggregate.mockResolvedValue([]);
});

function request(path: string, body: unknown) {
  return new NextRequest(`http://localhost${path}`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { cookie: 'csrf-token=csrf', 'x-csrf-token': 'csrf' },
  });
}

describe.each([
  ['sessions', sessions, '/api/metrics/sessions', { action: 'start', sessionId: 'session' }],
  ['funnel', funnel, '/api/funnel/track', { stage: 'VISITOR' }],
] as const)('%s additional ingestion', (_name, handler, path, payload) => {
  it('refuses a forged opt-in when canonical decision is absent', async () => {
    db.settings.mockResolvedValue(null);
    expect((await handler(request(path, { ...payload, analytics: true }))).status).toBe(403);
  });
  it.each([null, {}, [], { action: 'turn', sessionId: 23 }])(
    'rejects malformed input',
    async (body) => {
      expect((await handler(request(path, body))).status).toBe(400);
    },
  );
});

it('does not record visitor-only funnel events without age/consent evidence', async () => {
  await recordFunnelEvent({ visitorId: 'guest', stage: 'TRIAL_START' });
  expect(db.funnelCreate).not.toHaveBeenCalled();
});
it('records server-origin funnel events only for an eligible opt-in', async () => {
  await recordFunnelEvent({ userId: 'eligible-user', stage: 'FIRST_LOGIN' });
  expect(db.funnelCreate).toHaveBeenCalledTimes(1);
  db.settings.mockResolvedValue(null);
  await recordFunnelEvent({ userId: 'eligible-user', stage: 'ACTIVE' });
  expect(db.funnelCreate).toHaveBeenCalledTimes(1);
});
it('does not report or log a stored funnel event if permission is revoked after route entry', async () => {
  const existing = await db.settings();
  db.settings.mockResolvedValueOnce(existing).mockResolvedValueOnce(null);
  const response = await funnel(
    request('/api/funnel/track', { stage: 'ACTIVE', metadata: { personal: 'private' } }),
  );
  expect(response.status).toBe(403);
  expect(await response.json()).toMatchObject({ code: 'OPTIONAL_ANALYTICS_DENIED' });
  expect(db.funnelCreate).not.toHaveBeenCalled();
  expect(db.log).not.toHaveBeenCalled();
});
it('reports a successful funnel write without logging visitor or personal payload fields', async () => {
  const response = await funnel(
    request('/api/funnel/track', { stage: 'ACTIVE', metadata: { personal: 'private' } }),
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ success: true, stored: true });
  expect(db.log).toHaveBeenCalledWith('Funnel event recorded', {
    stage: 'ACTIVE',
    fromStage: undefined,
  });
  expect(JSON.stringify(db.log.mock.calls)).not.toContain('private');
  expect(JSON.stringify(db.log.mock.calls)).not.toContain('visitorId');
});
it('drops buffered session metrics at persistence after revocation', async () => {
  startSession('revoked-session', 'eligible-user');
  recordTurn('revoked-session', { tokensIn: 2, tokensOut: 4, latencyMs: 1 });
  db.settings.mockResolvedValue(null);
  await endSession('revoked-session');
  expect(db.sessionCreate).not.toHaveBeenCalled();
  expect(getSessionState('revoked-session')).toBeUndefined();
});

it('does not aggregate study activity for optional funnels when no account permits collection', async () => {
  db.settings.mockResolvedValue(null);
  db.settingsList.mockResolvedValue([
    {
      userId: 'eligible-user',
      azureCostConfig: JSON.stringify({
        consent: {
          version: '1.0',
          acceptedAt: '2026-09-05T10:00:00Z',
          essential: true,
          analytics: false,
          marketing: false,
        },
      }),
    },
  ]);
  await processActiveUsers();
  await processChurnedUsers();
  expect(db.aggregate).not.toHaveBeenCalled();
});

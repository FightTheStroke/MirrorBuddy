import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as vitals } from '@/app/api/metrics/web-vitals/route';
import { POST as subscriptions } from '@/app/api/metrics/subscription-events/route';
import { logger } from '@/lib/logger';

const mocks = vi.hoisted(() => ({
  settings: vi.fn(),
  profile: vi.fn(),
  fetch: vi.fn(),
  limit: vi.fn(),
}));
vi.mock('@/lib/auth/server', () => ({
  validateAuth: async () => ({ authenticated: true, userId: 'eligible-user' }),
}));
vi.mock('@/lib/db', () => ({
  prisma: {
    settings: { findUnique: mocks.settings },
    profile: { findUnique: mocks.profile },
  },
}));
vi.mock('@/lib/rate-limit', () => ({
  getClientIdentifier: () => 'synthetic-client',
  checkRateLimitAsync: mocks.limit,
  RATE_LIMITS: { WEB_VITALS: {} },
  rateLimitResponse: () => new Response('{}', { status: 429 }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(logger, 'info');
  vi.stubGlobal('fetch', mocks.fetch);
  vi.stubEnv('GRAFANA_CLOUD_PROMETHEUS_URL', 'https://metrics.invalid');
  vi.stubEnv('GRAFANA_CLOUD_PROMETHEUS_USER', 'synthetic');
  vi.stubEnv('GRAFANA_CLOUD_API_KEY', 'synthetic');
  mocks.fetch.mockResolvedValue(new Response('{}'));
  mocks.limit.mockResolvedValue({ success: true });
  mocks.settings.mockResolvedValue({
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
  mocks.profile.mockResolvedValue({ age: 18 });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
function request(path: string, body: unknown) {
  return new NextRequest(`http://localhost${path}`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { cookie: 'csrf-token=csrf', 'x-csrf-token': 'csrf' },
  });
}
const metric = { name: 'LCP', value: 2500, rating: 'good', route: '/', deviceType: 'desktop' };
describe.each([
  ['vitals', vitals, '/api/metrics/web-vitals', { metrics: [metric] }, 201],
  [
    'subscription',
    subscriptions,
    '/api/metrics/subscription-events',
    {
      type: 'subscription.created',
      tierId: 'base',
      timestamp: '2026-09-05T10:00:00Z',
    },
    202,
  ],
] as const)('%s optional ingestion', (_name, handler, path, body, status) => {
  it('accepts only a recorded eligible opt-in', async () => {
    expect((await handler(request(path, body))).status).toBe(status);
  });
  it('refuses client-forged consent before optional logging or forwarding', async () => {
    mocks.settings.mockResolvedValue(null);
    expect((await handler(request(path, { ...body, analytics: true }))).status).toBe(403);
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalled();
  });
  it('does not infer unknown age from consent or locale', async () => {
    mocks.profile.mockResolvedValue({ age: null });
    expect((await handler(request(path, body))).status).toBe(403);
  });
  it.each([null, {}, { metrics: [null] }, { metrics: [{ ...metric, connectionType: {} }] }])(
    'rejects malformed payloads',
    async (payload) => {
      expect((await handler(request(path, payload))).status).toBe(400);
    },
  );
});
it('preserves rate limiting even when optional analytics is refused', async () => {
  mocks.settings.mockResolvedValue(null);
  mocks.limit.mockResolvedValue({ success: false });
  expect((await vitals(request('/api/metrics/web-vitals', { metrics: [metric] }))).status).toBe(
    429,
  );
  expect(mocks.fetch).not.toHaveBeenCalled();
});
it('does not forward a client-provided user identifier', async () => {
  await vitals(
    request('/api/metrics/web-vitals', { metrics: [{ ...metric, userId: 'forged-user' }] }),
  );
  expect(mocks.fetch.mock.calls[0][1].body).not.toContain('forged-user');
});

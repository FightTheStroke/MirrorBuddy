/**
 * Unit tests for GET /api/devices/realtime-credentials.
 *
 * The robot must never hold a long-lived Azure key on disk: it authenticates
 * with its device token and receives the voice credentials at runtime, so a
 * key rotation propagates without anyone touching the hardware.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/api/middlewares', () => ({
  pipe:
    (..._mw: unknown[]) =>
    (handler: unknown) =>
      handler,
  withSentry: () => vi.fn(),
  withRateLimit: () => vi.fn(),
}));

vi.mock('@/lib/devices/device-service', () => ({
  getDeviceProfile: vi.fn(),
}));

vi.mock('@/lib/feature-flags/feature-flags-service', () => ({
  isFeatureEnabled: vi.fn(() => ({ enabled: true })),
}));

import { GET } from './route';
import { getDeviceProfile } from '@/lib/devices/device-service';
import { isFeatureEnabled } from '@/lib/feature-flags/feature-flags-service';

type Ctx = { req: { headers: Headers } };
const handler = GET as unknown as (ctx: Ctx) => Promise<Response>;
const mockProfile = getDeviceProfile as unknown as ReturnType<typeof vi.fn>;

function ctxWith(auth?: string): Ctx {
  return { req: { headers: new Headers(auth ? { authorization: auth } : {}) } };
}

const ENV_KEYS = [
  'AZURE_OPENAI_REALTIME_ENDPOINT',
  'AZURE_OPENAI_REALTIME_API_KEY',
  'AZURE_OPENAI_REALTIME_DEPLOYMENT',
  'AZURE_OPENAI_REALTIME_DEPLOYMENT_V21',
  'AZURE_OPENAI_REALTIME_DEPLOYMENT_V2',
  'AZURE_OPENAI_REALTIME_DEPLOYMENT_V15',
  'AZURE_OPENAI_REALTIME_API_VERSION',
] as const;

const original: Record<string, string | undefined> = {};

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of ENV_KEYS) original[key] = process.env[key];
  process.env.AZURE_OPENAI_REALTIME_ENDPOINT = 'https://example.openai.azure.com/';
  process.env.AZURE_OPENAI_REALTIME_API_KEY = 'azure-secret';
  process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT = 'gpt-realtime';
  delete process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT_V21;
  delete process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT_V2;
  delete process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT_V15;
  delete process.env.AZURE_OPENAI_REALTIME_API_VERSION;
  vi.mocked(isFeatureEnabled).mockImplementation((id) => ({
    enabled: true,
    reason: 'enabled',
    flag: {
      id,
      name: id,
      description: id,
      status: 'enabled',
      enabledPercentage: 100,
      killSwitch: false,
      updatedAt: new Date(),
    },
  }));
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
});

describe('GET /api/devices/realtime-credentials', () => {
  it('falls back to the configured GA 1.5 deployment when newer deployments are absent', async () => {
    process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT_V15 = 'gpt-realtime-15';
    mockProfile.mockResolvedValue({ name: 'Mario' });

    const res = await handler(ctxWith('Bearer test-device'));

    expect(res.status).toBe(200);
    expect((await res.json()).deployment).toBe('gpt-realtime-15');
  });

  it('honors the same generation kill switches as browser voice', async () => {
    process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT_V21 = 'gpt-realtime-2.1';
    process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT_V2 = 'gpt-realtime-2';
    process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT_V15 = 'gpt-realtime-15';
    const enabledResult = vi.mocked(isFeatureEnabled)('voice_realtime_15');
    vi.mocked(isFeatureEnabled).mockImplementation((id) => ({
      ...enabledResult,
      enabled: id === 'voice_realtime_15',
      reason: id === 'voice_realtime_15' ? 'enabled' : 'kill_switch',
    }));
    mockProfile.mockResolvedValue({ name: 'Mario' });

    const res = await handler(ctxWith('Bearer test-device'));

    expect((await res.json()).deployment).toBe('gpt-realtime-15');
  });

  it('returns 401 when the bearer token is missing', async () => {
    const res = await handler(ctxWith());
    expect(res.status).toBe(401);
    expect(mockProfile).not.toHaveBeenCalled();
  });

  it('returns 401 for a revoked or unknown device token', async () => {
    mockProfile.mockResolvedValue(null);
    const res = await handler(ctxWith('Bearer nope'));
    expect(res.status).toBe(401);
  });

  it('returns the voice credentials for a paired device', async () => {
    mockProfile.mockResolvedValue({ name: 'Mario', language: 'it' });
    const res = await handler(ctxWith('Bearer good-token'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      endpoint: 'https://example.openai.azure.com/',
      apiKey: 'azure-secret',
      deployment: 'gpt-realtime',
      apiVersion: null,
    });
  });

  it('trims values so a stray newline never reaches the robot', async () => {
    process.env.AZURE_OPENAI_REALTIME_ENDPOINT = 'https://example.openai.azure.com/\n';
    process.env.AZURE_OPENAI_REALTIME_API_KEY = ' azure-secret \n';
    mockProfile.mockResolvedValue({ name: 'Mario' });
    const res = await handler(ctxWith('Bearer good-token'));
    const body = await res.json();
    expect(body.endpoint).toBe('https://example.openai.azure.com/');
    expect(body.apiKey).toBe('azure-secret');
  });

  it('never hands the robot an api version, so it stays on the stable protocol', async () => {
    process.env.AZURE_OPENAI_REALTIME_API_VERSION = '2024-10-01-preview';
    mockProfile.mockResolvedValue({ name: 'Mario' });
    const res = await handler(ctxWith('Bearer good-token'));
    const body = await res.json();
    expect(body.apiVersion).toBeNull();
  });

  it('serves the same modern deployment the web app uses', async () => {
    process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT_V21 = 'gpt-realtime-2.1';
    mockProfile.mockResolvedValue({ name: 'Mario' });
    const res = await handler(ctxWith('Bearer good-token'));
    const body = await res.json();
    expect(body.deployment).toBe('gpt-realtime-2.1');
  });

  it('returns 503 when the server itself has no voice credentials', async () => {
    delete process.env.AZURE_OPENAI_REALTIME_API_KEY;
    mockProfile.mockResolvedValue({ name: 'Mario' });
    const res = await handler(ctxWith('Bearer good-token'));
    expect(res.status).toBe(503);
  });

  it('never caches the response', async () => {
    mockProfile.mockResolvedValue({ name: 'Mario' });
    const res = await handler(ctxWith('Bearer good-token'));
    expect(res.headers.get('cache-control')).toContain('no-store');
  });
});

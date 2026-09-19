// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { execSync } from 'child_process';
import { logger } from '@/lib/logger';
import { getAzureToken, queryCosts, setCache } from '@/app/api/azure/costs/helpers';

vi.mock('child_process', () => ({ execSync: vi.fn() }));
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    child: () => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }),
  },
}));

describe('Azure token contract and existing costs CLI fallback', () => {
  const boundary = vi.fn<typeof fetch>();
  const cost = { properties: { rows: [[12, 'USD']] } };

  beforeEach(() => {
    vi.clearAllMocks();
    for (const [key, value] of Object.entries({
      AZURE_TENANT_ID: 'local-tenant',
      AZURE_CLIENT_ID: 'local-client',
      AZURE_CLIENT_SECRET: 'local-disposable-secret',
    }))
      vi.stubEnv(key, value);
    setCache('azure_token', null);
    vi.stubGlobal('fetch', boundary);
    vi.mocked(execSync).mockImplementation((command) => {
      if (command === 'az account show') return '{}';
      if (command.startsWith('az rest --method post')) return JSON.stringify(cost);
      throw new Error('Unexpected external CLI boundary');
    });
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('rejects token401 with typed status without logging or retaining the response body', async () => {
    boundary.mockResolvedValue(new Response('sensitive-provider-body', { status: 401 }));
    await expect(getAzureToken()).rejects.toMatchObject({ status: 401, operation: 'token' });
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('preserves the original transport cause without lower-level reporting', async () => {
    const cause = new TypeError('owned HTTP boundary failure');
    boundary.mockRejectedValue(cause);
    await expect(getAzureToken()).rejects.toMatchObject({ operation: 'token', cause });
    expect(logger.error).not.toHaveBeenCalled();
  });

  it.each([null, {}, { access_token: '' }])(
    'rejects malformed successful token responses: %j',
    async (data) => {
      boundary.mockResolvedValue(Response.json(data));
      await expect(getAzureToken()).rejects.toMatchObject({ operation: 'token' });
      expect(logger.error).not.toHaveBeenCalled();
    },
  );

  it('keeps credential absence distinct and does not call an external boundary', async () => {
    vi.stubEnv('AZURE_CLIENT_SECRET', '');
    expect(await getAzureToken()).toBeNull();
    expect(boundary).not.toHaveBeenCalled();
  });

  it.each(['rejected', 'network'])(
    'preserves costs CLI fallback after %s token authentication',
    async (failure) => {
      if (failure === 'rejected') boundary.mockResolvedValue(new Response(null, { status: 401 }));
      else boundary.mockRejectedValue(new TypeError('owned network failure'));
      expect(await queryCosts('local-subscription', {})).toEqual({
        result: cost,
        source: 'az_cli',
      });
      expect(execSync).toHaveBeenCalledTimes(2);
      expect(logger.error).toHaveBeenCalledTimes(1);
    },
  );

  it('retains a visible failure when neither authentication method works', async () => {
    boundary.mockResolvedValue(new Response(null, { status: 401 }));
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('CLI unavailable');
    });
    expect(await queryCosts('local-subscription', {})).toEqual({ result: null, source: 'az_cli' });
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it('retains service-principal costs and token caching without CLI calls', async () => {
    boundary.mockImplementation(async (input) =>
      String(input).includes('oauth2')
        ? Response.json({ access_token: 'local-access-token' })
        : Response.json(cost),
    );
    expect(await queryCosts('local-subscription', {})).toEqual({
      result: cost,
      source: 'service_principal',
    });
    expect(await getAzureToken()).toBe('local-access-token');
    expect(boundary).toHaveBeenCalledTimes(2);
    expect(execSync).not.toHaveBeenCalled();
  });

  it('preserves cost API429 semantics rather than adding a new CLI fallback', async () => {
    boundary.mockImplementation(async (input) =>
      String(input).includes('oauth2')
        ? Response.json({ access_token: 'local-access-token' })
        : new Response(null, { status: 429 }),
    );
    expect(await queryCosts('local-subscription', {})).toEqual({
      result: null,
      source: 'service_principal',
    });
    expect(execSync).not.toHaveBeenCalled();
  });
});

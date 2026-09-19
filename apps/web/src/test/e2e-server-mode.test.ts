/**
 * E2E server mode contract.
 *
 * Browser tests used to pick their server from `process.env.CI`, the same flag that
 * also drives project selection, workers, retries and timeouts. Testing the built
 * production server therefore meant changing five unrelated things at once.
 * `E2E_SERVER_MODE` separates *which server is served* from *how the suite runs*.
 * When it is unset the resolver must reproduce the previous CI behaviour exactly.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlaywrightTestConfig } from '@playwright/test';
import {
  DEV_SERVER_COMMAND,
  STANDALONE_SERVER_COMMAND,
  resolveE2EServerMode,
} from './e2e-server-mode';

describe('resolveE2EServerMode', () => {
  it('serves the dev server when neither the mode nor CI is set', () => {
    expect(resolveE2EServerMode({})).toEqual({
      mode: 'development',
      command: DEV_SERVER_COMMAND,
      nodeEnv: 'development',
    });
  });

  it('reproduces the previous CI behaviour when the mode is unset', () => {
    expect(resolveE2EServerMode({ CI: '1' })).toEqual({
      mode: 'production',
      command: STANDALONE_SERVER_COMMAND,
      nodeEnv: 'production',
    });
  });

  it('treats a missing or null mode the same as an unset one', () => {
    expect(resolveE2EServerMode({ E2E_SERVER_MODE: undefined, CI: '1' }).mode).toBe('production');
    expect(resolveE2EServerMode({ E2E_SERVER_MODE: null, CI: undefined }).mode).toBe('development');
  });

  it('keeps the exact truthiness rule the CI ternary used, so an empty CI stays development', () => {
    expect(resolveE2EServerMode({ CI: '' }).mode).toBe('development');
    expect(resolveE2EServerMode({ CI: 'false' }).mode).toBe('production');
  });

  it('serves the built production server without CI', () => {
    expect(resolveE2EServerMode({ E2E_SERVER_MODE: 'production' })).toEqual({
      mode: 'production',
      command: STANDALONE_SERVER_COMMAND,
      nodeEnv: 'production',
    });
  });

  it('lets an explicit development mode override CI', () => {
    expect(resolveE2EServerMode({ E2E_SERVER_MODE: 'development', CI: '1' })).toEqual({
      mode: 'development',
      command: DEV_SERVER_COMMAND,
      nodeEnv: 'development',
    });
  });

  it.each(['PRODUCTION', 'Production', ' production ', 'DEVELOPMENT'])(
    'rejects %j instead of silently normalising it',
    (value) => {
      expect(() => resolveE2EServerMode({ E2E_SERVER_MODE: value })).toThrow(/E2E_SERVER_MODE/);
    },
  );

  it.each(['', 'prod', 'dev', 'standalone', 'true', '1', 'test'])(
    'rejects the unsupported value %j',
    (value) => {
      expect(() => resolveE2EServerMode({ E2E_SERVER_MODE: value })).toThrow(/E2E_SERVER_MODE/);
    },
  );

  it('names the variable, the received value and both accepted values when it rejects', () => {
    expect(() => resolveE2EServerMode({ E2E_SERVER_MODE: 'prod' })).toThrow(
      /E2E_SERVER_MODE[\s\S]*prod[\s\S]*production[\s\S]*development/,
    );
  });

  it('reads only the object it is given, never process.env', () => {
    vi.stubEnv('E2E_SERVER_MODE', 'production');
    expect(resolveE2EServerMode({}).mode).toBe('development');
    vi.unstubAllEnvs();
  });
});

/**
 * The configuration itself, evaluated for real. String matching on the file would
 * prove nothing about the object Playwright actually receives.
 */
describe('playwright configuration under E2E_SERVER_MODE', () => {
  const TEST_DB = 'postgresql://tester@localhost:55443/mirrorbuddy_test';

  async function loadConfig(
    env: Record<string, string | undefined>,
  ): Promise<PlaywrightTestConfig> {
    vi.resetModules();
    vi.stubEnv('TEST_DATABASE_URL', TEST_DB);
    vi.stubEnv('DATABASE_URL', TEST_DB);
    vi.stubEnv('CI', env.CI);
    vi.stubEnv('E2E_SERVER_MODE', env.E2E_SERVER_MODE);
    const loaded = (await import('../../playwright.config')) as { default: PlaywrightTestConfig };
    return loaded.default;
  }

  /** Everything except the two values this feature is allowed to change. */
  function withoutServerSelection(config: PlaywrightTestConfig) {
    const { webServer, ...rest } = config as PlaywrightTestConfig & {
      webServer: { command: string; env: Record<string, string> };
    };
    const { command: _command, env, ...webServerRest } = webServer;
    const { NODE_ENV: _nodeEnv, ...envRest } = env;
    return { ...rest, webServer: { ...webServerRest, env: envRest } };
  }

  beforeEach(() => {
    vi.stubEnv('MIRRORBUDDY_PORT', '3123');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('changes nothing but the server command and the child NODE_ENV', async () => {
    const baseline = await loadConfig({ CI: undefined, E2E_SERVER_MODE: undefined });
    const baselineRest = withoutServerSelection(baseline);
    const production = await loadConfig({ CI: undefined, E2E_SERVER_MODE: 'production' });

    expect(withoutServerSelection(production)).toEqual(baselineRest);
  });

  it('serves the built production server with CI unset', async () => {
    const production = (await loadConfig({
      CI: undefined,
      E2E_SERVER_MODE: 'production',
    })) as PlaywrightTestConfig & { webServer: { command: string; env: Record<string, string> } };

    expect(production.webServer.command).toBe(STANDALONE_SERVER_COMMAND);
    expect(production.webServer.env.NODE_ENV).toBe('production');
  });

  it('keeps all twelve projects with their own selection rules', async () => {
    const baseline = await loadConfig({ CI: undefined, E2E_SERVER_MODE: undefined });
    const production = await loadConfig({ CI: undefined, E2E_SERVER_MODE: 'production' });

    expect(baseline.projects).toHaveLength(12);
    expect(production.projects?.map((project) => project.name)).toEqual(
      baseline.projects?.map((project) => project.name),
    );
    // testIgnore, dependencies and per-project retries are part of the baseline and
    // must survive verbatim - this asserts they are preserved, not that they are absent.
    expect(production.projects).toEqual(baseline.projects);
  });

  it('keeps the local run defaults untouched', async () => {
    const production = await loadConfig({ CI: undefined, E2E_SERVER_MODE: 'production' });

    expect(production.retries).toBe(0);
    expect(production.timeout).toBe(30000);
    expect(production.workers).toBeUndefined();
    expect(production.forbidOnly).toBe(false);
  });

  it('is a no-op in CI, which already chose the production server', async () => {
    const legacy = await loadConfig({ CI: 'true', E2E_SERVER_MODE: undefined });
    const explicit = await loadConfig({ CI: 'true', E2E_SERVER_MODE: 'production' });

    expect(explicit).toEqual(legacy);
  });

  it('never mutates the runner CI or NODE_ENV', async () => {
    const runnerNodeEnv = process.env.NODE_ENV;
    await loadConfig({ CI: undefined, E2E_SERVER_MODE: 'production' });

    expect(process.env.NODE_ENV).toBe(runnerNodeEnv);
    expect(process.env.CI).toBeUndefined();
  });

  it('still refuses to adopt a server someone else started', async () => {
    const production = (await loadConfig({
      CI: undefined,
      E2E_SERVER_MODE: 'production',
    })) as PlaywrightTestConfig & {
      webServer: { reuseExistingServer: boolean; url: string };
    };

    expect(production.webServer.reuseExistingServer).toBe(false);
    expect(production.webServer.url).toBe('http://localhost:3123');
  });

  it('rejects an invalid mode when the configuration is evaluated', async () => {
    await expect(loadConfig({ CI: undefined, E2E_SERVER_MODE: 'prod' })).rejects.toThrow(
      /E2E_SERVER_MODE/,
    );
  });
});

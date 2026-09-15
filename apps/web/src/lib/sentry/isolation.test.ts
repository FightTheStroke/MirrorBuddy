import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isEnabled } from './env';

describe('Sentry test isolation takes precedence over forced production reporting', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://test@sentry.io/123');
    vi.stubEnv('NEXT_PUBLIC_SENTRY_FORCE_ENABLE', 'true');
    vi.stubEnv('SENTRY_FORCE_ENABLE', 'true');
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('E2E_TESTS', '');
    vi.stubGlobal('window', { location: { hostname: 'www.mirrorbuddy.org' } });
    vi.stubGlobal('navigator', { webdriver: false });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('never enables the automated browser against the production Sentry project', () => {
    vi.stubGlobal('navigator', { webdriver: true });
    expect(isEnabled('client')).toBe(false);
  });

  it.each(['localhost', '127.0.0.1', '127.0.0.2', '[::1]', '::1', '0.0.0.0', 'app.localhost'])(
    'never force-enables a local production bundle: %s',
    (hostname) => {
      vi.stubGlobal('window', { location: { hostname } });
      expect(isEnabled('client')).toBe(false);
    },
  );

  it.each(['server', 'edge'] as const)(
    'blocks E2E even with inherited Vercel flags: %s',
    (runtime) => {
      vi.stubEnv('E2E_TESTS', '1');
      expect(isEnabled(runtime)).toBe(false);
    },
  );

  it.each(['server', 'edge'] as const)(
    'blocks local runtime even with force enabled: %s',
    (runtime) => {
      vi.stubEnv('VERCEL', '');
      expect(isEnabled(runtime)).toBe(false);
    },
  );

  it.each(['preview', 'production', ''])(
    'preserves real users on promoted builds tagged %s',
    (environment) => {
      vi.stubEnv('NEXT_PUBLIC_SENTRY_FORCE_ENABLE', 'false');
      vi.stubEnv('NEXT_PUBLIC_VERCEL_ENV', environment);
      expect(isEnabled('client')).toBe(true);
      expect(isEnabled('server')).toBe(true);
      expect(isEnabled('edge')).toBe(true);
    },
  );
});

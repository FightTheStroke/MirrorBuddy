import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import * as Sentry from '@sentry/nextjs';

vi.mock('@sentry/nextjs', () => ({
  init: vi.fn(),
  replayIntegration: vi.fn(() => ({})),
  captureConsoleIntegration: vi.fn(() => ({})),
  captureRouterTransitionStart: vi.fn(),
  browserTracingIntegration: vi.fn(() => ({})),
  feedbackIntegration: vi.fn(() => ({})),
  httpClientIntegration: vi.fn(() => ({})),
  globalHandlersIntegration: vi.fn(() => ({})),
  linkedErrorsIntegration: vi.fn(() => ({})),
  dedupeIntegration: vi.fn(() => ({})),
}));

describe('Sentry client bootstrap', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('enables Sentry on Vercel when DSN is configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://key@o1.ingest.us.sentry.io/123456');
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_VERCEL_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_SENTRY_FORCE_ENABLE', 'false');
    // The test runner serves from localhost, which the rule treats as a
    // developer's own machine and deliberately keeps quiet.
    vi.stubGlobal('location', { hostname: 'www.mirrorbuddy.org' });

    await import('../../instrumentation-client');

    expect(Sentry.init).toHaveBeenCalledTimes(1);
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
      }),
    );
  });

  it('stays quiet for a production build served from localhost', async () => {
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://key@o1.ingest.us.sentry.io/123456');
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_SENTRY_FORCE_ENABLE', 'false');
    vi.stubGlobal('location', { hostname: 'localhost' });

    await import('../../instrumentation-client');

    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
  });

  it('keeps Sentry disabled outside production without force flag', async () => {
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://key@o1.ingest.us.sentry.io/123456');
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_SENTRY_FORCE_ENABLE', 'false');

    await import('../../instrumentation-client');

    expect(Sentry.init).toHaveBeenCalledTimes(1);
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
  });

  it('does not force enable Sentry on localhost', async () => {
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://key@o1.ingest.us.sentry.io/123456');
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_SENTRY_FORCE_ENABLE', 'true');

    await import('../../instrumentation-client');

    expect(Sentry.init).toHaveBeenCalledTimes(1);
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
  });

  it('disables the actual SDK for automation even on a production host with force enabled', async () => {
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://key@o1.ingest.us.sentry.io/123456');
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_SENTRY_FORCE_ENABLE', 'true');
    vi.stubGlobal('location', { hostname: 'www.mirrorbuddy.org' });
    vi.stubGlobal('navigator', { webdriver: true });

    await import('../../instrumentation-client');

    expect(Sentry.init).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });
});

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import * as Sentry from '@sentry/nextjs';

vi.mock('@sentry/nextjs', () => ({
  init: vi.fn(),
  replayIntegration: vi.fn(() => ({})),
  captureConsoleIntegration: vi.fn(() => ({})),
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
  });

  it('enables Sentry in production when DSN is configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://key@o1.ingest.us.sentry.io/123456');
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_SENTRY_FORCE_ENABLE', 'false');

    await import('../../instrumentation-client');

    expect(Sentry.init).toHaveBeenCalledTimes(1);
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
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

  it('enables Sentry outside production when force flag is on', async () => {
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://key@o1.ingest.us.sentry.io/123456');
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_SENTRY_FORCE_ENABLE', 'true');

    await import('../../instrumentation-client');

    expect(Sentry.init).toHaveBeenCalledTimes(1);
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
      }),
    );
  });
});

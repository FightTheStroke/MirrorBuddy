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

const ORIGINAL_ENV = process.env;

describe('Sentry client bootstrap', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('enables Sentry in production when DSN is configured', async () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://key@o1.ingest.us.sentry.io/123456';
    process.env.NEXT_PUBLIC_VERCEL_ENV = 'production';
    process.env.NEXT_PUBLIC_SENTRY_FORCE_ENABLE = 'false';

    await import('../../instrumentation-client');

    expect(Sentry.init).toHaveBeenCalledTimes(1);
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
      }),
    );
  });

  it('keeps Sentry disabled outside production without force flag', async () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://key@o1.ingest.us.sentry.io/123456';
    process.env.NEXT_PUBLIC_VERCEL_ENV = 'preview';
    process.env.NEXT_PUBLIC_SENTRY_FORCE_ENABLE = 'false';

    await import('../../instrumentation-client');

    expect(Sentry.init).toHaveBeenCalledTimes(1);
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
  });

  it('enables Sentry via NODE_ENV fallback when NEXT_PUBLIC_VERCEL_ENV is missing', async () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://key@o1.ingest.us.sentry.io/123456';
    delete process.env.NEXT_PUBLIC_VERCEL_ENV;
    // @ts-expect-error -- readonly in types but writable at runtime for test isolation
    process.env.NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_SENTRY_FORCE_ENABLE = 'false';

    await import('../../instrumentation-client');

    expect(Sentry.init).toHaveBeenCalledTimes(1);
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
      }),
    );
  });

  it('enables Sentry outside production when force flag is on', async () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://key@o1.ingest.us.sentry.io/123456';
    process.env.NEXT_PUBLIC_VERCEL_ENV = 'preview';
    process.env.NEXT_PUBLIC_SENTRY_FORCE_ENABLE = 'true';

    await import('../../instrumentation-client');

    expect(Sentry.init).toHaveBeenCalledTimes(1);
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
      }),
    );
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@sentry/nextjs', () => ({
  init: vi.fn(),
  replayIntegration: vi.fn(() => ({ name: 'Replay' })),
  captureConsoleIntegration: vi.fn(() => ({ name: 'CaptureConsole' })),
  browserTracingIntegration: vi.fn(() => ({ name: 'BrowserTracing' })),
  feedbackIntegration: vi.fn(() => ({ name: 'Feedback' })),
  httpClientIntegration: vi.fn(() => ({ name: 'HttpClient' })),
  globalHandlersIntegration: vi.fn(() => ({ name: 'GlobalHandlers' })),
  linkedErrorsIntegration: vi.fn(() => ({ name: 'LinkedErrors' })),
  dedupeIntegration: vi.fn(() => ({ name: 'Dedupe' })),
  onUnhandledRejectionIntegration: vi.fn(() => ({ name: 'OnUnhandledRejection' })),
  onUncaughtExceptionIntegration: vi.fn(() => ({ name: 'OnUncaughtException' })),
  httpIntegration: vi.fn(() => ({ name: 'Http' })),
  prismaIntegration: vi.fn(() => ({ name: 'Prisma' })),
}));

function makeStructuredConsoleEvent() {
  return {
    logger: 'console',
    extra: {
      arguments: [
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'warn',
          message: 'Structured warning',
        }),
      ],
    },
    tags: {},
  } as const;
}

describe('Sentry console dedupe', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    Object.defineProperty(global, 'navigator', {
      writable: true,
      value: { userAgent: 'test-agent', onLine: true },
    });
    Object.defineProperty(global, 'window', {
      writable: true,
      value: { innerWidth: 1280, innerHeight: 720 },
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('drops duplicated structured console warnings on client', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://test@sentry.io/123');

    const Sentry = await import('@sentry/nextjs');
    await import('../../../sentry.client.config');
    const initCall = vi.mocked(Sentry.init).mock.calls[0][0];

    const result = initCall.beforeSend?.(makeStructuredConsoleEvent(), {
      originalException: undefined,
    });

    expect(result).toBeNull();
  });

  it('drops duplicated structured console warnings on server', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('SENTRY_DSN', 'https://test@sentry.io/123');

    const Sentry = await import('@sentry/nextjs');
    await import('../../../sentry.server.config');
    const initCall = vi.mocked(Sentry.init).mock.calls[0][0];

    const result = initCall.beforeSend?.(makeStructuredConsoleEvent(), {
      originalException: undefined,
    });

    expect(result).toBeNull();
  });

  it('drops duplicated structured console warnings on edge', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('SENTRY_DSN', 'https://test@sentry.io/123');

    const Sentry = await import('@sentry/nextjs');
    await import('../../../sentry.edge.config');
    const initCall = vi.mocked(Sentry.init).mock.calls[0][0];

    const result = initCall.beforeSend?.(makeStructuredConsoleEvent(), {
      originalException: undefined,
    });

    expect(result).toBeNull();
  });
});

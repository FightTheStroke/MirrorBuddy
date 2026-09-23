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

    const result = initCall.beforeSend?.(makeStructuredConsoleEvent() as any, {
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

    const result = initCall.beforeSend?.(makeStructuredConsoleEvent() as any, {
      originalException: undefined,
    });

    expect(result).toBeNull();
  });

  it('drops only the proven-harmless platform warning and downgrades other Node warnings (#1162)', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('SENTRY_DSN', 'https://test@sentry.io/123');

    const Sentry = await import('@sentry/nextjs');
    await import('../../../sentry.server.config');
    const beforeSend = vi.mocked(Sentry.init).mock.calls[0][0].beforeSend!;
    const nodeWarning = (message: string) =>
      ({
        logger: 'console',
        level: 'error',
        message,
        extra: { arguments: [message] },
        tags: {},
      }) as any;

    expect(
      beforeSend(
        nodeWarning(
          '(node:4) ExperimentalWarning: vm.USE_MAIN_CONTEXT_DEFAULT_LOADER is an experimental feature and might change at any time',
        ),
        { originalException: undefined },
      ),
    ).toBeNull();

    const kept = beforeSend(nodeWarning('(node:4) Warning: Possible EventEmitter memory leak'), {
      originalException: undefined,
    }) as any;
    expect(kept).not.toBeNull();
    expect(kept.level).toBe('warning');
    expect(kept.tags.nodeWarning).toBe('Warning');

    const appError = beforeSend(nodeWarning('Unhandled failure in handler'), {
      originalException: undefined,
    }) as any;
    expect(appError.level).toBe('error');
  });

  it('drops duplicated structured console warnings on edge', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('SENTRY_DSN', 'https://test@sentry.io/123');

    const Sentry = await import('@sentry/nextjs');
    await import('../../../sentry.edge.config');
    const initCall = vi.mocked(Sentry.init).mock.calls[0][0];

    const result = initCall.beforeSend?.(makeStructuredConsoleEvent() as any, {
      originalException: undefined,
    });

    expect(result).toBeNull();
  });
});

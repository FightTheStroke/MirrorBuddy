/**
 * Tests for Sentry configuration files
 * Verifies that Sentry.init is called with correct parameters in different environments
 *
 * F-07: Unit test for enabled=true when NODE_ENV=production + DSN present
 * F-08: Unit test for beforeSend NOT dropping events in production
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock @sentry/nextjs before importing configs
// Must mock ALL integrations used in the configs to avoid "not a function" errors
vi.mock('@sentry/nextjs', () => ({
  init: vi.fn(),
  // Client integrations
  replayIntegration: vi.fn(() => ({ name: 'Replay' })),
  captureConsoleIntegration: vi.fn(() => ({ name: 'CaptureConsole' })),
  browserTracingIntegration: vi.fn(() => ({ name: 'BrowserTracing' })),
  feedbackIntegration: vi.fn(() => ({ name: 'Feedback' })),
  httpClientIntegration: vi.fn(() => ({ name: 'HttpClient' })),
  globalHandlersIntegration: vi.fn(() => ({ name: 'GlobalHandlers' })),
  linkedErrorsIntegration: vi.fn(() => ({ name: 'LinkedErrors' })),
  dedupeIntegration: vi.fn(() => ({ name: 'Dedupe' })),
  // Server integrations
  onUnhandledRejectionIntegration: vi.fn(() => ({ name: 'OnUnhandledRejection' })),
  onUncaughtExceptionIntegration: vi.fn(() => ({ name: 'OnUncaughtException' })),
  httpIntegration: vi.fn(() => ({ name: 'Http' })),
  prismaIntegration: vi.fn(() => ({ name: 'Prisma' })),
}));

describe('sentry.client.config', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    // Mock navigator and window for client config
    Object.defineProperty(global, 'navigator', {
      writable: true,
      value: { userAgent: 'test-agent', onLine: true },
    });
    Object.defineProperty(global, 'window', {
      writable: true,
      value: { innerWidth: 1920, innerHeight: 1080 },
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('calls init with enabled=true when NODE_ENV=production and DSN present (F-07)', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://test@sentry.io/123');

    const Sentry = await import('@sentry/nextjs');
    await import('../../../sentry.client.config');

    expect(Sentry.init).toHaveBeenCalledTimes(1);
    const initCall = vi.mocked(Sentry.init).mock.calls[0][0];
    expect(initCall.enabled).toBe(true);
    expect(initCall.dsn).toBe('https://test@sentry.io/123');
  });

  it('calls init with enabled=false when NODE_ENV=development', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://test@sentry.io/123');

    const Sentry = await import('@sentry/nextjs');
    await import('../../../sentry.client.config');

    expect(Sentry.init).toHaveBeenCalledTimes(1);
    const initCall = vi.mocked(Sentry.init).mock.calls[0][0];
    expect(initCall.enabled).toBe(false);
  });

  it('beforeSend returns event (never null) in production (F-08)', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://test@sentry.io/123');

    const Sentry = await import('@sentry/nextjs');
    await import('../../../sentry.client.config');

    const initCall = vi.mocked(Sentry.init).mock.calls[0][0];
    const beforeSend = initCall.beforeSend!;

    const mockEvent = {
      message: 'Test error',
      tags: {},
    };
    const mockHint = { originalException: new Error('Test') };

    const result = beforeSend(mockEvent, mockHint);
    expect(result).not.toBeNull();
    expect(result).toBe(mockEvent);
  });

  it('beforeSend tags hydration errors', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://test@sentry.io/123');

    const Sentry = await import('@sentry/nextjs');
    await import('../../../sentry.client.config');

    const initCall = vi.mocked(Sentry.init).mock.calls[0][0];
    const beforeSend = initCall.beforeSend!;

    const mockEvent = { message: 'Hydration failed', tags: {} };
    const mockHint = { originalException: new Error('Hydration failed') };

    const result = beforeSend(mockEvent, mockHint);
    expect(result?.tags).toHaveProperty('errorType', 'hydration');
  });

  it('beforeSend tags digest errors', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://test@sentry.io/123');

    const Sentry = await import('@sentry/nextjs');
    await import('../../../sentry.client.config');

    const initCall = vi.mocked(Sentry.init).mock.calls[0][0];
    const beforeSend = initCall.beforeSend!;

    const mockEvent = { message: 'Render error', tags: {} };
    const errorWithDigest = Object.assign(new Error('Render error'), {
      digest: 'abc123',
    });
    const mockHint = { originalException: errorWithDigest };

    const result = beforeSend(mockEvent, mockHint);
    expect(result?.tags).toHaveProperty('digest', 'abc123');
    expect(result?.tags).toHaveProperty('errorType', 'next-digest');
  });

  it('SENTRY_FORCE_ENABLE escape hatch enables in development', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://test@sentry.io/123');
    vi.stubEnv('NEXT_PUBLIC_SENTRY_FORCE_ENABLE', 'true');

    const Sentry = await import('@sentry/nextjs');
    await import('../../../sentry.client.config');

    expect(Sentry.init).toHaveBeenCalledTimes(1);
    const initCall = vi.mocked(Sentry.init).mock.calls[0][0];
    expect(initCall.enabled).toBe(true);
  });

  it('does not call init when DSN is missing', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    // No DSN set

    const Sentry = await import('@sentry/nextjs');
    await import('../../../sentry.client.config');

    expect(Sentry.init).not.toHaveBeenCalled();
  });
});

describe('sentry.server.config', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    // Mock process.version for server config
    Object.defineProperty(process, 'version', {
      writable: true,
      value: 'v20.0.0',
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('calls init with enabled=true when NODE_ENV=production and DSN present (F-07)', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://test@sentry.io/123');

    const Sentry = await import('@sentry/nextjs');
    await import('../../../sentry.server.config');

    expect(Sentry.init).toHaveBeenCalledTimes(1);
    const initCall = vi.mocked(Sentry.init).mock.calls[0][0];
    expect(initCall.enabled).toBe(true);
    expect(initCall.dsn).toBe('https://test@sentry.io/123');
  });

  it('calls init with enabled=false when NODE_ENV=development', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://test@sentry.io/123');

    const Sentry = await import('@sentry/nextjs');
    await import('../../../sentry.server.config');

    expect(Sentry.init).toHaveBeenCalledTimes(1);
    const initCall = vi.mocked(Sentry.init).mock.calls[0][0];
    expect(initCall.enabled).toBe(false);
  });

  it('beforeSend returns event (never null) (F-08)', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://test@sentry.io/123');

    const Sentry = await import('@sentry/nextjs');
    await import('../../../sentry.server.config');

    const initCall = vi.mocked(Sentry.init).mock.calls[0][0];
    const beforeSend = initCall.beforeSend!;

    const mockEvent = { message: 'Server error', tags: {} };
    const mockHint = { originalException: new Error('Server error') };

    const result = beforeSend(mockEvent, mockHint);
    expect(result).not.toBeNull();
    expect(result).toBe(mockEvent);
  });

  it('beforeSend tags SSR digest errors', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://test@sentry.io/123');

    const Sentry = await import('@sentry/nextjs');
    await import('../../../sentry.server.config');

    const initCall = vi.mocked(Sentry.init).mock.calls[0][0];
    const beforeSend = initCall.beforeSend!;

    const mockEvent = { message: 'SSR error', tags: {} };
    const errorWithDigest = { digest: 'ssr123' };
    const mockHint = { originalException: errorWithDigest };

    const result = beforeSend(mockEvent, mockHint);
    expect(result?.tags).toHaveProperty('digest', 'ssr123');
    expect(result?.tags).toHaveProperty('errorType', 'ssr-render');
  });

  it('SENTRY_FORCE_ENABLE escape hatch works', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://test@sentry.io/123');
    vi.stubEnv('SENTRY_FORCE_ENABLE', 'true');

    const Sentry = await import('@sentry/nextjs');
    await import('../../../sentry.server.config');

    expect(Sentry.init).toHaveBeenCalledTimes(1);
    const initCall = vi.mocked(Sentry.init).mock.calls[0][0];
    expect(initCall.enabled).toBe(true);
  });

  it('does not call init when DSN is missing', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    // No DSN set

    const Sentry = await import('@sentry/nextjs');
    await import('../../../sentry.server.config');

    expect(Sentry.init).not.toHaveBeenCalled();
  });
});

describe('sentry.edge.config', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('calls init with enabled=true when NODE_ENV=production and DSN present (F-07)', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://test@sentry.io/123');

    const Sentry = await import('@sentry/nextjs');
    await import('../../../sentry.edge.config');

    expect(Sentry.init).toHaveBeenCalledTimes(1);
    const initCall = vi.mocked(Sentry.init).mock.calls[0][0];
    expect(initCall.enabled).toBe(true);
    expect(initCall.dsn).toBe('https://test@sentry.io/123');
  });

  it('calls init with enabled=false when NODE_ENV=development', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://test@sentry.io/123');

    const Sentry = await import('@sentry/nextjs');
    await import('../../../sentry.edge.config');

    expect(Sentry.init).toHaveBeenCalledTimes(1);
    const initCall = vi.mocked(Sentry.init).mock.calls[0][0];
    expect(initCall.enabled).toBe(false);
  });

  it('beforeSend returns event (never null) (F-08)', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://test@sentry.io/123');

    const Sentry = await import('@sentry/nextjs');
    await import('../../../sentry.edge.config');

    const initCall = vi.mocked(Sentry.init).mock.calls[0][0];
    const beforeSend = initCall.beforeSend!;

    const mockEvent = { message: 'Edge error', tags: {} };
    const mockHint = { originalException: new Error('Edge error') };

    const result = beforeSend(mockEvent, mockHint);
    expect(result).not.toBeNull();
    expect(result).toBe(mockEvent);
  });

  it('beforeSend tags edge errors with runtime', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://test@sentry.io/123');

    const Sentry = await import('@sentry/nextjs');
    await import('../../../sentry.edge.config');

    const initCall = vi.mocked(Sentry.init).mock.calls[0][0];
    const beforeSend = initCall.beforeSend!;

    const mockEvent = { message: 'Edge error', tags: {} };
    const mockHint = { originalException: new Error('Edge error') };

    const result = beforeSend(mockEvent, mockHint);
    expect(result?.tags).toHaveProperty('runtime', 'edge');
  });

  it('SENTRY_FORCE_ENABLE escape hatch works', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://test@sentry.io/123');
    vi.stubEnv('SENTRY_FORCE_ENABLE', 'true');

    const Sentry = await import('@sentry/nextjs');
    await import('../../../sentry.edge.config');

    expect(Sentry.init).toHaveBeenCalledTimes(1);
    const initCall = vi.mocked(Sentry.init).mock.calls[0][0];
    expect(initCall.enabled).toBe(true);
  });

  it('does not call init when DSN is missing', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    // No DSN set

    const Sentry = await import('@sentry/nextjs');
    await import('../../../sentry.edge.config');

    expect(Sentry.init).not.toHaveBeenCalled();
  });
});

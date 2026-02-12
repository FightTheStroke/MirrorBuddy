import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

describe('logger sentry sanitization', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('sanitizes server logger context before sending to Sentry', async () => {
    vi.stubEnv('NODE_ENV', 'production');

    const { logger } = await import('../index');
    const Sentry = await import('@sentry/nextjs');

    logger.error('Server failure', {
      component: 'ApiRoute',
      userId: 'user-123456789',
      requestId: 'req-1',
      email: 'sensitive@example.com',
      token: 'secret-token',
    });

    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    const payload = vi.mocked(Sentry.captureException).mock.calls[0]?.[1] as
      | { extra?: Record<string, unknown> }
      | undefined;
    expect(payload?.extra).toEqual(
      expect.objectContaining({
        component: 'ApiRoute',
        requestId: 'req-1',
        userId: 'user-123...',
      }),
    );
    expect(payload?.extra).not.toHaveProperty('email');
    expect(payload?.extra).not.toHaveProperty('token');
  });

  it('sanitizes client logger context and skips console noise in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { clientLogger } = await import('../client');
    const Sentry = await import('@sentry/nextjs');

    clientLogger.error('Client failure', {
      component: 'ClientWidget',
      userId: 'client-user-123456',
      email: 'client@example.com',
      token: 'client-token',
    });
    clientLogger.warn('Client warning', {
      userId: 'client-user-123456',
      apiKey: 'client-api-key',
    });

    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    expect(Sentry.captureMessage).toHaveBeenCalledTimes(1);

    const errorPayload = vi.mocked(Sentry.captureException).mock.calls[0]?.[1] as
      | { extra?: Record<string, unknown> }
      | undefined;
    expect(errorPayload?.extra).toEqual(
      expect.objectContaining({
        component: 'ClientWidget',
        userId: 'client-u...',
      }),
    );
    expect(errorPayload?.extra).not.toHaveProperty('email');
    expect(errorPayload?.extra).not.toHaveProperty('token');

    const warnPayload = vi.mocked(Sentry.captureMessage).mock.calls[0]?.[1] as
      | { extra?: Record<string, unknown> }
      | undefined;
    expect(warnPayload?.extra).toEqual(
      expect.objectContaining({
        userId: 'client-u...',
      }),
    );
    expect(warnPayload?.extra).not.toHaveProperty('apiKey');

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });
});

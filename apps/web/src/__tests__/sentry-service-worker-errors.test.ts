import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

describe('production service worker diagnostics', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://test@sentry.io/123');
    vi.stubEnv('NEXT_PUBLIC_SENTRY_FORCE_ENABLE', 'false');
    vi.stubGlobal('location', { hostname: 'www.mirrorbuddy.org' });
    vi.stubGlobal('navigator', {
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1',
      webdriver: false,
      onLine: true,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('keeps a real iOS service worker failure instead of dropping it as transient', async () => {
    await import('../../sentry.client.config');
    const options = vi.mocked(Sentry.init).mock.calls[0][0];
    expect(options.enabled).toBe(true);
    const error = new TypeError('Script https://www.mirrorbuddy.org/sw.js load failed');
    const event = { type: undefined, message: error.message, tags: {} };

    const result = await options.beforeSend!(event, { originalException: error });

    expect(result).toBe(event);
    expect(event.tags).toEqual(expect.objectContaining({ online: 'yes' }));
  });
});

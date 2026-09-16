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
  extraErrorDataIntegration: vi.fn(() => ({})),
  rewriteFramesIntegration: vi.fn(() => ({})),
  prismaIntegration: vi.fn(() => ({})),
  httpIntegration: vi.fn(() => ({})),
  onUncaughtExceptionIntegration: vi.fn(() => ({})),
  onUnhandledRejectionIntegration: vi.fn(() => ({})),
  consoleIntegration: vi.fn(() => ({})),
  nodeProfilingIntegration: vi.fn(() => ({})),
}));

type SentryEventLike = {
  tags?: Record<string, string>;
  request?: { url?: string; headers?: Record<string, string> };
};

type BeforeSend = (
  event: SentryEventLike,
  hint: { originalException?: unknown },
) => SentryEventLike | null;

const CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const HEADLESS =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/140.0.0.0 Safari/537.36';

function capturedBeforeSend(): BeforeSend {
  const init = vi.mocked(Sentry.init);
  expect(init).toHaveBeenCalled();
  const options = init.mock.calls[0]?.[0] as { beforeSend?: BeforeSend } | undefined;
  const beforeSend = options?.beforeSend;
  if (!beforeSend) throw new Error('Sentry.init was called without a beforeSend hook');
  return beforeSend;
}

function enableSentryEnv(): void {
  vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://key@o1.ingest.us.sentry.io/123456');
  vi.stubEnv('SENTRY_DSN', 'https://key@o1.ingest.us.sentry.io/123456');
  vi.stubEnv('NODE_ENV', 'production');
}

describe('error provenance tagging', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  describe('browser events', () => {
    beforeEach(() => {
      enableSentryEnv();
      vi.stubEnv('NEXT_PUBLIC_VERCEL_ENV', 'production');
      vi.stubGlobal('location', { hostname: 'www.mirrorbuddy.org' });
      vi.stubGlobal('window', { innerWidth: 1280, innerHeight: 800 });
    });

    it('tags a real browser so triage can tell it apart from automation', async () => {
      vi.stubGlobal('navigator', { userAgent: CHROME, onLine: true, webdriver: false });

      await import('../../../../sentry.client.config');
      const event = capturedBeforeSend()({}, {});

      expect(event?.tags?.clientKind).toBe('browser');
      expect(event?.tags?.uaFamily).toBe('chrome');
    });

    it('tags a headless run as automation', async () => {
      vi.stubGlobal('navigator', { userAgent: HEADLESS, onLine: true, webdriver: false });

      await import('../../../../sentry.client.config');
      const event = capturedBeforeSend()({}, {});

      expect(event?.tags?.clientKind).toBe('automation');
      expect(event?.tags?.uaFamily).toBe('headless-chrome');
    });

    it('trusts navigator.webdriver over a human-looking agent string', async () => {
      vi.stubGlobal('navigator', { userAgent: CHROME, onLine: true, webdriver: true });

      await import('../../../../sentry.client.config');
      const event = capturedBeforeSend()({}, {});

      expect(event?.tags?.clientKind).toBe('automation');
      expect(event?.tags?.automationMarker).toBe('webdriver');
    });
  });

  describe('server events', () => {
    beforeEach(() => {
      enableSentryEnv();
      vi.stubEnv('VERCEL', '1');
      vi.stubEnv('VERCEL_ENV', 'production');
      vi.stubEnv('E2E_TESTS', '0');
    });

    it('classifies the caller from the request headers', async () => {
      await import('../../../../sentry.server.config');
      const event = capturedBeforeSend()({ request: { headers: { 'user-agent': HEADLESS } } }, {});

      expect(event?.tags?.clientKind).toBe('automation');
      expect(event?.tags?.uaFamily).toBe('headless-chrome');
    });

    it('records the failing route without its query string', async () => {
      await import('../../../../sentry.server.config');
      const event = capturedBeforeSend()(
        {
          request: {
            url: 'https://www.mirrorbuddy.org/api/materials/3fa85f64-5717-4562-b3fc-2c963f66afa6?token=secret',
            headers: { 'user-agent': CHROME },
          },
        },
        {},
      );

      expect(event?.tags?.httpRoute).toBe('/api/materials/:id');
      expect(JSON.stringify(event?.tags)).not.toContain('secret');
    });

    it('stays unknown rather than guessing when no agent is present', async () => {
      await import('../../../../sentry.server.config');
      const event = capturedBeforeSend()({}, {});

      expect(event?.tags?.clientKind).toBe('unknown');
      expect(event?.tags?.httpRoute).toBeUndefined();
    });
  });

  describe('edge events', () => {
    beforeEach(() => {
      enableSentryEnv();
      vi.stubEnv('VERCEL', '1');
      vi.stubEnv('VERCEL_ENV', 'production');
      vi.stubEnv('E2E_TESTS', '0');
    });

    it('tags the proxy runtime with caller and route too', async () => {
      await import('../../../../sentry.edge.config');
      const event = capturedBeforeSend()(
        {
          request: {
            url: 'https://www.mirrorbuddy.org/it/welcome?ref=x',
            headers: { 'user-agent': HEADLESS },
          },
        },
        {},
      );

      expect(event?.tags?.runtime).toBe('edge');
      expect(event?.tags?.clientKind).toBe('automation');
      expect(event?.tags?.httpRoute).toBe('/it/welcome');
    });
  });
});

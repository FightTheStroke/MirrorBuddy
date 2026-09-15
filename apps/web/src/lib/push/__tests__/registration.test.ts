import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from '@/lib/logger';
import { registerServiceWorker } from '../subscription';

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => ({ info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  },
}));
vi.mock('@/lib/auth', () => ({ csrfFetch: vi.fn() }));
vi.mock('../capacitor-push', () => ({
  isCapacitorEnvironment: vi.fn(() => false),
  requestPushPermission: vi.fn(),
  registerForPush: vi.fn(),
}));

describe('push service worker registration', () => {
  const register = vi.fn();
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('navigator', { serviceWorker: { register } });
    vi.stubGlobal('PushManager', class {});
  });
  afterEach(() => vi.unstubAllGlobals());

  it.each([undefined, null])(
    'reports missing registration without reading scope: %s',
    async (value) => {
      register.mockResolvedValueOnce(value);
      expect(await registerServiceWorker()).toBeNull();
      expect(logger.debug).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith('[Push] Registration unavailable');
      expect(logger.error).not.toHaveBeenCalled();
    },
  );

  it('returns the actual registration and logs its real scope', async () => {
    const registration = { scope: 'https://example.test/' };
    register.mockResolvedValueOnce(registration);
    expect(await registerServiceWorker()).toBe(registration);
    expect(logger.debug).toHaveBeenCalledWith('[Push] Service worker registered', registration);
  });

  it('keeps the original registration rejection visible', async () => {
    const error = new DOMException('Service worker blocked', 'SecurityError');
    register.mockRejectedValueOnce(error);
    expect(await registerServiceWorker()).toBeNull();
    expect(logger.error).toHaveBeenCalledWith(
      '[Push] Service worker registration failed',
      undefined,
      error,
    );
  });
});

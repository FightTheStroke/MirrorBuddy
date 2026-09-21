import { afterEach, describe, expect, it, vi } from 'vitest';
import { logger } from '@/lib/logger';
import { registerServiceWorker, subscribeToPush } from '../subscription';

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  },
}));
vi.mock('../vapid', () => ({
  isPushSupported: () => true,
  getPushCapabilityStatus: () => 'supported',
  getVapidPublicKey: () => 'public-key',
  urlBase64ToUint8Array: vi.fn(),
}));
vi.mock('../capacitor-push', () => ({
  isCapacitorEnvironment: () => false,
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('optional push worker registration', () => {
  it('handles script load failures without reporting an application error', async () => {
    vi.stubGlobal('navigator', {
      serviceWorker: {
        register: vi.fn().mockRejectedValue(new TypeError('Script /sw.js load failed')),
        ready: Promise.resolve(null),
      },
    });
    vi.stubGlobal('Notification', { requestPermission: vi.fn().mockResolvedValue('granted') });
    await expect(registerServiceWorker()).resolves.toBeNull();
    await expect(subscribeToPush()).resolves.toBeNull();
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
  });
});

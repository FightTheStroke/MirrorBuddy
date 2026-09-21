import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as Sentry from '@sentry/nextjs';

vi.mock('@sentry/nextjs', () => ({
  addBreadcrumb: vi.fn(),
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}));
vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => 'web', isNativePlatform: () => false },
}));
vi.mock('@capacitor/camera', () => ({
  Camera: {},
  CameraResultType: {},
  CameraSource: {},
}));

describe('camera production reporting', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('NODE_ENV', 'production');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it.each([
    'NotSupportedError',
    'NotAllowedError',
    'PermissionDeniedError',
    'NotFoundError',
    'NotReadableError',
    'OverconstrainedError',
  ])('retains %s as a handled diagnostic for both camera stream APIs', async (name) => {
    const error = new DOMException('Camera unavailable', name);
    vi.stubGlobal('navigator', {
      mediaDevices: { getUserMedia: vi.fn().mockRejectedValue(error) },
    });
    const { requestVideoStream, requestMediaStream } = await import('../media-bridge-stream');
    await expect(requestVideoStream()).rejects.toBe(error);
    await expect(requestMediaStream()).rejects.toBe(error);
    expect(Sentry.captureException).not.toHaveBeenCalled();
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
    expect(Sentry.addBreadcrumb).toHaveBeenCalledTimes(2);
  });

  it.each([undefined, {}, { mediaDevices: {} }, { mediaDevices: { getUserMedia: true } }])(
    'classifies missing or non-callable APIs as unsupported: %s',
    async (navigatorValue) => {
      vi.stubGlobal('navigator', navigatorValue);
      const { requestVideoStream, requestMediaStream } = await import('../media-bridge-stream');
      await expect(requestVideoStream()).rejects.toMatchObject({ name: 'NotSupportedError' });
      await expect(requestMediaStream()).rejects.toMatchObject({ name: 'NotSupportedError' });
      expect(Sentry.captureException).not.toHaveBeenCalled();
    },
  );

  it('preserves unexpected errors', async () => {
    const error = new Error('Unexpected driver failure');
    vi.stubGlobal('navigator', {
      mediaDevices: { getUserMedia: vi.fn().mockRejectedValue(error) },
    });
    const { requestVideoStream } = await import('../media-bridge-stream');
    await expect(requestVideoStream()).rejects.toBe(error);
    expect(Sentry.captureException).toHaveBeenCalledWith(error, expect.any(Object));
  });
});

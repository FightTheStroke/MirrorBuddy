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

describe('microphone production reporting', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('NODE_ENV', 'production');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it.each(['NotSupportedError', 'OverconstrainedError'])(
    'retains %s recovery diagnostics without emitting a Sentry event',
    async (name) => {
      const stream = { getAudioTracks: () => [] };
      const getUserMedia = vi
        .fn()
        .mockRejectedValueOnce(Object.assign(new Error('Constraints unsupported'), { name }))
        .mockResolvedValueOnce(stream);
      vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
      const { requestMicrophoneStream } = await import('../media-bridge');

      await expect(requestMicrophoneStream({ sampleRate: 48_000 })).resolves.toBe(stream);

      expect(getUserMedia).toHaveBeenLastCalledWith({ audio: true, video: false });
      expect(Sentry.addBreadcrumb).toHaveBeenCalledExactlyOnceWith({
        category: 'media-bridge',
        message: '[MediaBridge] Retrying microphone stream with default constraints',
        data: { component: 'media-bridge', errorName: name },
        level: 'info',
        timestamp: expect.any(Number),
      });
      expect(Sentry.captureMessage).not.toHaveBeenCalled();
      expect(Sentry.captureException).not.toHaveBeenCalled();
    },
  );

  it('still captures an unexpected failure after the compatibility retry', async () => {
    const failure = new Error('Device disconnected');
    const getUserMedia = vi
      .fn()
      .mockRejectedValueOnce(
        Object.assign(new Error('Constraints unsupported'), {
          name: 'NotSupportedError',
        }),
      )
      .mockRejectedValueOnce(failure);
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
    const { requestMicrophoneStream } = await import('../media-bridge');

    await expect(requestMicrophoneStream({ sampleRate: 48_000 })).rejects.toBe(failure);

    expect(Sentry.addBreadcrumb).toHaveBeenCalledOnce();
    expect(Sentry.captureException).toHaveBeenCalledExactlyOnceWith(
      failure,
      expect.objectContaining({
        extra: expect.objectContaining({
          message: '[MediaBridge] Microphone access error after fallback',
        }),
      }),
    );
  });
});

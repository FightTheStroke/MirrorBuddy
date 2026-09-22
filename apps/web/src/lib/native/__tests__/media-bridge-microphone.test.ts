/**
 * Media Bridge Tests — Microphone
 * Tests for microphone stream management and permission checks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { addBreadcrumb } from '@/lib/sentry';
import {
  requestMicrophoneStream,
  stopMicrophoneStream,
  checkMicrophonePermission,
} from '../media-bridge';

// Mock Capacitor
const { mockCapacitor, mockClientLogger } = vi.hoisted(() => ({
  mockCapacitor: {
    getPlatform: vi.fn(),
    isNativePlatform: vi.fn(),
  },
  mockClientLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: mockCapacitor,
}));

vi.mock('@capacitor/camera', () => ({
  Camera: {},
  CameraResultType: { Uri: 'uri', Base64: 'base64', DataUrl: 'dataUrl' },
  CameraSource: { Camera: 'CAMERA', Photos: 'PHOTOS' },
}));

vi.mock('@/lib/logger/client', () => ({
  clientLogger: mockClientLogger,
}));
vi.mock('@/lib/sentry', () => ({ addBreadcrumb: vi.fn() }));

function setMicrophone(getUserMedia: ReturnType<typeof vi.fn>) {
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
}

describe('media-bridge — microphone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('requestMicrophoneStream', () => {
    it.each([undefined, { echoCancellation: true, noiseSuppression: true }])(
      'requests one stream with constraints %j',
      async (constraints) => {
        const stream = {
          getAudioTracks: vi.fn().mockReturnValue([{ id: 'track-1' }]),
        } as unknown as MediaStream;
        const request = vi.fn().mockResolvedValue(stream);
        setMicrophone(request);
        await expect(requestMicrophoneStream(constraints)).resolves.toBe(stream);
        expect(request).toHaveBeenCalledTimes(1);
        expect(request).toHaveBeenCalledWith({ audio: constraints ?? true, video: false });
      },
    );

    it.each([undefined, {}, { echoCancellation: true }])(
      'does not retry denied access with %j',
      async (constraints) => {
        const error = Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' });
        const request = vi.fn().mockRejectedValue(error);
        setMicrophone(request);
        await expect(requestMicrophoneStream(constraints)).rejects.toBe(error);
        expect(request).toHaveBeenCalledTimes(1);
        expect(mockClientLogger.warn).not.toHaveBeenCalled();
      },
    );

    it.each(['NotSupportedError', 'OverconstrainedError'])(
      'retries exactly once on %s',
      async (name) => {
        const notSupportedError = new Error('Not supported');
        notSupportedError.name = name;
        const fallbackStream = {
          id: 'fallback-stream',
          getAudioTracks: vi.fn().mockReturnValue([{ id: 'track-fallback' }]),
        } as unknown as MediaStream;

        const mockGetUserMedia = vi
          .fn()
          .mockRejectedValueOnce(notSupportedError)
          .mockResolvedValueOnce(fallbackStream);

        setMicrophone(mockGetUserMedia);

        const stream = await requestMicrophoneStream({
          echoCancellation: true,
          noiseSuppression: true,
        });

        expect(mockGetUserMedia).toHaveBeenNthCalledWith(1, {
          audio: { echoCancellation: true, noiseSuppression: true },
          video: false,
        });
        expect(mockGetUserMedia).toHaveBeenNthCalledWith(2, {
          audio: true,
          video: false,
        });
        expect(stream).toBe(fallbackStream);
        expect(mockGetUserMedia).toHaveBeenCalledTimes(2);
        expect(addBreadcrumb).toHaveBeenCalledWith(
          'media-bridge',
          '[MediaBridge] Retrying microphone stream with default constraints',
          expect.objectContaining({
            component: 'media-bridge',
            errorName: name,
          }),
        );
        expect(mockClientLogger.warn).not.toHaveBeenCalled();
        expect(mockClientLogger.error).not.toHaveBeenCalled();
      },
    );

    it.each([
      ['NotSupportedError', undefined],
      ['OverconstrainedError', undefined],
      ['NotSupportedError', {}],
      ['OverconstrainedError', {}],
    ] as const)('does not retry %s with default constraints %j', async (name, constraints) => {
      const notSupportedError = new Error('Not supported');
      notSupportedError.name = name;
      const mockGetUserMedia = vi.fn().mockRejectedValue(notSupportedError);

      setMicrophone(mockGetUserMedia);

      await expect(requestMicrophoneStream(constraints)).rejects.toBe(notSupportedError);
      expect(mockGetUserMedia).toHaveBeenCalledTimes(1);
      expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true, video: false });

      expect(mockClientLogger.info).toHaveBeenCalledWith(
        '[MediaBridge] Microphone access unavailable',
        expect.objectContaining({
          component: 'media-bridge',
          errorName: name,
        }),
      );
      expect(mockClientLogger.warn).not.toHaveBeenCalled();
      expect(mockClientLogger.error).not.toHaveBeenCalled();
    });

    it.each(['NotSupportedError', 'OverconstrainedError'])(
      'preserves a rejected %s fallback without a third call',
      async (name) => {
        const first = Object.assign(new Error('Constrained request failed'), { name });
        const originalFallback = Object.assign(new Error('Fallback failed'), { name });
        const request = vi.fn().mockRejectedValueOnce(first).mockRejectedValue(originalFallback);
        setMicrophone(request);
        const constraints = { echoCancellation: true };
        await expect(requestMicrophoneStream(constraints)).rejects.toBe(originalFallback);
        expect(request.mock.calls).toEqual([
          [{ audio: constraints, video: false }],
          [{ audio: true, video: false }],
        ]);
        expect(request).toHaveBeenCalledTimes(2);
      },
    );
  });

  describe('stopMicrophoneStream', () => {
    it('stops all tracks in the stream', () => {
      const mockTrack1 = { stop: vi.fn(), id: 'track-1' };
      const mockTrack2 = { stop: vi.fn(), id: 'track-2' };
      const mockStream = {
        getTracks: vi.fn().mockReturnValue([mockTrack1, mockTrack2]),
      } as unknown as MediaStream;

      stopMicrophoneStream(mockStream);

      expect(mockStream.getTracks).toHaveBeenCalled();
      expect(mockTrack1.stop).toHaveBeenCalled();
      expect(mockTrack2.stop).toHaveBeenCalled();
    });

    it('handles empty track list', () => {
      const mockStream = {
        getTracks: vi.fn().mockReturnValue([]),
      } as unknown as MediaStream;

      expect(() => stopMicrophoneStream(mockStream)).not.toThrow();
    });
  });

  describe('checkMicrophonePermission', () => {
    it('uses Permissions API when available', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(false);

      const mockPermissionStatus = {
        state: 'granted',
      };

      vi.stubGlobal('navigator', {
        permissions: {
          query: vi.fn().mockResolvedValue(mockPermissionStatus),
        },
      });

      const result = await checkMicrophonePermission();

      expect(result).toBe('granted');
    });

    it('returns prompt if Permissions API unavailable', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(false);
      setMicrophone(vi.fn());

      const result = await checkMicrophonePermission();
      expect(result).toBe('prompt');
    });

    it('returns denied if no getUserMedia available', async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(false);
      vi.stubGlobal('navigator', {});

      const result = await checkMicrophonePermission();
      expect(result).toBe('denied');
    });
  });
});

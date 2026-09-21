import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useUnifiedCamera } from '../use-unified-camera';
import { requestVideoStream } from '@/lib/native/media-bridge';
import { clientLogger } from '@/lib/logger/client';
import toast from '@/components/ui/toast';

vi.mock('@/lib/native/media-bridge', () => ({ requestVideoStream: vi.fn() }));
vi.mock('@/lib/logger/client', () => ({
  clientLogger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('@/lib/sentry', () => ({ addBreadcrumb: vi.fn() }));
vi.mock('@/components/ui/toast', () => ({ default: { error: vi.fn() } }));
vi.mock('../use-camera-usage', () => ({
  useCameraUsage: () => ({
    startVideoUsage: vi.fn().mockResolvedValue(true),
    endUsageSession: vi.fn().mockResolvedValue(undefined),
    limitReached: false,
  }),
}));
vi.mock('../video-capture', () => ({
  useVideoCapture: () => ({
    startCapture: vi.fn().mockResolvedValue(true),
    stopCapture: vi.fn(),
    isCapturing: true,
    videoStream: null,
    framesSent: 0,
    elapsedSeconds: 0,
  }),
}));
vi.mock('../actions', () => ({ useSendVideoFrame: () => vi.fn() }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('photo camera facing failures', () => {
  it.each(['NotSupportedError', 'NotAllowedError', 'OverconstrainedError'])(
    'handles %s when switching front/back without leaving an active camera',
    async (name) => {
      const track = { stop: vi.fn() };
      vi.stubGlobal(
        'MediaStream',
        class {
          getTracks() {
            return [track];
          }
        },
      );
      const stream = new MediaStream();
      vi.mocked(requestVideoStream)
        .mockResolvedValueOnce(stream)
        .mockRejectedValueOnce(new DOMException('Camera access unavailable', name));
      const { result } = renderHook(() =>
        useUnifiedCamera({
          webrtcDataChannelRef: { current: null },
          sessionIdRef: { current: 'session' },
          videoUsageIdRef: { current: null },
          videoMaxSecondsRef: { current: 60 },
        }),
      );
      await act(() => result.current.cycleCameraMode());
      await act(() => result.current.cycleCameraMode());
      expect(result.current.cameraMode).toBe('photo');
      await act(async () => {
        result.current.toggleCameraFacing();
      });
      expect(clientLogger.error).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalled();
      expect(result.current.cameraMode).toBe('off');
      expect(result.current.videoStream).toBeNull();
      expect(track.stop).toHaveBeenCalledOnce();
    },
  );
});

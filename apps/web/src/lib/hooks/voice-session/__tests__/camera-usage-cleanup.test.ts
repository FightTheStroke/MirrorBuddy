import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUnifiedCamera } from '../use-unified-camera';
import { clientLogger } from '@/lib/logger/client';

const { csrfFetch, requestVideoStream, startCapture, stopCapture } = vi.hoisted(() => ({
  csrfFetch: vi.fn(),
  requestVideoStream: vi.fn(),
  startCapture: vi.fn(),
  stopCapture: vi.fn(),
}));
vi.mock('@/lib/auth', () => ({ csrfFetch }));
vi.mock('@/lib/native/media-bridge', () => ({ requestVideoStream }));
vi.mock('@/lib/logger/client', () => ({
  clientLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('../actions', () => ({ useSendVideoFrame: () => vi.fn() }));
vi.mock('../video-capture', () => ({
  useVideoCapture: () => ({
    videoStream: null,
    isCapturing: true,
    framesSent: 0,
    elapsedSeconds: 0,
    startCapture,
    stopCapture,
  }),
}));

function createRefs(): Parameters<typeof useUnifiedCamera>[0] {
  return {
    webrtcDataChannelRef: { current: null },
    sessionIdRef: { current: 'test-session' },
    videoUsageIdRef: { current: null },
    videoMaxSecondsRef: { current: 60 },
  };
}

describe('camera usage and photo ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    csrfFetch.mockImplementation(async () => Response.json({ id: 'usage-1', maxSeconds: 60 }));
    startCapture.mockResolvedValue(true);
    vi.stubGlobal(
      'MediaStream',
      class {
        getTracks = () => this.tracks;
        tracks = [{ stop: vi.fn() }];
      },
    );
    requestVideoStream.mockImplementation(async () => new MediaStream());
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it.each(['cycleCameraMode', 'toggleVideo'] as const)(
    '%s ends the usage reservation when video capture fails',
    async (method) => {
      startCapture.mockResolvedValue(false);
      const refs = createRefs();
      const { result } = renderHook(() => useUnifiedCamera(refs));

      await act(async () => result.current[method]());

      expect(csrfFetch).toHaveBeenCalledTimes(2);
      expect(JSON.parse(csrfFetch.mock.calls[1][1].body)).toEqual({
        action: 'end',
        usageId: 'usage-1',
        secondsUsed: 0,
      });
      expect(refs.videoUsageIdRef.current).toBeNull();
      expect(result.current.cameraMode).toBe('off');
    },
  );

  it('stops the photo stream when the camera owner unmounts', async () => {
    const stream = new MediaStream();
    requestVideoStream.mockResolvedValue(stream);
    const refs = createRefs();
    const { result, unmount } = renderHook(() => useUnifiedCamera(refs));
    await act(async () => result.current.cycleCameraMode());
    await act(async () => result.current.cycleCameraMode());
    expect(result.current.cameraMode).toBe('photo');

    unmount();

    expect(stream.getTracks()[0].stop).toHaveBeenCalledTimes(1);
  });

  it('releases photo access that resolves after unmount', async () => {
    let resolveStream!: (stream: MediaStream) => void;
    requestVideoStream.mockReturnValue(
      new Promise<MediaStream>((resolve) => {
        resolveStream = resolve;
      }),
    );
    const refs = createRefs();
    const { result, unmount } = renderHook(() => useUnifiedCamera(refs));
    await act(async () => result.current.cycleCameraMode());
    let opening!: Promise<void>;
    await act(async () => {
      opening = result.current.cycleCameraMode();
    });
    unmount();
    const stream = new MediaStream();

    await act(async () => {
      resolveStream(stream);
      await opening;
    });

    expect(stream.getTracks()[0].stop).toHaveBeenCalledTimes(1);
  });

  it('ends an active video reservation when its owner unmounts', async () => {
    const refs = createRefs();
    const { result, unmount } = renderHook(() => useUnifiedCamera(refs));
    await act(async () => result.current.cycleCameraMode());

    await act(async () => unmount());

    expect(csrfFetch).toHaveBeenCalledTimes(2);
    expect(JSON.parse(csrfFetch.mock.calls[1][1].body).action).toBe('end');
    expect(refs.videoUsageIdRef.current).toBeNull();
  });

  it('reports a rejected usage rollback and retains its reservation for recovery', async () => {
    csrfFetch
      .mockResolvedValueOnce(Response.json({ id: 'usage-1', maxSeconds: 60 }))
      .mockResolvedValueOnce(Response.json({ error: 'Unavailable' }, { status: 503 }));
    startCapture.mockResolvedValue(false);
    const refs = createRefs();
    const { result } = renderHook(() => useUnifiedCamera(refs));

    await act(async () => result.current.cycleCameraMode());

    expect(refs.videoUsageIdRef.current).toBe('usage-1');
    expect(clientLogger.error).toHaveBeenCalledWith('[UnifiedCamera] Failed to end session', {
      error: 'Error: Video usage end failed: HTTP 503',
    });
  });

  it('does not submit the same usage end twice when unmount interrupts a stop', async () => {
    let finishEnd!: (response: Response) => void;
    csrfFetch
      .mockResolvedValueOnce(Response.json({ id: 'usage-1', maxSeconds: 60 }))
      .mockReturnValueOnce(
        new Promise<Response>((resolve) => {
          finishEnd = resolve;
        }),
      );
    const refs = createRefs();
    const { result, unmount } = renderHook(() => useUnifiedCamera(refs));
    await act(async () => result.current.toggleVideo());
    let stopping!: Promise<void>;
    act(() => {
      stopping = result.current.toggleVideo();
    });
    unmount();

    await act(async () => Promise.resolve());
    const requestsBeforeEnd = csrfFetch.mock.calls.length;
    finishEnd(Response.json({}));
    await act(async () => stopping);

    expect(requestsBeforeEnd).toBe(2);
  });

  it.each([
    ['cycleCameraMode', 'cycleCameraMode'],
    ['toggleVideo', 'toggleVideo'],
    ['cycleCameraMode', 'toggleVideo'],
  ] as const)('serializes overlapping %s / %s transitions', async (first, second) => {
    let finishStart!: (response: Response) => void;
    csrfFetch.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        finishStart = resolve;
      }),
    );
    const refs = createRefs();
    const { result } = renderHook(() => useUnifiedCamera(refs));
    let firstStart!: Promise<void>;
    let secondStart!: Promise<void>;
    act(() => {
      firstStart = result.current[first]();
      secondStart = result.current[second]();
    });
    const requestsBeforeGrant = csrfFetch.mock.calls.length;

    finishStart(Response.json({ id: 'usage-1', maxSeconds: 60 }));
    await act(async () => Promise.all([firstStart, secondStart]));

    expect(requestsBeforeGrant).toBe(1);
    expect(startCapture).toHaveBeenCalledTimes(1);
    expect(result.current.cameraMode).toBe('video');
    expect(refs.videoUsageIdRef.current).toBe('usage-1');
  });
});

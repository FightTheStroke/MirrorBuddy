import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useVideoCapture } from '../video-capture';

const { requestVideoStream } = vi.hoisted(() => ({ requestVideoStream: vi.fn() }));
vi.mock('@/lib/native/media-bridge', () => ({ requestVideoStream }));
vi.mock('@/lib/logger/client', () => ({
  clientLogger: { info: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));

describe('video capture resource lifecycle', () => {
  let stream: MediaStream;
  let video: HTMLVideoElement;
  let playbackError: DOMException | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    playbackError = undefined;
    vi.stubGlobal(
      'MediaStream',
      class {
        tracks = [{ stop: vi.fn() }];
        getTracks = () => this.tracks;
      },
    );
    stream = new MediaStream();
    requestVideoStream.mockResolvedValue(stream);
    const createElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      const element = createElement(tag);
      if (element instanceof HTMLVideoElement) {
        video = element;
        const play = vi.spyOn(video, 'play');
        if (playbackError) play.mockRejectedValue(playbackError);
        else play.mockResolvedValue();
        Object.defineProperty(video, 'readyState', { value: 2 });
      }
      if (element instanceof HTMLCanvasElement) {
        Object.defineProperty(element, 'getContext', {
          value: () => ({
            drawImage: vi.fn(),
            getImageData: () => ({ data: new Uint8ClampedArray(160) }),
          }),
        });
        vi.spyOn(element, 'toDataURL').mockReturnValue('data:image/jpeg;base64,dGVzdA==');
      }
      return element;
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('releases the camera when video playback rejects with NotSupportedError', async () => {
    playbackError = new DOMException('Not supported', 'NotSupportedError');
    const { result } = renderHook(() => useVideoCapture({ onFrame: vi.fn(), maxSeconds: 60 }));

    await act(async () => expect(result.current.startCapture()).resolves.toBe(false));

    expect(stream.getTracks()[0].stop).toHaveBeenCalledTimes(1);
    expect(video.srcObject).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels the first-frame timer and cannot send a frame after unmount', async () => {
    const onFrame = vi.fn();
    const { result, unmount } = renderHook(() => useVideoCapture({ onFrame, maxSeconds: 60 }));
    await act(async () => result.current.startCapture());

    unmount();
    const remainingTimers = vi.getTimerCount();
    act(() => vi.advanceTimersByTime(1000));

    expect(remainingTimers).toBe(0);
    expect(onFrame).not.toHaveBeenCalled();
    expect(video.srcObject).toBeNull();
    expect(stream.getTracks()[0].stop).toHaveBeenCalledTimes(1);
  });

  it('releases access granted after unmount without starting playback or timers', async () => {
    let grantAccess!: (stream: MediaStream) => void;
    requestVideoStream.mockReturnValue(
      new Promise<MediaStream>((resolve) => {
        grantAccess = resolve;
      }),
    );
    const { result, unmount } = renderHook(() =>
      useVideoCapture({ onFrame: vi.fn(), maxSeconds: 60 }),
    );
    let starting!: Promise<boolean>;
    act(() => {
      starting = result.current.startCapture();
    });
    unmount();

    grantAccess(stream);
    await act(async () => expect(starting).resolves.toBe(false));

    expect(stream.getTracks()[0].stop).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});

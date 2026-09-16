import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sendCameraSnapshot } from '../camera-snapshot';
import { clientLogger } from '@/lib/logger/client';

vi.mock('@/lib/logger/client', () => ({
  clientLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('camera snapshot capture contract', () => {
  let video: HTMLVideoElement;
  let stream: MediaStream;
  let channel: RTCDataChannel;
  let playbackError: Error | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    playbackError = undefined;
    vi.stubGlobal('MediaStream', class {});
    vi.stubGlobal(
      'RTCDataChannel',
      class {
        send = vi.fn();
      },
    );
    stream = new MediaStream();
    channel = new RTCDataChannel();
    const createElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      const element = createElement(tag);
      if (element instanceof HTMLVideoElement) {
        video = element;
        vi.spyOn(video, 'pause').mockImplementation(() => {});
        vi.spyOn(video, 'play').mockImplementation(async () => {
          if (playbackError) throw playbackError;
        });
      }
      if (element instanceof HTMLCanvasElement) {
        Object.defineProperty(element, 'getContext', { value: () => ({ drawImage: vi.fn() }) });
        vi.spyOn(element, 'toDataURL').mockReturnValue('data:image/jpeg;base64,dGVzdA==');
      }
      return element;
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('preserves image then response ordering and releases the temporary video element', async () => {
    await sendCameraSnapshot(stream, { current: channel }, () => true);

    const messages = vi.mocked(channel.send).mock.calls.map(([data]) => JSON.parse(String(data)));
    expect(messages.map((message) => message.type)).toEqual([
      'conversation.item.create',
      'response.create',
    ]);
    expect(messages[0].item.content[0].image_url).toBe('data:image/jpeg;base64,dGVzdA==');
    expect(video.pause).toHaveBeenCalledTimes(1);
    expect(video.srcObject).toBeNull();
  });

  it('releases the temporary video on playback failure and still reports the failure', async () => {
    playbackError = new DOMException('Not supported', 'NotSupportedError');

    await sendCameraSnapshot(stream, { current: channel }, () => true);

    expect(channel.send).not.toHaveBeenCalled();
    expect(video.pause).toHaveBeenCalledTimes(1);
    expect(video.srcObject).toBeNull();
    expect(clientLogger.error).toHaveBeenCalledWith('[UnifiedCamera] Snapshot failed', {
      error: 'NotSupportedError: Not supported',
    });
  });

  it('does not transmit an image when the owner was removed during playback startup', async () => {
    await sendCameraSnapshot(stream, { current: channel }, () => false);

    expect(channel.send).not.toHaveBeenCalled();
    expect(video.srcObject).toBeNull();
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleWebRTCTrack } from '../webrtc-handlers';

vi.mock('@/lib/logger/client', () => ({
  clientLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../latency-utils', () => ({
  recordWebRTCFirstAudio: vi.fn(),
}));

class MockMediaStream {
  private _tracks: Array<{ stop: () => void }> = [];
  addTrack(_track: unknown) {
    // Store a stop handle to simulate tracks being stopped on cleanup.
    this._tracks.push({ stop: vi.fn() });
  }
  getTracks() {
    return this._tracks as unknown as MediaStreamTrack[];
  }
}

class MockAudio {
  autoplay = false;
  playsInline = false;
  srcObject: unknown = null;
  error: { message?: string } | null = null;
  onerror: ((this: GlobalEventHandlers, ev: Event) => unknown) | null = null;
  pause = vi.fn();
}

describe('handleWebRTCTrack', () => {
  const originalAudio = globalThis.Audio;
  const originalMediaStream = globalThis.MediaStream;

  beforeEach(() => {
    // Mock constructors used by the handler.

    (globalThis as any).Audio = MockAudio;

    (globalThis as any).MediaStream = MockMediaStream;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Restore globals to avoid leaking into other tests.

    (globalThis as any).Audio = originalAudio;

    (globalThis as any).MediaStream = originalMediaStream;
  });

  it('should stop previous audio element and stream before attaching new track', () => {
    const prevTrackStop = vi.fn();
    const prevStream = {
      getTracks: () => [{ stop: prevTrackStop }],
    } as unknown as MediaStream;

    const prevAudio = new MockAudio() as unknown as HTMLAudioElement;
    const refs = {
      remoteAudioStreamRef: { current: prevStream },
      webrtcAudioElementRef: { current: prevAudio },
      userSpeechEndTimeRef: { current: null },
      firstAudioPlaybackTimeRef: { current: null },
    };

    const track = { kind: 'audio', onended: null } as unknown as MediaStreamTrack;
    const event = { track } as RTCTrackEvent;

    handleWebRTCTrack(event, refs);

    expect((prevAudio as unknown as MockAudio).pause).toHaveBeenCalledTimes(1);
    expect(refs.webrtcAudioElementRef.current).not.toBe(prevAudio);
    expect(prevTrackStop).toHaveBeenCalledTimes(1);
    expect(refs.remoteAudioStreamRef.current).not.toBe(prevStream);
  });
});

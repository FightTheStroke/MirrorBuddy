import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { requestMicrophoneStream } from '@/lib/native/media-bridge';
import { WebRTCConnection } from '../webrtc-connection';
import { logVoiceError } from '../voice-error-logger';

vi.mock('@/lib/logger/client', () => ({
  clientLogger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('@/lib/auth', () => ({ csrfFetch: vi.fn() }));
vi.mock('@/lib/native/media-bridge', () => ({
  isMediaDevicesAvailable: () => true,
  requestMicrophoneStream: vi.fn(),
}));
vi.mock('../voice-error-logger', () => ({
  logConnectionStateChange: vi.fn(),
  logICEConnectionStateChange: vi.fn(),
  logDataChannelStateChange: vi.fn(),
  logMediaStreamTracks: vi.fn(),
  logMicrophonePermissionRequest: vi.fn(),
  logSDPExchange: vi.fn(),
  logVoiceError: vi.fn(),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

function microphone() {
  const stop = vi.fn();
  const track = { enabled: true, stop };
  const stream = {
    getTracks: () => [track],
    getAudioTracks: () => [track],
  } as unknown as MediaStream;
  return { stream, stop, track };
}

class Peer {
  static created: Peer[] = [];
  connectionState = 'connected';
  iceGatheringState = 'complete';
  localDescription = { sdp: 'owned-offer', type: 'offer' };
  addTrack = vi.fn();
  close = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  channel = { label: 'realtime-channel', close: vi.fn() };
  createDataChannel = vi.fn(() => this.channel);
  createOffer = vi.fn(async () => this.localDescription);
  setLocalDescription = vi.fn(async () => undefined);
  setRemoteDescription = vi.fn(async () => undefined);
  constructor() {
    Peer.created.push(this);
  }
}

function setup(fetchConfig = false) {
  const token = deferred<string | null>();
  const media = deferred<MediaStream>();
  const onError = vi.fn();
  const getCachedToken = vi.fn(() => token.promise);
  vi.mocked(requestMicrophoneStream).mockReturnValueOnce(media.promise);
  const connection = new WebRTCConnection({
    maestro: { id: 'owned-maestro', name: 'Test' } as never,
    connectionInfo: (fetchConfig ? {} : { azureResource: 'owned-local-test' }) as never,
    getCachedToken,
    onError,
  });
  return { connection, token, media, onError, getCachedToken };
}

describe('microphone acquisition ownership', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    Peer.created = [];
    vi.stubGlobal('RTCPeerConnection', Peer);
    vi.stubGlobal(
      'RTCSessionDescription',
      class {
        constructor(readonly init: unknown) {}
      },
    );
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, text: async () => 'owned-answer' })),
    );
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it.each(['token', 'config'] as const)(
    'stops a late grant once after %s failure, preserving cause',
    async (failure) => {
      const p = setup(failure === 'config');
      const config = deferred<Response>();
      if (failure === 'config') vi.mocked(fetch).mockReturnValueOnce(config.promise);
      const original = Object.assign(new Error(`${failure}-failed`), {
        code: 'VOICE_TOKEN_UNAVAILABLE',
      });
      const connecting = p.connection.connect().catch((error) => error);
      if (failure === 'token') p.token.reject(original);
      else {
        p.token.resolve('owned-token');
        config.reject(original);
      }
      const error = await connecting;
      expect(error).toMatchObject({
        message: original.message,
        code: original.code,
        _voiceRootCause: true,
      });
      const mic = microphone();
      p.media.resolve(mic.stream);
      await vi.advanceTimersByTimeAsync(0);
      p.connection.cancel();
      p.connection.cancel();
      expect(mic.stop).toHaveBeenCalledTimes(1);
      expect(error.cause).toBe(original);
      expect(p.onError).toHaveBeenCalledTimes(1);
      expect(p.onError).toHaveBeenCalledWith(error);
      expect(logVoiceError).toHaveBeenCalledTimes(1);
      expect(Peer.created).toHaveLength(0);
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it('stops a grant after cancellation without creating a peer or reporting a new failure', async () => {
    const p = setup();
    p.token.resolve('owned-token');
    const connecting = p.connection.connect().catch((error) => error);
    p.connection.cancel();
    const mic = microphone();
    p.media.resolve(mic.stream);
    const outcome = await connecting;
    p.connection.cancel();
    expect(mic.stop).toHaveBeenCalledTimes(1);
    expect(outcome).toMatchObject({ name: 'AbortError' });
    expect(Peer.created).toHaveLength(0);
    expect(p.onError).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('releases an acquired stream once when cancelled before token resolution', async () => {
    const p = setup();
    const mic = microphone();
    const connecting = p.connection.connect().catch((error) => error);
    p.media.resolve(mic.stream);
    await vi.advanceTimersByTimeAsync(0);
    p.connection.cancel();
    expect(mic.stop).toHaveBeenCalledTimes(1);
    p.token.resolve('owned-token');
    expect(await connecting).toMatchObject({ name: 'AbortError' });
    p.connection.cancel();
    expect(mic.stop).toHaveBeenCalledTimes(1);
    expect(Peer.created).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not let an older rejected attempt release the next connection', async () => {
    const p = setup();
    const old = p.connection.connect().catch((error) => error);
    p.connection.cancel();
    const active = microphone();
    vi.mocked(requestMicrophoneStream).mockResolvedValueOnce(active.stream);
    p.getCachedToken.mockResolvedValueOnce('new-token');
    const result = await p.connection.connect();
    const original = new Error('old-token-failed');
    p.token.reject(original);
    await old;
    const late = microphone();
    p.media.resolve(late.stream);
    await vi.advanceTimersByTimeAsync(0);
    expect(late.stop).toHaveBeenCalledTimes(1);
    expect(active.stop).not.toHaveBeenCalled();
    expect(Peer.created).toHaveLength(1);
    expect(Peer.created[0].close).not.toHaveBeenCalled();
    expect(Peer.created[0].addTrack).toHaveBeenCalledTimes(1);
    expect(p.onError).not.toHaveBeenCalled();
    result.cleanup();
    result.cleanup();
    expect(active.stop).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps a successful stream owned until cleanup and makes an old cleanup harmless', async () => {
    const p = setup();
    const first = microphone();
    p.token.resolve('first-token');
    p.media.resolve(first.stream);
    const old = await p.connection.connect();
    expect(first.stop).not.toHaveBeenCalled();
    expect(first.track.enabled).toBe(false);
    old.unmuteAudioTracks();
    expect(first.track.enabled).toBe(true);
    const second = microphone();
    vi.mocked(requestMicrophoneStream).mockResolvedValueOnce(second.stream);
    p.getCachedToken.mockResolvedValueOnce('second-token');
    const current = await p.connection.connect();
    expect(first.stop).toHaveBeenCalledTimes(1);
    old.cleanup();
    old.unmuteAudioTracks();
    expect(second.stop).not.toHaveBeenCalled();
    expect(second.track.enabled).toBe(false);
    current.cleanup();
    current.cleanup();
    expect(second.stop).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});

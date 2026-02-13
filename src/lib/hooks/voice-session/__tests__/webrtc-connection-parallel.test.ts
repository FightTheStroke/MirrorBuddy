import { describe, it, expect, vi } from 'vitest';
import { WebRTCConnection } from '../webrtc-connection';

vi.mock('@/lib/logger/client', () => ({
  clientLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/auth', () => ({
  csrfFetch: vi.fn(),
}));

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('WebRTCConnection.connect', () => {
  it('should start token fetch and getUserMedia in parallel', async () => {
    const token = createDeferred<string>();
    const media = createDeferred<MediaStream>();

    const connection = new WebRTCConnection({
      maestro: { id: 'm1' } as never,
      connectionInfo: {} as never,
    }) as unknown as {
      connect: () => Promise<unknown>;
      getEphemeralToken: () => Promise<string>;
      getUserMedia: () => Promise<MediaStream>;
      createPeerConnection: () => unknown;
      addAudioTracks: () => void;
      createDataChannel: () => void;
      createOffer: () => Promise<unknown>;
      exchangeSDP: () => Promise<void>;
      waitForConnection: () => Promise<void>;
    };

    connection.getEphemeralToken = vi.fn(() => token.promise);
    connection.getUserMedia = vi.fn(() => media.promise);

    // Stub the rest of the sequence so connect can finish.
    connection.createPeerConnection = vi.fn(() => ({}));
    connection.addAudioTracks = vi.fn();
    connection.createDataChannel = vi.fn();
    connection.createOffer = vi.fn(async () => ({}));
    connection.exchangeSDP = vi.fn(async () => undefined);
    connection.waitForConnection = vi.fn(async () => undefined);

    const connectPromise = connection.connect();

    // Allow synchronous part of connect() to run.
    await Promise.resolve();

    expect(connection.getEphemeralToken).toHaveBeenCalledTimes(1);
    expect(connection.getUserMedia).toHaveBeenCalledTimes(1);

    media.resolve({ getTracks: () => [] } as unknown as MediaStream);
    token.resolve('tok');

    await expect(connectPromise).resolves.toBeDefined();
  });

  it('should stop acquired media stream if token fetch fails after getUserMedia resolves', async () => {
    const token = createDeferred<string>();
    const media = createDeferred<MediaStream>();

    const connection = new WebRTCConnection({
      maestro: { id: 'm1' } as never,
      connectionInfo: {} as never,
    }) as unknown as {
      connect: () => Promise<unknown>;
      getEphemeralToken: () => Promise<string>;
      getUserMedia: () => Promise<MediaStream>;
      createPeerConnection: () => unknown;
      addAudioTracks: () => void;
      createDataChannel: () => void;
      createOffer: () => Promise<unknown>;
      exchangeSDP: () => Promise<void>;
      waitForConnection: () => Promise<void>;
    };

    const trackStop = vi.fn();
    const mediaStream = { getTracks: () => [{ stop: trackStop }] } as unknown as MediaStream;

    connection.getEphemeralToken = vi.fn(() => token.promise);
    connection.getUserMedia = vi.fn(() => media.promise);

    // Stub the rest; they should not be called in this scenario.
    connection.createPeerConnection = vi.fn(() => ({}));
    connection.addAudioTracks = vi.fn();
    connection.createDataChannel = vi.fn();
    connection.createOffer = vi.fn(async () => ({}));
    connection.exchangeSDP = vi.fn(async () => undefined);
    connection.waitForConnection = vi.fn(async () => undefined);

    const connectPromise = connection.connect();

    // Allow synchronous part of connect() to run.
    await Promise.resolve();

    media.resolve(mediaStream);
    token.reject(new Error('token-failed'));

    await expect(connectPromise).rejects.toBeDefined();
    expect(trackStop).toHaveBeenCalledTimes(1);
  });
});

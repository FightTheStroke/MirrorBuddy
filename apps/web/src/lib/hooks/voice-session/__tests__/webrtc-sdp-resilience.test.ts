/**
 * Resilience behaviour of the WebRTC SDP negotiation.
 *
 * The relay exists so a school firewall does not silently end a student's call.
 * These tests pin the three ways that safety net could itself hurt: relaying
 * twice, relaying when Azure is asking us to back off, and leaving a request
 * running after the student has hung up.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebRTCConnection } from '../webrtc-connection';

vi.mock('@/lib/logger/client', () => ({
  clientLogger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/auth', () => ({ csrfFetch: vi.fn() }));

vi.mock('@/lib/feature-flags/client', () => ({
  isFeatureEnabled: vi.fn(() => ({ enabled: false, reason: 'disabled' })),
}));

vi.mock('@/lib/native/media-bridge', () => ({
  isMediaDevicesAvailable: vi.fn(() => true),
  requestMicrophoneStream: vi.fn(async () => ({
    getTracks: () => [{ enabled: false, stop: vi.fn() }],
    getAudioTracks: () => [{ enabled: false, stop: vi.fn() }],
  })),
}));

function azureFailure(status: number, headers: Record<string, string> = {}) {
  return {
    ok: false,
    status,
    statusText: 'Error',
    text: async () => '{"error":{"message":"upstream"}}',
    headers: new Headers(headers),
  };
}

function tokenConfig() {
  return {
    ok: true,
    json: async () => ({
      provider: 'azure',
      transport: 'webrtc',
      azureResource: 'my-resource',
      deployment: 'gpt-realtime',
    }),
  };
}

function newConnection() {
  const connection = new WebRTCConnection({
    maestro: { id: 'm1', name: 'Test' } as never,
    connectionInfo: { characterType: 'maestro' } as never,
  });
  (connection as unknown as Record<string, unknown>)['waitForConnection'] = vi.fn(
    async () => undefined,
  );
  return connection;
}

describe('WebRTC SDP resilience', () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let mockCsrfFetch: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockFetch = vi.fn();
    global.fetch = mockFetch as never;
    const { csrfFetch } = await import('@/lib/auth');
    mockCsrfFetch = csrfFetch as ReturnType<typeof vi.fn>;
    mockCsrfFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ token: 'ek_mock-token', expiresAt: '2099-12-31' }),
    });

    global.RTCPeerConnection = vi.fn(function (this: Record<string, unknown>) {
      this.createDataChannel = vi.fn(() => ({
        label: 'realtime-channel',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        close: vi.fn(),
      }));
      this.createOffer = vi.fn(async () => ({ sdp: 'mock-offer', type: 'offer' }));
      this.setLocalDescription = vi.fn(async () => undefined);
      this.setRemoteDescription = vi.fn(async () => undefined);
      this.addTrack = vi.fn();
      this.addEventListener = vi.fn();
      this.removeEventListener = vi.fn();
      this.close = vi.fn();
      this.iceGatheringState = 'complete';
      this.localDescription = { sdp: 'mock-offer', type: 'offer' };
      return this;
    }) as never;
    global.RTCSessionDescription = vi.fn(function (
      this: Record<string, unknown>,
      init: RTCSessionDescriptionInit,
    ) {
      this.sdp = init.sdp;
      this.type = init.type;
      return this;
    }) as never;
  });

  function relayCalls() {
    return mockCsrfFetch.mock.calls.filter((call) => call[0] === '/api/realtime/sdp-exchange');
  }

  it('tries the relay exactly once when the direct path throws and the relay then fails', async () => {
    // The direct request failing at the network level is what sends us down the
    // relay path. If the relay then answers 500, that must NOT be mistaken for
    // a second direct failure and relayed again.
    mockFetch
      .mockResolvedValueOnce(tokenConfig())
      .mockRejectedValueOnce(new TypeError('Failed to fetch'));
    mockCsrfFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'ek_mock-token', expiresAt: '2099-12-31' }),
      })
      .mockResolvedValueOnce(azureFailure(500));

    await expect(newConnection().connect()).rejects.toThrow();

    expect(relayCalls()).toHaveLength(1);
  });

  it('does not relay when Azure answers 429 — that is a back-off, not a blocked path', async () => {
    mockFetch.mockResolvedValueOnce(tokenConfig()).mockResolvedValueOnce(azureFailure(429));

    await expect(newConnection().connect()).rejects.toThrow();

    expect(relayCalls()).toHaveLength(0);
  });

  it('does not relay a 503 that carries Retry-After', async () => {
    mockFetch
      .mockResolvedValueOnce(tokenConfig())
      .mockResolvedValueOnce(azureFailure(503, { 'retry-after': '30' }));

    await expect(newConnection().connect()).rejects.toThrow();

    expect(relayCalls()).toHaveLength(0);
  });

  it('does relay a 503 with no Retry-After — that may be a blocked path', async () => {
    mockFetch.mockResolvedValueOnce(tokenConfig()).mockResolvedValueOnce(azureFailure(503));
    mockCsrfFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'ek_mock-token', expiresAt: '2099-12-31' }),
      })
      .mockResolvedValueOnce({ ok: true, text: async () => 'mock-answer-sdp' });

    await newConnection().connect();

    expect(relayCalls()).toHaveLength(1);
  });

  it('aborts the in-flight SDP request when the student hangs up mid-negotiation', async () => {
    let capturedSignal: AbortSignal | undefined;
    mockFetch.mockResolvedValueOnce(tokenConfig()).mockImplementationOnce(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          capturedSignal = init.signal as AbortSignal;
          capturedSignal.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );
    mockCsrfFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: 'ek_mock-token', expiresAt: '2099-12-31' }),
    });

    const connection = newConnection();
    const connecting = connection.connect();
    await vi.waitFor(() => expect(capturedSignal).toBeDefined());

    connection.cancel();

    expect(capturedSignal?.aborted).toBe(true);
    await expect(connecting).rejects.toThrow();
  });

  it('hands the caller a cancel handle before the attempt resolves', async () => {
    const { createWebRTCConnection } = await import('../webrtc-connection');
    mockFetch.mockResolvedValue(tokenConfig());

    let cancel: (() => void) | undefined;
    const pending = createWebRTCConnection({
      maestro: { id: 'm1', name: 'Test' } as never,
      connectionInfo: { characterType: 'maestro' } as never,
      registerCancel: (fn: () => void) => {
        cancel = fn;
      },
    } as never);

    // The handle must exist while connect() is still pending, otherwise a
    // hang-up during negotiation has nothing to cancel.
    expect(typeof cancel).toBe('function');
    cancel?.();
    await pending.catch(() => undefined);
  });
});

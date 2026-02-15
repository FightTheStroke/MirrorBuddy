/**
 * Unit tests for WebRTC GA Protocol Changes
 *
 * Tests server-driven protocol mode behavior:
 * - T1-07: ICE server configuration driven by server token response
 * - T1-08: ICE gathering wait driven by server token response
 *
 * Requirements: F-05 (WebRTC connectivity), F-06 (SDP exchange)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock logger
vi.mock('@/lib/logger/client', () => ({
  clientLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock CSRF fetch
vi.mock('@/lib/auth', () => ({
  csrfFetch: vi.fn(),
}));

// Mock media bridge
vi.mock('@/lib/native/media-bridge', () => ({
  isMediaDevicesAvailable: vi.fn(() => true),
  requestMicrophoneStream: vi.fn(),
}));

// Mock voice error logger
vi.mock('../voice-session/voice-error-logger', () => ({
  logConnectionStateChange: vi.fn(),
  logICEConnectionStateChange: vi.fn(),
  logDataChannelStateChange: vi.fn(),
  logMediaStreamTracks: vi.fn(),
  logMicrophonePermissionRequest: vi.fn(),
  logSDPExchange: vi.fn(),
  logVoiceError: vi.fn(),
}));

const mockMaestro = {
  id: 'galileo',
  name: 'galileo',
  displayName: 'Galileo',
  subject: 'physics',
  avatar: '/maestri/galileo.webp',
  color: '#FF6B6B',
  systemPrompt: 'You are Galileo...',
  specialty: 'astronomy',
  voice: 'alloy',
  voiceInstructions: 'Speak as Galileo',
  teachingStyle: 'socratic',
  greeting: 'Ciao!',
};

describe('WebRTC GA Protocol - ICE Configuration (T1-07)', () => {
  let originalRTCPeerConnection: typeof RTCPeerConnection;
  let mockPeerConnection: Partial<RTCPeerConnection>;
  let capturedConfig: RTCConfiguration | undefined;

  beforeEach(() => {
    originalRTCPeerConnection = global.RTCPeerConnection;

    const mockDataChannel = {
      label: 'realtime-channel',
      readyState: 'connecting',
      onopen: null,
      onclose: null,
      onerror: null,
      onmessage: null,
      send: vi.fn(),
      close: vi.fn(),
    } as unknown as RTCDataChannel;

    mockPeerConnection = {
      onconnectionstatechange: null,
      oniceconnectionstatechange: null,
      onicecandidate: null,
      ontrack: null,
      connectionState: 'new' as RTCPeerConnectionState,
      iceConnectionState: 'new' as RTCIceConnectionState,
      iceGatheringState: 'new' as RTCIceGatheringState,
      localDescription: null,
      remoteDescription: null,
      createDataChannel: vi.fn(() => mockDataChannel),
      addTrack: vi.fn(),
      createOffer: vi.fn(async () => ({
        type: 'offer' as RTCSdpType,
        sdp: 'mock-sdp-offer',
      })) as unknown as RTCPeerConnection['createOffer'],
      setLocalDescription: vi.fn(async () => {}),
      setRemoteDescription: vi.fn(async () => {}),
      close: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    global.RTCPeerConnection = function (config?: RTCConfiguration) {
      capturedConfig = config;
      return mockPeerConnection as RTCPeerConnection;
    } as unknown as typeof RTCPeerConnection;
  });

  afterEach(() => {
    global.RTCPeerConnection = originalRTCPeerConnection;
    vi.clearAllMocks();
  });

  it('should use empty iceServers array when server returns GA config (azureResource)', async () => {
    const { WebRTCConnection } = await import('../voice-session/webrtc-connection');

    const connection = new WebRTCConnection({
      maestro: mockMaestro as any,
      connectionInfo: { provider: 'azure', characterType: 'maestro' },
    });

    // Simulate server returning GA config
    (connection as any).serverConfig = {
      azureResource: 'my-resource',
      deployment: 'gpt-realtime',
    };

    const createPeerConnection = (connection as any).createPeerConnection.bind(connection);
    await createPeerConnection();

    expect(capturedConfig).toBeDefined();
    expect(capturedConfig?.iceServers).toEqual([]);
  });

  it('should use ICE_SERVERS configuration when server returns preview config (webrtcEndpoint)', async () => {
    const { WebRTCConnection } = await import('../voice-session/webrtc-connection');
    const { ICE_SERVERS } = await import('../voice-session/webrtc-types');

    const connection = new WebRTCConnection({
      maestro: mockMaestro as any,
      connectionInfo: { provider: 'azure', characterType: 'maestro' },
    });

    // Simulate server returning preview config (no azureResource)
    (connection as any).serverConfig = {
      webrtcEndpoint: 'https://swedencentral.realtimeapi-preview.ai.azure.com/v1/realtimertc',
      deployment: 'gpt-realtime',
    };

    const createPeerConnection = (connection as any).createPeerConnection.bind(connection);
    await createPeerConnection();

    expect(capturedConfig).toBeDefined();
    expect(capturedConfig?.iceServers).toEqual(ICE_SERVERS);
  });
});

describe('WebRTC GA Protocol - ICE Gathering Wait (T1-08)', () => {
  let originalRTCPeerConnection: typeof RTCPeerConnection;
  let mockPeerConnection: Partial<RTCPeerConnection>;
  let iceGatheringStateChangeListener: ((this: RTCPeerConnection, ev: Event) => void) | null = null;

  beforeEach(() => {
    originalRTCPeerConnection = global.RTCPeerConnection;

    mockPeerConnection = {
      onconnectionstatechange: null,
      oniceconnectionstatechange: null,
      onicecandidate: null,
      ontrack: null,
      connectionState: 'new' as RTCPeerConnectionState,
      iceConnectionState: 'new' as RTCIceConnectionState,
      iceGatheringState: 'gathering' as RTCIceGatheringState,
      localDescription: {
        type: 'offer' as RTCSdpType,
        sdp: 'mock-local-sdp',
        toJSON: () => ({ type: 'offer', sdp: 'mock-local-sdp' }),
      },
      remoteDescription: null,
      createDataChannel: vi.fn(() => ({
        label: 'realtime-channel',
        readyState: 'connecting',
        onopen: null,
        onclose: null,
        onerror: null,
        onmessage: null,
        send: vi.fn(),
        close: vi.fn(),
      })) as unknown as RTCPeerConnection['createDataChannel'],
      addTrack: vi.fn(),
      createOffer: vi.fn(async () => ({
        type: 'offer' as RTCSdpType,
        sdp: 'mock-sdp-offer',
      })) as unknown as RTCPeerConnection['createOffer'],
      setLocalDescription: vi.fn(async () => {}),
      setRemoteDescription: vi.fn(async () => {}),
      close: vi.fn(),
      addEventListener: vi.fn((event: string, listener: EventListener) => {
        if (event === 'icegatheringstatechange') {
          iceGatheringStateChangeListener = listener as (
            this: RTCPeerConnection,
            ev: Event,
          ) => void;
        }
      }),
      removeEventListener: vi.fn(),
    };

    global.RTCPeerConnection = function () {
      return mockPeerConnection as RTCPeerConnection;
    } as unknown as typeof RTCPeerConnection;
  });

  afterEach(() => {
    global.RTCPeerConnection = originalRTCPeerConnection;
    iceGatheringStateChangeListener = null;
    vi.clearAllMocks();
  });

  it('should skip ICE gathering wait when server returns GA config', async () => {
    const { WebRTCConnection } = await import('../voice-session/webrtc-connection');

    const connection = new WebRTCConnection({
      maestro: mockMaestro as any,
      connectionInfo: { provider: 'azure', characterType: 'maestro' },
    });

    // Simulate server returning GA config
    (connection as any).serverConfig = {
      azureResource: 'my-resource',
      deployment: 'gpt-realtime',
    };
    (connection as any).peerConnection = mockPeerConnection;

    const startTime = Date.now();
    const createOffer = (connection as any).createOffer.bind(connection);
    await createOffer();
    const elapsedTime = Date.now() - startTime;

    // Should return immediately without waiting for ICE gathering (< 100ms)
    expect(elapsedTime).toBeLessThan(100);
    expect(mockPeerConnection.addEventListener).not.toHaveBeenCalledWith(
      'icegatheringstatechange',
      expect.any(Function),
    );
  });

  it('should wait for ICE gathering completion when server returns preview config', async () => {
    const { WebRTCConnection } = await import('../voice-session/webrtc-connection');

    const connection = new WebRTCConnection({
      maestro: mockMaestro as any,
      connectionInfo: { provider: 'azure', characterType: 'maestro' },
    });

    // Simulate server returning preview config (no azureResource)
    (connection as any).serverConfig = {
      webrtcEndpoint: 'https://swedencentral.realtimeapi-preview.ai.azure.com/v1/realtimertc',
      deployment: 'gpt-realtime',
    };
    (connection as any).peerConnection = mockPeerConnection;

    // Simulate ICE gathering completing after 50ms
    setTimeout(() => {
      (mockPeerConnection as any).iceGatheringState = 'complete';
      if (iceGatheringStateChangeListener) {
        iceGatheringStateChangeListener.call(
          mockPeerConnection as RTCPeerConnection,
          new Event('icegatheringstatechange'),
        );
      }
    }, 50);

    const createOffer = (connection as any).createOffer.bind(connection);
    await createOffer();

    // Should have waited for ICE gathering
    expect(mockPeerConnection.addEventListener).toHaveBeenCalledWith(
      'icegatheringstatechange',
      expect.any(Function),
    );
    expect(mockPeerConnection.removeEventListener).toHaveBeenCalledWith(
      'icegatheringstatechange',
      expect.any(Function),
    );
  });
});

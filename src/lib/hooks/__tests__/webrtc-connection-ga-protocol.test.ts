/**
 * Unit tests for WebRTC GA Protocol Changes
 *
 * Tests GA protocol feature flag behavior:
 * - T1-07: ICE server configuration guarded by voice_ga_protocol flag
 * - T1-08: ICE gathering wait guarded by voice_ga_protocol flag
 *
 * Requirements: F-05 (WebRTC connectivity), F-06 (SDP exchange)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Mock } from 'vitest';

// Mock feature flags service
vi.mock('@/lib/feature-flags/client', () => ({
  isFeatureEnabled: vi.fn(),
}));

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

describe('WebRTC GA Protocol - ICE Configuration (T1-07)', () => {
  let originalRTCPeerConnection: typeof RTCPeerConnection;
  let mockPeerConnection: Partial<RTCPeerConnection>;
  let capturedConfig: RTCConfiguration | undefined;

  beforeEach(() => {
    // Store original
    originalRTCPeerConnection = global.RTCPeerConnection;

    // Create mock data channel
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

    // Create mock peer connection
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

    // Mock RTCPeerConnection constructor
    global.RTCPeerConnection = function (config?: RTCConfiguration) {
      capturedConfig = config;
      return mockPeerConnection as RTCPeerConnection;
    } as unknown as typeof RTCPeerConnection;
  });

  afterEach(() => {
    // Restore original
    global.RTCPeerConnection = originalRTCPeerConnection;
    vi.clearAllMocks();
  });

  it('should use empty iceServers array when voice_ga_protocol is enabled', async () => {
    const { isFeatureEnabled } = await import('@/lib/feature-flags/client');
    (isFeatureEnabled as Mock).mockReturnValue({
      enabled: true,
      reason: 'enabled',
      flag: {
        id: 'voice_ga_protocol',
        name: 'Voice GA Protocol',
        description: 'Switch from preview to GA realtime API',
        status: 'enabled',
        enabledPercentage: 100,
        killSwitch: false,
        updatedAt: new Date(),
      },
    } as any);

    const { WebRTCConnection } = await import('../voice-session/webrtc-connection');
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

    const connection = new WebRTCConnection({
      maestro: mockMaestro as any,
      connectionInfo: { provider: 'azure', characterType: 'maestro' },
    });

    // Call the private method via reflection
    const createPeerConnection = (connection as any).createPeerConnection.bind(connection);
    await createPeerConnection();

    expect(capturedConfig).toBeDefined();
    expect(capturedConfig?.iceServers).toEqual([]);
  });

  it('should use ICE_SERVERS configuration when voice_ga_protocol is disabled', async () => {
    const { isFeatureEnabled } = await import('@/lib/feature-flags/client');
    (isFeatureEnabled as Mock).mockReturnValue({
      enabled: false,
      reason: 'disabled',
      flag: {
        id: 'voice_ga_protocol',
        name: 'Voice GA Protocol',
        description: 'Switch from preview to GA realtime API',
        status: 'disabled',
        enabledPercentage: 0,
        killSwitch: false,
        updatedAt: new Date(),
      },
    } as any);

    const { WebRTCConnection } = await import('../voice-session/webrtc-connection');
    const { ICE_SERVERS } = await import('../voice-session/webrtc-types');

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

    const connection = new WebRTCConnection({
      maestro: mockMaestro as any,
      connectionInfo: { provider: 'azure', characterType: 'maestro' },
    });

    // Call the private method via reflection
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

  it('should skip ICE gathering wait when voice_ga_protocol is enabled', async () => {
    const { isFeatureEnabled } = await import('@/lib/feature-flags/client');
    (isFeatureEnabled as Mock).mockReturnValue({
      enabled: true,
      reason: 'enabled',
      flag: {
        id: 'voice_ga_protocol',
        name: 'Voice GA Protocol',
        description: 'Switch from preview to GA realtime API',
        status: 'enabled',
        enabledPercentage: 100,
        killSwitch: false,
        updatedAt: new Date(),
      },
    } as any);

    const { WebRTCConnection } = await import('../voice-session/webrtc-connection');

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

    const connection = new WebRTCConnection({
      maestro: mockMaestro as any,
      connectionInfo: { provider: 'azure', characterType: 'maestro' },
    });

    // Set up peer connection
    (connection as any).peerConnection = mockPeerConnection;

    // Call createOffer
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

  it('should wait for ICE gathering completion when voice_ga_protocol is disabled', async () => {
    const { isFeatureEnabled } = await import('@/lib/feature-flags/client');
    (isFeatureEnabled as Mock).mockReturnValue({
      enabled: false,
      reason: 'disabled',
      flag: {
        id: 'voice_ga_protocol',
        name: 'Voice GA Protocol',
        description: 'Switch from preview to GA realtime API',
        status: 'disabled',
        enabledPercentage: 0,
        killSwitch: false,
        updatedAt: new Date(),
      },
    } as any);

    const { WebRTCConnection } = await import('../voice-session/webrtc-connection');

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

    const connection = new WebRTCConnection({
      maestro: mockMaestro as any,
      connectionInfo: { provider: 'azure', characterType: 'maestro' },
    });

    // Set up peer connection with 'gathering' state
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

    // Call createOffer
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

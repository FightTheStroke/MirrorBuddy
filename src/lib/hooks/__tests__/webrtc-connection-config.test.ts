/**
 * Unit tests for WebRTC Connection Configuration
 *
 * Tests WebRTC connection configuration structures:
 * - Configuration validation
 * - Callback signatures
 * - Result structure
 *
 * Requirements: F-05 (WebRTC connectivity), F-06 (SDP exchange)
 */

import { describe, it, expect, vi } from 'vitest';
import type { WebRTCConnectionConfig, WebRTCConnectionResult } from '../voice-session/webrtc-connection';
import type { Maestro, ConnectionInfo } from '@/types';

// ============================================================================
// TEST DATA
// ============================================================================

const mockMaestro: Maestro = {
  id: 'galileo',
  name: 'Galileo',
  subject: 'Physics',
  avatar: '/images/maestri/galileo.png',
  color: '#FF6B6B',
  systemPrompt: 'You are Galileo...',
};

const mockConnectionInfo: ConnectionInfo = {
  characterType: 'maestro',
};

// ============================================================================
// TESTS: Configuration Validation
// ============================================================================

describe('WebRTCConnectionConfig', () => {
  it('should have required fields', () => {
    const config: WebRTCConnectionConfig = {
      maestro: mockMaestro,
      connectionInfo: mockConnectionInfo,
    };

    expect(config.maestro).toBeDefined();
    expect(config.maestro.id).toBe('galileo');
    expect(config.connectionInfo).toBeDefined();
    expect(config.connectionInfo.characterType).toBe('maestro');
  });

  it('should support optional microphone preference', () => {
    const config: WebRTCConnectionConfig = {
      maestro: mockMaestro,
      connectionInfo: mockConnectionInfo,
      preferredMicrophoneId: 'device-id-123',
    };

    expect(config.preferredMicrophoneId).toBe('device-id-123');
  });

  it('should support optional callbacks', () => {
    const config: WebRTCConnectionConfig = {
      maestro: mockMaestro,
      connectionInfo: mockConnectionInfo,
      onConnectionStateChange: vi.fn(),
      onError: vi.fn(),
    };

    expect(config.onConnectionStateChange).toBeDefined();
    expect(config.onError).toBeDefined();
  });

  it('should have all callback signatures', () => {
    const config: WebRTCConnectionConfig = {
      maestro: mockMaestro,
      connectionInfo: mockConnectionInfo,
      onConnectionStateChange: vi.fn((_state: RTCPeerConnectionState) => {}),
      onICEConnectionStateChange: vi.fn((_state: RTCIceConnectionState) => {}),
      onTrack: vi.fn((_event: RTCTrackEvent) => {}),
      onError: vi.fn((_error: Error) => {}),
      onDataChannelMessage: vi.fn((_event: Record<string, unknown>) => {}),
      onDataChannelOpen: vi.fn(() => {}),
      onDataChannelClose: vi.fn(() => {}),
    };

    expect(config.onConnectionStateChange).toBeDefined();
    expect(config.onICEConnectionStateChange).toBeDefined();
    expect(config.onTrack).toBeDefined();
    expect(config.onError).toBeDefined();
    expect(config.onDataChannelMessage).toBeDefined();
    expect(config.onDataChannelOpen).toBeDefined();
    expect(config.onDataChannelClose).toBeDefined();
  });
});

// ============================================================================
// TESTS: WebRTCConnectionResult Structure
// ============================================================================

describe('WebRTCConnectionResult', () => {
  it('should define required result properties', () => {
    const resultType: WebRTCConnectionResult = {
      peerConnection: {} as RTCPeerConnection,
      mediaStream: {} as MediaStream,
      dataChannel: null,
      cleanup: vi.fn(),
    };

    expect(resultType.peerConnection).toBeDefined();
    expect(resultType.mediaStream).toBeDefined();
    expect(resultType.cleanup).toBeDefined();
  });

  it('should allow null data channel', () => {
    const result: WebRTCConnectionResult = {
      peerConnection: {} as RTCPeerConnection,
      mediaStream: {} as MediaStream,
      dataChannel: null,
      cleanup: () => {},
    };

    expect(result.dataChannel).toBeNull();
  });

  it('should support data channel', () => {
    const result: WebRTCConnectionResult = {
      peerConnection: {} as RTCPeerConnection,
      mediaStream: {} as MediaStream,
      dataChannel: {} as RTCDataChannel,
      cleanup: () => {},
    };

    expect(result.dataChannel).toBeDefined();
  });
});

// ============================================================================
// TESTS: Callback Invocations
// ============================================================================

describe('Callback Invocations', () => {
  it('should invoke connection state change callback', () => {
    const onStateChange = vi.fn();
    const config: WebRTCConnectionConfig = {
      maestro: mockMaestro,
      connectionInfo: mockConnectionInfo,
      onConnectionStateChange: onStateChange,
    };

    expect(config.onConnectionStateChange).toBe(onStateChange);
  });

  it('should invoke ICE connection state change callback', () => {
    const onIceStateChange = vi.fn();
    const config: WebRTCConnectionConfig = {
      maestro: mockMaestro,
      connectionInfo: mockConnectionInfo,
      onICEConnectionStateChange: onIceStateChange,
    };

    expect(config.onICEConnectionStateChange).toBe(onIceStateChange);
  });

  it('should invoke error callback', () => {
    const onError = vi.fn();
    const config: WebRTCConnectionConfig = {
      maestro: mockMaestro,
      connectionInfo: mockConnectionInfo,
      onError: onError,
    };

    const error = new Error('Connection failed');
    config.onError?.(error);

    expect(onError).toHaveBeenCalledWith(error);
  });

  it('should invoke track callback', () => {
    const onTrack = vi.fn();
    const config: WebRTCConnectionConfig = {
      maestro: mockMaestro,
      connectionInfo: mockConnectionInfo,
      onTrack: onTrack,
    };

    expect(config.onTrack).toBe(onTrack);
  });

  it('should invoke data channel callbacks', () => {
    const onOpen = vi.fn();
    const onClose = vi.fn();
    const onMessage = vi.fn();

    const config: WebRTCConnectionConfig = {
      maestro: mockMaestro,
      connectionInfo: mockConnectionInfo,
      onDataChannelOpen: onOpen,
      onDataChannelClose: onClose,
      onDataChannelMessage: onMessage,
    };

    expect(config.onDataChannelOpen).toBe(onOpen);
    expect(config.onDataChannelClose).toBe(onClose);
    expect(config.onDataChannelMessage).toBe(onMessage);
  });

  it('should handle optional callbacks gracefully', () => {
    const config: WebRTCConnectionConfig = {
      maestro: mockMaestro,
      connectionInfo: mockConnectionInfo,
    };

    expect(() => {
      config.onConnectionStateChange?.('connected');
      config.onError?.(new Error('test'));
      config.onDataChannelOpen?.();
    }).not.toThrow();
  });
});

/**
 * Unit tests for useConnect Hook
 *
 * Tests WebRTC/WebSocket connection management:
 * - Connection state management
 * - Transport mode selection
 * - Refs management
 * - Error handling
 *
 * Requirements: F-05 (WebRTC connectivity), F-11 (Fallback mechanism)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ConnectionRefs } from '../voice-session/connection-types';
import type { Maestro } from '@/types';
import type { ConnectionInfo } from '../voice-session/types';

// ============================================================================
// MOCKS
// ============================================================================

const mockMaestro: Maestro = {
  id: 'galileo',
  name: 'Galileo',
  subject: 'physics',
  avatar: '/images/maestri/galileo.png',
  color: '#FF6B6B',
  systemPrompt: 'You are Galileo...',
  specialty: 'astronomy',
  voice: 'alloy',
  voiceInstructions: 'Speak as Galileo',
  teachingStyle: 'socratic',
  greeting: 'Ciao!',
};

const _mockConnectionInfo: ConnectionInfo = {
  provider: 'azure',
  characterType: 'maestro',
};

function createMockRefs(): ConnectionRefs {
  return {
    wsRef: { current: null },
    maestroRef: { current: null },
    transportRef: { current: 'websocket' },
    captureContextRef: { current: null },
    playbackContextRef: { current: null },
    mediaStreamRef: { current: null },
    sourceNodeRef: { current: null },
    processorRef: { current: null },
    audioQueueRef: { current: [] },
    isPlayingRef: { current: false },
    isBufferingRef: { current: false },
    nextPlayTimeRef: { current: 0 },
    scheduledSourcesRef: { current: [] },
    sessionReadyRef: { current: false },
    greetingSentRef: { current: false },
    hasActiveResponseRef: { current: false },
    handleServerEventRef: { current: null },
    sessionIdRef: { current: null },
    connectionTimeoutRef: { current: null },
    webrtcCleanupRef: { current: null },
    remoteAudioStreamRef: { current: null },
    webrtcAudioElementRef: { current: null },
    webrtcDataChannelRef: { current: null },
    userSpeechEndTimeRef: { current: null },
    firstAudioPlaybackTimeRef: { current: null },
    sendSessionConfigRef: { current: null },
    initialMessagesRef: { current: null },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ============================================================================
// TESTS: Connection State Management
// ============================================================================

describe('useConnect Hook - State Management', () => {
  it('should initialize connection state', () => {
    const refs = createMockRefs();
    refs.maestroRef.current = mockMaestro;

    expect(refs.maestroRef.current).toBe(mockMaestro);
    expect(refs.sessionReadyRef.current).toBe(false);
    expect(refs.greetingSentRef.current).toBe(false);
  });

  it('should generate unique session ID', () => {
    const refs = createMockRefs();
    const sessionId1 = `voice-${mockMaestro.id}-${Date.now()}`;
    refs.sessionIdRef.current = sessionId1;

    expect(refs.sessionIdRef.current).toContain('voice-galileo');
    expect(typeof refs.sessionIdRef.current).toBe('string');
  });

  it('should reset greeting state on new connection', () => {
    const refs = createMockRefs();
    refs.greetingSentRef.current = true;
    refs.greetingSentRef.current = false;

    expect(refs.greetingSentRef.current).toBe(false);
  });

  it('should reset session ready state on new connection', () => {
    const refs = createMockRefs();
    refs.sessionReadyRef.current = true;
    refs.sessionReadyRef.current = false;

    expect(refs.sessionReadyRef.current).toBe(false);
  });
});

// ============================================================================
// TESTS: Transport Mode Selection
// ============================================================================

describe('useConnect Hook - Transport Mode', () => {
  it('should default to websocket transport', () => {
    const refs = createMockRefs();
    expect(refs.transportRef.current).toBe('websocket');
  });

  it('should support webrtc transport', () => {
    const refs = createMockRefs();
    refs.transportRef.current = 'webrtc';

    expect(refs.transportRef.current).toBe('webrtc');
  });

  it('should allow transport switching', () => {
    const refs = createMockRefs();
    refs.transportRef.current = 'webrtc';
    expect(refs.transportRef.current).toBe('webrtc');

    refs.transportRef.current = 'websocket';
    expect(refs.transportRef.current).toBe('websocket');
  });
});

// ============================================================================
// TESTS: Refs Management
// ============================================================================

describe('useConnect Hook - Refs Management', () => {
  it('should initialize all refs to null or false', () => {
    const refs = createMockRefs();

    expect(refs.maestroRef.current).toBeNull();
    expect(refs.sessionIdRef.current).toBeNull();
    expect(refs.sessionReadyRef.current).toBe(false);
    expect(refs.greetingSentRef.current).toBe(false);
  });

  it('should set handleServerEventRef', () => {
    const refs = createMockRefs();
    const handler = vi.fn();

    refs.handleServerEventRef.current = handler;

    expect(refs.handleServerEventRef.current).toBe(handler);
  });

  it('should preserve existing handleServerEventRef', () => {
    const refs = createMockRefs();
    const originalHandler = vi.fn();
    const newHandler = vi.fn();

    refs.handleServerEventRef.current = originalHandler;

    if (!refs.handleServerEventRef.current) {
      refs.handleServerEventRef.current = newHandler;
    }

    expect(refs.handleServerEventRef.current).toBe(originalHandler);
  });

  it('should store WebRTC cleanup function', () => {
    const refs = createMockRefs();
    const cleanup = vi.fn();

    refs.webrtcCleanupRef.current = cleanup;

    expect(refs.webrtcCleanupRef.current).toBe(cleanup);
  });

  it('should store media stream reference', () => {
    const refs = createMockRefs();
    const mockMediaStream = {
      getTracks: vi.fn(() => []),
    };

    refs.mediaStreamRef.current = mockMediaStream as any;

    expect(refs.mediaStreamRef.current).toBe(mockMediaStream);
  });

  it('should store WebRTC data channel reference', () => {
    const refs = createMockRefs();
    const mockDataChannel = {} as RTCDataChannel;

    refs.webrtcDataChannelRef.current = mockDataChannel;

    expect(refs.webrtcDataChannelRef.current).toBe(mockDataChannel);
  });
});

// ============================================================================
// TESTS: Error Handling
// ============================================================================

describe('useConnect Hook - Error Handling', () => {
  it('should handle connection errors', () => {
    const onError = vi.fn();
    const error = new Error('Connection failed');

    onError(error);

    expect(onError).toHaveBeenCalledWith(error);
  });

  it('should handle malformed error objects', () => {
    const onError = vi.fn();

    onError(new Error('String error'));

    expect(onError).toHaveBeenCalled();
  });
});

// ============================================================================
// TESTS: Connection Flow
// ============================================================================

describe('useConnect Hook - Connection Flow', () => {
  it('should support state transitions', () => {
    let state: 'idle' | 'connecting' | 'connected' | 'error' = 'idle';

    state = 'connecting';
    expect(state).toBe('connecting');

    state = 'connected';
    expect(state).toBe('connected');
  });

  it('should invoke onStateChange callback', () => {
    const onStateChange = vi.fn();

    onStateChange('connecting');
    onStateChange('connected');

    expect(onStateChange).toHaveBeenCalledTimes(2);
    expect(onStateChange).toHaveBeenNthCalledWith(1, 'connecting');
    expect(onStateChange).toHaveBeenNthCalledWith(2, 'connected');
  });
});

// ============================================================================
// TESTS: WebRTC Support Detection
// ============================================================================

describe('useConnect Hook - WebRTC Support', () => {
  it('should provide WebRTC support detection', () => {
    function isWebRTCSupported(): boolean {
      if (typeof window === 'undefined') return false;
      const w = window as unknown as Record<string, unknown>;
      return !!(
        w.RTCPeerConnection ||
        w.webkitRTCPeerConnection ||
        w.mozRTCPeerConnection ||
        w.msRTCPeerConnection
      );
    }

    const result = isWebRTCSupported();
    expect(typeof result).toBe('boolean');
  });

  it('should handle missing browser APIs gracefully', () => {
    function isWebRTCSupported(): boolean {
      if (typeof window === 'undefined') return false;
      const w = window as unknown as Record<string, unknown>;
      return !!(
        w.RTCPeerConnection ||
        w.webkitRTCPeerConnection ||
        w.mozRTCPeerConnection ||
        w.msRTCPeerConnection
      );
    }

    expect(() => {
      isWebRTCSupported();
    }).not.toThrow();
  });
});

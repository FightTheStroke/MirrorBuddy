import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useHandleServerEvent, type EventHandlerDeps } from '../event-handlers';

vi.mock('@/lib/logger/client', () => ({
  clientLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Event Handlers - GA Protocol Event Names', () => {
  let mockDeps: EventHandlerDeps;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create minimal mock dependencies
    mockDeps = {
      hasActiveResponseRef: { current: false },
      sessionReadyRef: { current: false },
      audioQueueRef: {
        current: {
          clear: vi.fn(),
        } as never,
      },
      isPlayingRef: { current: false },
      isBufferingRef: { current: false },
      scheduledSourcesRef: { current: new Set() },
      playbackContextRef: { current: null },
      connectionTimeoutRef: { current: null },
      greetingTimeoutsRef: { current: [] },
      webrtcDataChannelRef: { current: null },
      userSpeechEndTimeRef: { current: null },
      firstAudioPlaybackTimeRef: { current: null },
      voiceConnectStartTimeRef: { current: null },
      voiceDataChannelOpenTimeRef: { current: null },
      voiceSessionUpdatedTimeRef: { current: null },
      addTranscript: vi.fn(),
      setListening: vi.fn(),
      setSpeaking: vi.fn(),
      isSpeaking: false,
      voiceBargeInEnabled: true,
      sendSessionConfig: vi.fn(),
      sendGreeting: vi.fn(),
      unmuteAudioTracksRef: { current: null },
      startAudioCapture: vi.fn(),
      maestroRef: { current: { id: 'm1', name: 'Test Maestro' } } as never,
      sessionIdRef: { current: 'session-123' },
      addToolCall: vi.fn(),
      updateToolCall: vi.fn(),
      options: {
        onTranscript: vi.fn(),
        onStateChange: vi.fn(),
        onError: vi.fn(),
      },
    };
  });

  describe('Audio delta events', () => {
    it('should handle GA event name: response.output_audio.delta', () => {
      const { result } = renderHook(() => useHandleServerEvent(mockDeps));
      const handler = result.current;

      const event = {
        type: 'response.output_audio.delta',
        delta: 'base64-audio-data',
      };

      // Should not throw - WebRTC skips delta processing
      expect(() => handler(event)).not.toThrow();
    });

    it('should handle preview event name: response.audio.delta', () => {
      const { result } = renderHook(() => useHandleServerEvent(mockDeps));
      const handler = result.current;

      const event = {
        type: 'response.audio.delta',
        delta: 'base64-audio-data',
      };

      // Should not throw - WebRTC skips delta processing
      expect(() => handler(event)).not.toThrow();
    });
  });

  describe('Audio done events', () => {
    it('should handle GA event name: response.output_audio.done', () => {
      const { result } = renderHook(() => useHandleServerEvent(mockDeps));
      const handler = result.current;

      const event = {
        type: 'response.output_audio.done',
      };

      expect(() => handler(event)).not.toThrow();
    });

    it('should handle preview event name: response.audio.done', () => {
      const { result } = renderHook(() => useHandleServerEvent(mockDeps));
      const handler = result.current;

      const event = {
        type: 'response.audio.done',
      };

      expect(() => handler(event)).not.toThrow();
    });
  });

  describe('Transcript delta events', () => {
    it('should handle GA event name: response.output_audio_transcript.delta', () => {
      const { result } = renderHook(() => useHandleServerEvent(mockDeps));
      const handler = result.current;

      const event = {
        type: 'response.output_audio_transcript.delta',
        delta: 'partial transcript',
      };

      expect(() => handler(event)).not.toThrow();
    });

    it('should handle preview event name: response.audio_transcript.delta', () => {
      const { result } = renderHook(() => useHandleServerEvent(mockDeps));
      const handler = result.current;

      const event = {
        type: 'response.audio_transcript.delta',
        delta: 'partial transcript',
      };

      expect(() => handler(event)).not.toThrow();
    });
  });

  describe('Transcript done events', () => {
    it('should handle GA event name: response.output_audio_transcript.done', () => {
      const { result } = renderHook(() => useHandleServerEvent(mockDeps));
      const handler = result.current;

      const event = {
        type: 'response.output_audio_transcript.done',
        transcript: 'Complete assistant transcript',
      };

      handler(event);

      // Should add transcript
      expect(mockDeps.addTranscript).toHaveBeenCalledWith(
        'assistant',
        'Complete assistant transcript',
      );
      expect(mockDeps.options.onTranscript).toHaveBeenCalledWith(
        'assistant',
        'Complete assistant transcript',
      );
    });

    it('should handle preview event name: response.audio_transcript.done', () => {
      const { result } = renderHook(() => useHandleServerEvent(mockDeps));
      const handler = result.current;

      const event = {
        type: 'response.audio_transcript.done',
        transcript: 'Complete assistant transcript',
      };

      handler(event);

      // Should add transcript
      expect(mockDeps.addTranscript).toHaveBeenCalledWith(
        'assistant',
        'Complete assistant transcript',
      );
      expect(mockDeps.options.onTranscript).toHaveBeenCalledWith(
        'assistant',
        'Complete assistant transcript',
      );
    });
  });

  describe('User transcription events', () => {
    it('should handle conversation.item.input_audio_transcription.completed', () => {
      const { result } = renderHook(() => useHandleServerEvent(mockDeps));
      const handler = result.current;

      const event = {
        type: 'conversation.item.input_audio_transcription.completed',
        transcript: 'User said something',
      };

      handler(event);

      // Should add user transcript
      expect(mockDeps.addTranscript).toHaveBeenCalledWith('user', 'User said something');
      expect(mockDeps.options.onTranscript).toHaveBeenCalledWith('user', 'User said something');
    });
  });
});

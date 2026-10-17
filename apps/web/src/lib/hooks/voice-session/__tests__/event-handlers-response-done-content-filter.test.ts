/**
 * MIRRORBUDDY - Event Handlers: response.done content-filter terminal path
 *
 * Azure's realtime API can end a turn with `response.done` carrying a
 * content-filter rejection instead of a separate `error` event:
 * `status: "failed"` + `status_details.error.code === "content_filter"`, or
 * `status: "incomplete"` + `status_details.reason === "content_filter"`.
 * Without this handling the turn ends silently: hasActiveResponse is reset
 * (no stale pending state) but no notice ever reaches the UI.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useHandleServerEvent, type EventHandlerDeps } from '../event-handlers';
import { VoiceError } from '../voice-error-codes';

vi.mock('@/lib/logger/client', () => ({
  clientLogger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('Event Handlers - response.done content filter', () => {
  let mockDeps: EventHandlerDeps;
  let onError: ReturnType<typeof vi.fn<(error: Error) => void>>;

  beforeEach(() => {
    vi.clearAllMocks();
    onError = vi.fn<(error: Error) => void>();
    mockDeps = {
      hasActiveResponseRef: { current: true },
      sessionReadyRef: { current: true },
      audioQueueRef: { current: { clear: vi.fn() } as never },
      isPlayingRef: { current: false },
      isBufferingRef: { current: false },
      scheduledSourcesRef: { current: new Set() },
      playbackContextRef: { current: null },
      connectionTimeoutRef: { current: null },
      greetingTimeoutsRef: { current: [] },
      webrtcDataChannelRef: { current: null },
      webrtcAudioElementRef: { current: null },
      userSpeechEndTimeRef: { current: null },
      firstAudioPlaybackTimeRef: { current: null },
      voiceConnectStartTimeRef: { current: null },
      voiceDataChannelOpenTimeRef: { current: null },
      voiceSessionUpdatedTimeRef: { current: null },
      addTranscript: vi.fn(),
      setListening: vi.fn(),
      setSpeaking: vi.fn(),
      setSafetyWarning: vi.fn(),
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
        onError,
      },
    };
  });

  it('reports VOICE_CONTENT_FILTERED on status "failed" + status_details.error.code', () => {
    const { result } = renderHook(() => useHandleServerEvent(mockDeps));
    result.current({ type: 'response.created', response: { id: 'resp_filter_failed' } });
    result.current({
      type: 'response.done',
      response: {
        id: 'resp_filter_failed',
        status: 'failed',
        status_details: { error: { code: 'content_filter' } },
      },
    });

    expect(onError).toHaveBeenCalledTimes(1);
    expect((onError.mock.calls[0][0] as VoiceError).code).toBe('VOICE_CONTENT_FILTERED');
    // No stale pending state: the active-response flag is still cleared.
    expect(mockDeps.hasActiveResponseRef.current).toBe(false);
  });

  it('reports VOICE_CONTENT_FILTERED on status "incomplete" + status_details.reason', () => {
    const { result } = renderHook(() => useHandleServerEvent(mockDeps));
    result.current({ type: 'response.created', response: { id: 'resp_filter_incomplete' } });
    result.current({
      type: 'response.done',
      response: {
        id: 'resp_filter_incomplete',
        status: 'incomplete',
        status_details: { reason: 'content_filter' },
      },
    });

    expect(onError).toHaveBeenCalledTimes(1);
    expect((onError.mock.calls[0][0] as VoiceError).code).toBe('VOICE_CONTENT_FILTERED');
  });

  it('control: an ordinary completed response.done does not call onError', () => {
    const { result } = renderHook(() => useHandleServerEvent(mockDeps));
    result.current({ type: 'response.created', response: { id: 'resp_completed' } });
    result.current({
      type: 'response.done',
      response: { id: 'resp_completed', status: 'completed' },
    });

    expect(onError).not.toHaveBeenCalled();
    expect(mockDeps.hasActiveResponseRef.current).toBe(false);
  });

  it('control: an incomplete response for a non-filter reason does not call onError', () => {
    const { result } = renderHook(() => useHandleServerEvent(mockDeps));
    result.current({ type: 'response.created', response: { id: 'resp_max_tokens' } });
    result.current({
      type: 'response.done',
      response: {
        id: 'resp_max_tokens',
        status: 'incomplete',
        status_details: { reason: 'max_output_tokens' },
      },
    });

    expect(onError).not.toHaveBeenCalled();
  });

  it('control: a response.done with no response payload does not throw or call onError', () => {
    const { result } = renderHook(() => useHandleServerEvent(mockDeps));
    expect(() => result.current({ type: 'response.done' })).not.toThrow();
    expect(onError).not.toHaveBeenCalled();
  });
});

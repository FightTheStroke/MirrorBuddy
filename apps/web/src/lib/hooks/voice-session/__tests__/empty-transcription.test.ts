/**
 * A child who says nothing is not an error.
 *
 * Azure closes every listening turn with a `transcription.completed` event, even
 * when the microphone caught only silence or room noise — the transcript is then
 * an empty string. MirrorBuddy logged that as a warning, so a perfectly normal
 * pause in a conversation with a tutor raised an alarm: 108 of them since March,
 * zero users affected, drowning the real faults in the same feed.
 *
 * Silence is logged quietly. A genuinely malformed event — one where the
 * transcript field is missing or is not text — still warns, because that would
 * mean the protocol changed under us and speech is being lost.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useHandleServerEvent, type EventHandlerDeps } from '../event-handlers';
import { clientLogger } from '@/lib/logger/client';

vi.mock('@/lib/logger/client', () => ({
  clientLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const EVENT_TYPE = 'conversation.item.input_audio_transcription.completed';

function makeDeps(): EventHandlerDeps {
  return {
    hasActiveResponseRef: { current: false },
    sessionReadyRef: { current: false },
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
      onError: vi.fn(),
    },
  };
}

describe('A listening turn that produced no words', () => {
  let deps: EventHandlerDeps;

  beforeEach(() => {
    vi.clearAllMocks();
    deps = makeDeps();
  });

  function handle(event: Record<string, unknown>) {
    const { result } = renderHook(() => useHandleServerEvent(deps));
    result.current(event);
  }

  it('does not raise an alarm when the child simply said nothing', () => {
    handle({ type: EVENT_TYPE, transcript: '' });

    expect(clientLogger.warn).not.toHaveBeenCalled();
  });

  it('treats whitespace-only speech the same as silence', () => {
    handle({ type: EVENT_TYPE, transcript: '   ' });

    expect(clientLogger.warn).not.toHaveBeenCalled();
    expect(deps.addTranscript).not.toHaveBeenCalled();
  });

  it('records the silent turn at debug level, for anyone reconstructing a session', () => {
    handle({ type: EVENT_TYPE, transcript: '' });

    expect(clientLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining('no speech'),
      expect.anything(),
    );
  });

  it('shows nothing in the conversation when there were no words', () => {
    handle({ type: EVENT_TYPE, transcript: '' });

    expect(deps.addTranscript).not.toHaveBeenCalled();
    expect(deps.options.onTranscript).not.toHaveBeenCalled();
  });

  it('still warns when the transcript field is missing, because speech may be lost', () => {
    handle({ type: EVENT_TYPE });

    expect(clientLogger.warn).toHaveBeenCalled();
  });

  it('still warns when the transcript is not text at all', () => {
    handle({ type: EVENT_TYPE, transcript: { text: 'ciao' } });

    expect(clientLogger.warn).toHaveBeenCalled();
  });

  it('leaves a real transcript untouched', () => {
    handle({ type: EVENT_TYPE, transcript: 'ciao Omero' });

    expect(deps.addTranscript).toHaveBeenCalledWith('user', 'ciao Omero');
    expect(clientLogger.warn).not.toHaveBeenCalled();
  });
});

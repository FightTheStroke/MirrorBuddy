import { vi } from 'vitest';
import type { EventHandlerDeps } from '../event-handlers';

export const usage = {
  input_token_details: { text_tokens: 10, audio_tokens: 900 },
  output_token_details: { text_tokens: 5, audio_tokens: 1200 },
};
export const done = (id: string) => ({
  type: 'response.done',
  response: { id, model: 'gpt-realtime-mini', usage },
});
export const created = (id?: string) => ({ type: 'response.created', response: { id } });
export function makeDeps(): EventHandlerDeps {
  return {
    hasActiveResponseRef: { current: false },
    sessionReadyRef: { current: false },
    audioQueueRef: { current: { clear: vi.fn() } },
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
    unmuteAudioTracksRef: { current: null },
    addTranscript: vi.fn(),
    setListening: vi.fn(),
    setSpeaking: vi.fn(),
    setSafetyWarning: vi.fn(),
    isSpeaking: false,
    voiceBargeInEnabled: true,
    sendSessionConfig: vi.fn(),
    sendGreeting: vi.fn(),
    startAudioCapture: vi.fn().mockResolvedValue(undefined),
    maestroRef: { current: null },
    sessionIdRef: { current: 'sess-c6' },
    addToolCall: vi.fn(),
    updateToolCall: vi.fn(),
    options: { onTranscript: vi.fn(), onStateChange: vi.fn(), onError: vi.fn() },
  };
}

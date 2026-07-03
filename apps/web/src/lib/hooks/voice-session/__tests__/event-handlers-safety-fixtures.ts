/**
 * Shared fixtures for the safety-intervention wiring tests (T1.1, D-01).
 * Used by event-handlers-safety.test.ts and event-handlers-safety-audio.test.ts.
 *
 * NOTE: vi.mock() calls cannot live here (they are hoisted per test module);
 * each test file declares its own module mocks and uses these factories.
 */

import { vi } from 'vitest';
import type { EventHandlerDeps } from '../event-handlers';
import type { TranscriptSafetyResult, AssistantTranscriptSafetyResult } from '../transcript-safety';

export const allowUserResult: TranscriptSafetyResult = {
  severity: 'none',
  flaggedPatterns: [],
  actionTaken: 'allow',
  checkDurationMs: 1,
};

export const blockedUserResult: TranscriptSafetyResult = {
  severity: 'high',
  flaggedPatterns: ['explicit'],
  actionTaken: 'block',
  checkDurationMs: 4,
};

export const allowAssistantResult: AssistantTranscriptSafetyResult = {
  severity: 'none',
  flaggedPatterns: [],
  actionTaken: 'allow',
  checkDurationMs: 1,
};

export const rejectedAssistantResult: AssistantTranscriptSafetyResult = {
  severity: 'critical',
  flaggedPatterns: ['violence'],
  actionTaken: 'reject',
  checkDurationMs: 6,
};

export interface MockDataChannel {
  send: ReturnType<typeof vi.fn>;
  readyState: string;
}

export interface MockAudioElement {
  pause: ReturnType<typeof vi.fn>;
  play: ReturnType<typeof vi.fn>;
  paused: boolean;
}

export interface SafetyTestContext {
  deps: EventHandlerDeps;
  dataChannel: MockDataChannel;
  source: { stop: ReturnType<typeof vi.fn> };
  audioElement: MockAudioElement;
}

/** Build EventHandlerDeps mocks in the "active playback" state. */
export function createSafetyTestContext(): SafetyTestContext {
  const dataChannel: MockDataChannel = { send: vi.fn(), readyState: 'open' };
  const source = { stop: vi.fn() };
  const audioElement: MockAudioElement = {
    pause: vi.fn(),
    play: vi.fn().mockResolvedValue(undefined),
    paused: false,
  };

  const deps: EventHandlerDeps = {
    hasActiveResponseRef: { current: true },
    sessionReadyRef: { current: true },
    audioQueueRef: { current: { clear: vi.fn() } as never },
    isPlayingRef: { current: true },
    isBufferingRef: { current: false },
    scheduledSourcesRef: { current: new Set([source as unknown as AudioBufferSourceNode]) },
    playbackContextRef: { current: null },
    connectionTimeoutRef: { current: null },
    greetingTimeoutsRef: { current: [] },
    webrtcDataChannelRef: { current: dataChannel as unknown as RTCDataChannel },
    webrtcAudioElementRef: { current: audioElement as unknown as HTMLAudioElement },
    userSpeechEndTimeRef: { current: null },
    firstAudioPlaybackTimeRef: { current: null },
    voiceConnectStartTimeRef: { current: null },
    voiceDataChannelOpenTimeRef: { current: null },
    voiceSessionUpdatedTimeRef: { current: null },
    addTranscript: vi.fn(),
    setListening: vi.fn(),
    setSpeaking: vi.fn(),
    setSafetyWarning: vi.fn(),
    isSpeaking: true,
    voiceBargeInEnabled: true,
    sendSessionConfig: vi.fn(),
    sendGreeting: vi.fn(),
    unmuteAudioTracksRef: { current: null },
    startAudioCapture: vi.fn(),
    maestroRef: { current: { id: 'm1', name: 'Test Maestro' } } as never,
    sessionIdRef: { current: 'session-xyz' },
    addToolCall: vi.fn(),
    updateToolCall: vi.fn(),
    options: {
      onTranscript: vi.fn(),
      onStateChange: vi.fn(),
      onError: vi.fn(),
    },
  };

  return { deps, dataChannel, source, audioElement };
}

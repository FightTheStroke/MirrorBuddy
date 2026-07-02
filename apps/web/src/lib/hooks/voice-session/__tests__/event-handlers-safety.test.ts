/**
 * Tests for safety intervention wiring in the realtime event flow (T1.1, D-01).
 *
 * Verifies that transcript safety results are acted upon, not just logged:
 * 1. Flagged USER transcript -> triggerSafetyIntervention with correct args.
 * 2. Rejected ASSISTANT transcript -> playback teardown (barge-in pattern) +
 *    intervention, and the rejected content is NOT surfaced in the UI.
 * 3. 'allow' path -> unchanged behaviour (transcript added, no intervention).
 *
 * Child-safety critical: these assertions guard against a regression where a
 * flagged utterance would be spoken/shown despite the safety check firing.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useHandleServerEvent, type EventHandlerDeps } from '../event-handlers';
import type { TranscriptSafetyResult, AssistantTranscriptSafetyResult } from '../transcript-safety';

vi.mock('@/lib/logger/client', () => ({
  clientLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../transcript-safety', () => ({
  checkUserTranscript: vi.fn(),
  checkAssistantTranscript: vi.fn(),
}));

vi.mock('../safety-intervention', () => ({
  triggerSafetyIntervention: vi.fn(),
}));

const allowUserResult: TranscriptSafetyResult = {
  severity: 'none',
  flaggedPatterns: [],
  actionTaken: 'allow',
  checkDurationMs: 1,
};

const blockedUserResult: TranscriptSafetyResult = {
  severity: 'high',
  flaggedPatterns: ['explicit'],
  actionTaken: 'block',
  checkDurationMs: 4,
};

const allowAssistantResult: AssistantTranscriptSafetyResult = {
  severity: 'none',
  flaggedPatterns: [],
  actionTaken: 'allow',
  checkDurationMs: 1,
};

const rejectedAssistantResult: AssistantTranscriptSafetyResult = {
  severity: 'critical',
  flaggedPatterns: ['violence'],
  actionTaken: 'reject',
  checkDurationMs: 6,
};

describe('Event Handlers - safety intervention wiring', () => {
  let mockDeps: EventHandlerDeps;
  let mockDataChannel: { send: ReturnType<typeof vi.fn>; readyState: string };
  let mockSource: { stop: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.clearAllMocks();

    const { checkUserTranscript, checkAssistantTranscript } = await import('../transcript-safety');
    // Default to allow; individual tests override as needed.
    vi.mocked(checkUserTranscript).mockReturnValue(allowUserResult);
    vi.mocked(checkAssistantTranscript).mockReturnValue(allowAssistantResult);

    mockDataChannel = { send: vi.fn(), readyState: 'open' };
    mockSource = { stop: vi.fn() };

    mockDeps = {
      hasActiveResponseRef: { current: true },
      sessionReadyRef: { current: true },
      audioQueueRef: {
        current: {
          clear: vi.fn(),
        } as never,
      },
      isPlayingRef: { current: true },
      isBufferingRef: { current: false },
      scheduledSourcesRef: {
        current: new Set([mockSource as unknown as AudioBufferSourceNode]),
      },
      playbackContextRef: { current: null },
      connectionTimeoutRef: { current: null },
      greetingTimeoutsRef: { current: [] },
      webrtcDataChannelRef: {
        current: mockDataChannel as unknown as RTCDataChannel,
      },
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
  });

  describe('flagged USER transcript', () => {
    it('should trigger the safety intervention with the correct args', async () => {
      const { checkUserTranscript } = await import('../transcript-safety');
      vi.mocked(checkUserTranscript).mockReturnValue(blockedUserResult);
      const { triggerSafetyIntervention } = await import('../safety-intervention');

      const { result } = renderHook(() => useHandleServerEvent(mockDeps));
      result.current({
        type: 'conversation.item.input_audio_transcription.completed',
        transcript: 'flagged user input',
      });

      expect(triggerSafetyIntervention).toHaveBeenCalledTimes(1);
      expect(triggerSafetyIntervention).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'session-xyz',
          safetyResult: blockedUserResult,
          dataChannel: mockDataChannel,
          setWarningState: mockDeps.setSafetyWarning,
        }),
      );
    });

    it('should still surface the user own words in the transcript', async () => {
      const { checkUserTranscript } = await import('../transcript-safety');
      vi.mocked(checkUserTranscript).mockReturnValue(blockedUserResult);

      const { result } = renderHook(() => useHandleServerEvent(mockDeps));
      result.current({
        type: 'conversation.item.input_audio_transcription.completed',
        transcript: 'flagged user input',
      });

      expect(mockDeps.addTranscript).toHaveBeenCalledWith('user', 'flagged user input');
    });
  });

  describe('rejected ASSISTANT transcript', () => {
    it('should tear down playback and trigger the intervention without surfacing content', async () => {
      const { checkAssistantTranscript } = await import('../transcript-safety');
      vi.mocked(checkAssistantTranscript).mockReturnValue(rejectedAssistantResult);
      const { triggerSafetyIntervention } = await import('../safety-intervention');

      const { result } = renderHook(() => useHandleServerEvent(mockDeps));
      result.current({
        type: 'response.output_audio_transcript.done',
        transcript: 'unsafe assistant output',
      });

      // Playback teardown (barge-in pattern)
      expect(mockDataChannel.send).toHaveBeenCalledWith(JSON.stringify({ type: 'response.cancel' }));
      expect(mockDeps.hasActiveResponseRef.current).toBe(false);
      expect(
        (mockDeps.audioQueueRef.current as unknown as { clear: ReturnType<typeof vi.fn> }).clear,
      ).toHaveBeenCalled();
      expect(mockSource.stop).toHaveBeenCalled();
      expect(mockDeps.scheduledSourcesRef.current.size).toBe(0);
      expect(mockDeps.setSpeaking).toHaveBeenCalledWith(false);

      // Intervention fired with the assistant result mapped to 'escalate'
      expect(triggerSafetyIntervention).toHaveBeenCalledTimes(1);
      expect(triggerSafetyIntervention).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'session-xyz',
          dataChannel: mockDataChannel,
          setWarningState: mockDeps.setSafetyWarning,
          safetyResult: expect.objectContaining({
            actionTaken: 'escalate',
            flaggedPatterns: ['violence'],
            severity: 'critical',
          }),
        }),
      );

      // CRITICAL: rejected content must NOT reach the transcript UI.
      expect(mockDeps.addTranscript).not.toHaveBeenCalled();
      expect(mockDeps.options.onTranscript).not.toHaveBeenCalled();
    });

    it('should tear down local playback even when the data channel is closed', async () => {
      const { checkAssistantTranscript } = await import('../transcript-safety');
      vi.mocked(checkAssistantTranscript).mockReturnValue(rejectedAssistantResult);
      mockDataChannel.readyState = 'closed';

      const { result } = renderHook(() => useHandleServerEvent(mockDeps));
      result.current({
        type: 'response.output_audio_transcript.done',
        transcript: 'unsafe assistant output',
      });

      // No response.cancel over a closed channel, but local teardown still runs.
      expect(mockDataChannel.send).not.toHaveBeenCalled();
      expect(mockSource.stop).toHaveBeenCalled();
      expect(mockDeps.scheduledSourcesRef.current.size).toBe(0);
      expect(mockDeps.setSpeaking).toHaveBeenCalledWith(false);
      expect(mockDeps.addTranscript).not.toHaveBeenCalled();
    });
  });

  describe('allow path (unchanged behaviour)', () => {
    it('should add the assistant transcript and not intervene', async () => {
      const { triggerSafetyIntervention } = await import('../safety-intervention');

      const { result } = renderHook(() => useHandleServerEvent(mockDeps));
      result.current({
        type: 'response.output_audio_transcript.done',
        transcript: 'a safe helpful answer',
      });

      expect(mockDeps.addTranscript).toHaveBeenCalledWith('assistant', 'a safe helpful answer');
      expect(mockDeps.options.onTranscript).toHaveBeenCalledWith(
        'assistant',
        'a safe helpful answer',
      );
      expect(triggerSafetyIntervention).not.toHaveBeenCalled();
      expect(mockSource.stop).not.toHaveBeenCalled();
    });

    it('should add the user transcript and not intervene', async () => {
      const { triggerSafetyIntervention } = await import('../safety-intervention');

      const { result } = renderHook(() => useHandleServerEvent(mockDeps));
      result.current({
        type: 'conversation.item.input_audio_transcription.completed',
        transcript: 'can you help me with math?',
      });

      expect(mockDeps.addTranscript).toHaveBeenCalledWith('user', 'can you help me with math?');
      expect(triggerSafetyIntervention).not.toHaveBeenCalled();
    });
  });
});

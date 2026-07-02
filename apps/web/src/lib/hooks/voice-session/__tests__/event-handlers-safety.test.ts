/**
 * Tests for safety intervention wiring in the realtime event flow (T1.1, D-01).
 *
 * This file: flagged USER transcript -> triggerSafetyIntervention with the
 * correct args; 'allow' paths unchanged. Assistant-reject playback teardown
 * (incl. WebRTC audio element pause/resume) lives in
 * event-handlers-safety-audio.test.ts.
 *
 * Child-safety critical: these assertions guard against a regression where a
 * flagged utterance would be spoken/shown despite the safety check firing.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useHandleServerEvent } from '../event-handlers';
import {
  allowUserResult,
  allowAssistantResult,
  blockedUserResult,
  createSafetyTestContext,
  type SafetyTestContext,
} from './event-handlers-safety-fixtures';

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

describe('Event Handlers - safety intervention wiring', () => {
  let ctx: SafetyTestContext;

  beforeEach(async () => {
    vi.clearAllMocks();

    const { checkUserTranscript, checkAssistantTranscript } = await import('../transcript-safety');
    // Default to allow; individual tests override as needed.
    vi.mocked(checkUserTranscript).mockReturnValue(allowUserResult);
    vi.mocked(checkAssistantTranscript).mockReturnValue(allowAssistantResult);

    ctx = createSafetyTestContext();
  });

  describe('flagged USER transcript', () => {
    it('should trigger the safety intervention with the correct args', async () => {
      const { checkUserTranscript } = await import('../transcript-safety');
      vi.mocked(checkUserTranscript).mockReturnValue(blockedUserResult);
      const { triggerSafetyIntervention } = await import('../safety-intervention');

      const { result } = renderHook(() => useHandleServerEvent(ctx.deps));
      result.current({
        type: 'conversation.item.input_audio_transcription.completed',
        transcript: 'flagged user input',
      });

      expect(triggerSafetyIntervention).toHaveBeenCalledTimes(1);
      expect(triggerSafetyIntervention).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'session-xyz',
          safetyResult: blockedUserResult,
          dataChannel: ctx.dataChannel,
          setWarningState: ctx.deps.setSafetyWarning,
        }),
      );
    });

    it('should still surface the user own words in the transcript', async () => {
      const { checkUserTranscript } = await import('../transcript-safety');
      vi.mocked(checkUserTranscript).mockReturnValue(blockedUserResult);

      const { result } = renderHook(() => useHandleServerEvent(ctx.deps));
      result.current({
        type: 'conversation.item.input_audio_transcription.completed',
        transcript: 'flagged user input',
      });

      expect(ctx.deps.addTranscript).toHaveBeenCalledWith('user', 'flagged user input');
    });
  });

  describe('allow path (unchanged behaviour)', () => {
    it('should add the assistant transcript and not intervene', async () => {
      const { triggerSafetyIntervention } = await import('../safety-intervention');

      const { result } = renderHook(() => useHandleServerEvent(ctx.deps));
      result.current({
        type: 'response.output_audio_transcript.done',
        transcript: 'a safe helpful answer',
      });

      expect(ctx.deps.addTranscript).toHaveBeenCalledWith('assistant', 'a safe helpful answer');
      expect(ctx.deps.options.onTranscript).toHaveBeenCalledWith(
        'assistant',
        'a safe helpful answer',
      );
      expect(triggerSafetyIntervention).not.toHaveBeenCalled();
      expect(ctx.source.stop).not.toHaveBeenCalled();
      expect(ctx.audioElement.pause).not.toHaveBeenCalled();
    });

    it('should add the user transcript and not intervene', async () => {
      const { triggerSafetyIntervention } = await import('../safety-intervention');

      const { result } = renderHook(() => useHandleServerEvent(ctx.deps));
      result.current({
        type: 'conversation.item.input_audio_transcription.completed',
        transcript: 'can you help me with math?',
      });

      expect(ctx.deps.addTranscript).toHaveBeenCalledWith('user', 'can you help me with math?');
      expect(triggerSafetyIntervention).not.toHaveBeenCalled();
    });
  });
});

/**
 * Tests for the assistant-reject playback teardown in the realtime event flow
 * (T1.1, D-01 follow-up).
 *
 * In WebRTC transport the assistant audio plays via the REMOTE TRACK through
 * the audio element — not the local queue/scheduled sources. These tests
 * assert that a rejected assistant transcript:
 * 1. Tears down local playback (barge-in pattern) + pauses the WebRTC audio
 *    element, even when the data channel is closed (cancel undeliverable).
 * 2. Never surfaces the rejected content in the transcript UI.
 * 3. Is followed by a best-effort resume on the next response.created so the
 *    SAFE redirect injected by the intervention is audible.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useHandleServerEvent } from '../event-handlers';
import {
  allowUserResult,
  allowAssistantResult,
  rejectedAssistantResult,
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

describe('Event Handlers - rejected assistant transcript playback teardown', () => {
  let ctx: SafetyTestContext;

  beforeEach(async () => {
    vi.clearAllMocks();

    const { checkUserTranscript, checkAssistantTranscript } = await import('../transcript-safety');
    vi.mocked(checkUserTranscript).mockReturnValue(allowUserResult);
    vi.mocked(checkAssistantTranscript).mockReturnValue(rejectedAssistantResult);

    ctx = createSafetyTestContext();
  });

  it('should tear down playback and trigger the intervention without surfacing content', async () => {
    const { triggerSafetyIntervention } = await import('../safety-intervention');

    const { result } = renderHook(() => useHandleServerEvent(ctx.deps));
    result.current({
      type: 'response.output_audio_transcript.done',
      transcript: 'unsafe assistant output',
    });

    // Playback teardown (barge-in pattern)
    expect(ctx.dataChannel.send).toHaveBeenCalledWith(JSON.stringify({ type: 'response.cancel' }));
    expect(ctx.deps.hasActiveResponseRef.current).toBe(false);
    expect(
      (ctx.deps.audioQueueRef.current as unknown as { clear: ReturnType<typeof vi.fn> }).clear,
    ).toHaveBeenCalled();
    expect(ctx.source.stop).toHaveBeenCalled();
    expect(ctx.deps.scheduledSourcesRef.current.size).toBe(0);
    expect(ctx.deps.setSpeaking).toHaveBeenCalledWith(false);
    // WebRTC: the remote-track audio element must be paused too.
    expect(ctx.audioElement.pause).toHaveBeenCalled();

    // Intervention fired with the assistant result mapped to 'escalate'
    expect(triggerSafetyIntervention).toHaveBeenCalledTimes(1);
    expect(triggerSafetyIntervention).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'session-xyz',
        dataChannel: ctx.dataChannel,
        setWarningState: ctx.deps.setSafetyWarning,
        safetyResult: expect.objectContaining({
          actionTaken: 'escalate',
          flaggedPatterns: ['violence'],
          severity: 'critical',
        }),
      }),
    );

    // CRITICAL: rejected content must NOT reach the transcript UI.
    expect(ctx.deps.addTranscript).not.toHaveBeenCalled();
    expect(ctx.deps.options.onTranscript).not.toHaveBeenCalled();
  });

  it('should tear down local playback even when the data channel is closed', () => {
    ctx.dataChannel.readyState = 'closed';

    const { result } = renderHook(() => useHandleServerEvent(ctx.deps));
    result.current({
      type: 'response.output_audio_transcript.done',
      transcript: 'unsafe assistant output',
    });

    // No response.cancel over a closed channel, but local teardown still runs.
    expect(ctx.dataChannel.send).not.toHaveBeenCalled();
    expect(ctx.source.stop).toHaveBeenCalled();
    expect(ctx.deps.scheduledSourcesRef.current.size).toBe(0);
    expect(ctx.deps.setSpeaking).toHaveBeenCalledWith(false);
    // The unsafe tail keeps playing via the remote track unless the audio
    // element is paused — this must happen even with an undeliverable cancel.
    expect(ctx.audioElement.pause).toHaveBeenCalled();
    expect(ctx.deps.addTranscript).not.toHaveBeenCalled();
  });

  it('should not throw when the audio element ref is null', () => {
    ctx.deps.webrtcAudioElementRef.current = null;

    const { result } = renderHook(() => useHandleServerEvent(ctx.deps));

    expect(() =>
      result.current({
        type: 'response.output_audio_transcript.done',
        transcript: 'unsafe assistant output',
      }),
    ).not.toThrow();

    expect(ctx.deps.addTranscript).not.toHaveBeenCalled();
  });

  describe('resume on next response.created', () => {
    it('should resume a paused audio element so the safe redirect is audible', () => {
      const { result } = renderHook(() => useHandleServerEvent(ctx.deps));

      // Reject pauses the element...
      result.current({
        type: 'response.output_audio_transcript.done',
        transcript: 'unsafe assistant output',
      });
      expect(ctx.audioElement.pause).toHaveBeenCalled();
      ctx.audioElement.paused = true;

      // ...the next response (the safety redirect) resumes it.
      result.current({ type: 'response.created' });
      expect(ctx.audioElement.play).toHaveBeenCalledTimes(1);
      expect(ctx.deps.hasActiveResponseRef.current).toBe(true);
    });

    it('should not call play when the audio element is not paused', () => {
      const { result } = renderHook(() => useHandleServerEvent(ctx.deps));

      result.current({ type: 'response.created' });

      expect(ctx.audioElement.play).not.toHaveBeenCalled();
    });

    it('should swallow autoplay rejection from play()', async () => {
      ctx.audioElement.paused = true;
      ctx.audioElement.play.mockRejectedValueOnce(new Error('NotAllowedError'));

      const { result } = renderHook(() => useHandleServerEvent(ctx.deps));

      expect(() => result.current({ type: 'response.created' })).not.toThrow();
      // Let the rejected promise settle; the .catch handler must absorb it.
      await Promise.resolve();
      expect(ctx.audioElement.play).toHaveBeenCalledTimes(1);
    });

    it('should not resume when no reject occurred and element is playing (allow path)', async () => {
      const { checkAssistantTranscript } = await import('../transcript-safety');
      vi.mocked(checkAssistantTranscript).mockReturnValue(allowAssistantResult);

      const { result } = renderHook(() => useHandleServerEvent(ctx.deps));
      result.current({
        type: 'response.output_audio_transcript.done',
        transcript: 'a safe helpful answer',
      });

      expect(ctx.audioElement.pause).not.toHaveBeenCalled();
      expect(ctx.deps.addTranscript).toHaveBeenCalledWith('assistant', 'a safe helpful answer');
    });
  });
});

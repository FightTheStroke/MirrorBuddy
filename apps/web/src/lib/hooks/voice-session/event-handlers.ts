'use client';

import { useCallback, useRef } from 'react';
import { clientLogger as logger } from '@/lib/logger/client';
import {
  openingFinished,
  responseStarted as meditationResponseStarted,
} from '@/lib/meditation/browser';
import { createVoiceUsageTracker } from './voice-usage-tracker';
import { handleToolCall, type ToolHandlerParams } from './tool-handlers';
import { recordUserSpeechEnd } from './latency-utils';
import { handleErrorEvent } from './error-handler';
import { computeVoiceTimingDurations } from './voice-timing';
import type { SafetyWarningState } from './safety-intervention';
import type { AudioChunkQueue } from './audio-queue';
import { createTranscriptHandler } from './event-transcripts';

export interface EventHandlerDeps extends Omit<ToolHandlerParams, 'event'> {
  hasActiveResponseRef: React.MutableRefObject<boolean>;
  sessionReadyRef: React.MutableRefObject<boolean>;
  audioQueueRef: React.MutableRefObject<AudioChunkQueue>;
  isPlayingRef: React.MutableRefObject<boolean>;
  isBufferingRef: React.MutableRefObject<boolean>;
  scheduledSourcesRef: React.MutableRefObject<Set<AudioBufferSourceNode>>;
  playbackContextRef: React.MutableRefObject<AudioContext | null>;
  connectionTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
  greetingTimeoutsRef: React.MutableRefObject<NodeJS.Timeout[]>;
  webrtcDataChannelRef: React.MutableRefObject<RTCDataChannel | null>;
  /** Remote-track audio element (WebRTC transport) — paused on safety reject. */
  webrtcAudioElementRef: React.MutableRefObject<HTMLAudioElement | null>;
  userSpeechEndTimeRef: React.MutableRefObject<number | null>;
  firstAudioPlaybackTimeRef: React.MutableRefObject<number | null>;
  voiceConnectStartTimeRef: React.MutableRefObject<number | null>;
  voiceDataChannelOpenTimeRef: React.MutableRefObject<number | null>;
  voiceSessionUpdatedTimeRef: React.MutableRefObject<number | null>;
  addTranscript: (role: 'user' | 'assistant', text: string) => void;
  setListening: (value: boolean) => void;
  setSpeaking: (value: boolean) => void;
  /** Surface a safety-intervention warning in the UI (safe-response redirect). */
  setSafetyWarning: (state: SafetyWarningState) => void;
  isSpeaking: boolean;
  voiceBargeInEnabled: boolean;
  sendSessionConfig: () => void;
  sendGreeting: () => void;
  unmuteAudioTracksRef: React.MutableRefObject<(() => void) | null>;
  startAudioCapture: () => Promise<void>;
}

// A closed data channel cannot deliver response.cancel; stop in-flight audio locally.
function pauseVoiceAudio(deps: EventHandlerDeps): void {
  deps.webrtcAudioElementRef.current?.pause();
  deps.audioQueueRef.current.clear();
  deps.isPlayingRef.current = false;
  deps.isBufferingRef.current = true;
  deps.scheduledSourcesRef.current.forEach((source) => {
    try {
      source.stop();
    } catch {
      /* already stopped */
    }
  });
  deps.scheduledSourcesRef.current.clear();
  deps.setSpeaking(false);
}

export function useHandleServerEvent(deps: EventHandlerDeps) {
  const usageTracker = useRef(createVoiceUsageTracker());
  const transcripts = useRef(createTranscriptHandler());
  return useCallback(
    (event: Record<string, unknown> | null | undefined) => {
      if (!event || typeof event !== 'object') {
        logger.warn('[VoiceSession] Invalid server event');
        return;
      }
      if (transcripts.current(event, deps, () => pauseVoiceAudio(deps))) return;
      if (
        !usageTracker.current.accept(event, {
          sessionId: deps.sessionIdRef.current,
          maestroId: deps.maestroRef.current?.id,
        })
      )
        return;
      const eventType = event.type as string;
      logger.debug(`[VoiceSession] >>> handleServerEvent called with type: ${eventType}`);

      switch (eventType) {
        case 'session.created':
          logger.debug('[VoiceSession] Session created');
          break;

        case 'session.updated':
          logger.debug('[VoiceSession] Session configured, ready for conversation');
          logger.debug('[VoiceSession] Full session.updated event', {
            eventPreview: JSON.stringify(event).slice(0, 500),
          });

          // eslint-disable-next-line react-hooks/immutability -- refs are mutable by design
          deps.sessionReadyRef.current = true;
          deps.voiceSessionUpdatedTimeRef.current = performance.now();
          const timing = computeVoiceTimingDurations({
            connectStartMs: deps.voiceConnectStartTimeRef.current,
            dataChannelOpenMs: deps.voiceDataChannelOpenTimeRef.current,
            sessionUpdatedMs: deps.voiceSessionUpdatedTimeRef.current,
          });
          logger.info('[VoiceSession] Connection timing', {
            sessionId: deps.sessionIdRef.current,
            maestroId: deps.maestroRef.current?.id,
            connectToDataChannelOpenMs: timing.connectToDataChannelOpenMs,
            connectToSessionUpdatedMs: timing.connectToSessionUpdatedMs,
            dataChannelOpenToSessionUpdatedMs: timing.dataChannelOpenToSessionUpdatedMs,
          });
          // Unmute mic tracks now that character identity is confirmed.
          // This prevents Azure's default persona from responding to ambient
          // audio received before session.update was processed.
          deps.unmuteAudioTracksRef.current?.();

          logger.debug('[VoiceSession] Starting audio capture...');
          // Fire and forget - AudioContext resume is best-effort
          void deps.startAudioCapture();

          // Schedule multiple greeting attempts with increasing delays
          // sendGreeting() has internal guard (greetingSentRef) - only first success sends
          // Store timeout IDs for cleanup on unmount
          logger.debug('[VoiceSession] Scheduling greeting attempts...');
          deps.greetingTimeoutsRef.current = [300, 600, 1000, 1500, 2000].map((delay, i) => {
            return setTimeout(() => {
              logger.debug(`[VoiceSession] Greeting attempt ${i + 1}/5`);
              deps.sendGreeting();
            }, delay);
          });
          break;

        case 'response.created':
          // Azure has started generating a response - track this for proper cancellation
          deps.hasActiveResponseRef.current = true;
          // An armed meditation waits for a turn that actually starts: the turn
          // that requested it closes before the maestro has said a word.
          meditationResponseStarted();
          logger.debug('[VoiceSession] Response created - hasActiveResponse = true');
          // If a safety reject paused the WebRTC audio element (pause kills the
          // unsafe tail even when response.cancel can't be delivered), resume it
          // now so the NEXT response — e.g. the safe redirect injected by the
          // intervention — is audible. Best-effort: autoplay policy may reject.
          if (deps.webrtcAudioElementRef.current?.paused) {
            deps.webrtcAudioElementRef.current.play().catch(() => {
              logger.debug('[VoiceSession] Audio element resume blocked (autoplay policy)');
            });
          }
          break;

        case 'input_audio_buffer.speech_started':
          logger.debug('[VoiceSession] User speech detected');
          deps.setListening(true);

          // AUTO-INTERRUPT: If maestro is speaking, stop them (barge-in)
          if (deps.options.disableBargeIn) {
            logger.debug('[VoiceSession] Barge-in disabled (onboarding mode) - ignoring speech');
          } else if (deps.voiceBargeInEnabled && deps.hasActiveResponseRef.current) {
            if (deps.webrtcDataChannelRef.current?.readyState === 'open') {
              logger.debug('[VoiceSession] Barge-in detected - interrupting assistant via WebRTC');
              deps.webrtcDataChannelRef.current.send(JSON.stringify({ type: 'response.cancel' }));
              deps.hasActiveResponseRef.current = false;
              deps.audioQueueRef.current.clear();
              deps.isPlayingRef.current = false;
              deps.isBufferingRef.current = true;
              deps.scheduledSourcesRef.current.forEach((source) => {
                try {
                  source.stop();
                } catch {
                  /* already stopped */
                }
              });
              deps.scheduledSourcesRef.current.clear();
              deps.setSpeaking(false);
            }
          } else if (deps.voiceBargeInEnabled && deps.isSpeaking) {
            logger.debug('[VoiceSession] Clearing local audio queue (response already done)');
            deps.audioQueueRef.current.clear();
            deps.isPlayingRef.current = false;
            deps.isBufferingRef.current = true;
            deps.scheduledSourcesRef.current.forEach((source) => {
              try {
                source.stop();
              } catch {
                /* already stopped */
              }
            });
            deps.scheduledSourcesRef.current.clear();
            deps.setSpeaking(false);
          }
          break;

        case 'input_audio_buffer.speech_stopped':
          logger.debug('[VoiceSession] User speech ended');
          recordUserSpeechEnd({
            userSpeechEndTimeRef: deps.userSpeechEndTimeRef,
            firstAudioPlaybackTimeRef: deps.firstAudioPlaybackTimeRef,
          });
          deps.setListening(false);
          break;

        // AUDIO OUTPUT EVENTS - WebRTC receives audio via ontrack event, not delta events
        case 'response.output_audio.delta':
        case 'response.audio.delta':
          // WebRTC: audio comes via ontrack event, skip delta processing
          logger.debug('[VoiceSession] Skipping audio.delta processing (WebRTC transport)');
          break;

        case 'response.output_audio.done':
        case 'response.audio.done':
          logger.debug('[VoiceSession] Audio response complete');
          break;

        // TRANSCRIPT EVENTS
        case 'response.output_audio_transcript.delta':
        case 'response.audio_transcript.delta':
          // Streaming transcript - could show in UI
          break;

        case 'response.done':
          // If a meditation is waiting for its introduction to end, this is it.
          openingFinished();
          deps.hasActiveResponseRef.current = false;
          logger.debug('[VoiceSession] Response complete - hasActiveResponse = false');
          break;

        case 'response.cancelled':
          deps.hasActiveResponseRef.current = false;
          logger.debug('[VoiceSession] Response cancelled by client - hasActiveResponse = false');
          break;

        case 'error':
          handleErrorEvent(event as { error?: unknown }, deps.options);
          break;

        case 'response.function_call_arguments.done':
          handleToolCall({ event, ...deps });
          break;

        default:
          logger.debug(`[VoiceSession] Event: ${eventType}`, {
            eventPreview: JSON.stringify(event).slice(0, 200),
          });
          break;
      }
    },
    [deps],
  );
}

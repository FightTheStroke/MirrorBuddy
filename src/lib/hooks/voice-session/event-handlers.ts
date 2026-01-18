// ============================================================================
// EVENT HANDLERS
// Core Azure Realtime API event handling (WebRTC only)
// ============================================================================

"use client";

import { useCallback } from "react";
import { logger } from "@/lib/logger";
import { handleToolCall, type ToolHandlerParams } from "./tool-handlers";
import { recordUserSpeechEnd } from "./latency-utils";
import { handleErrorEvent } from "./error-handler";

import type { RingBuffer } from "./ring-buffer";

export interface EventHandlerDeps extends Omit<ToolHandlerParams, "event"> {
  hasActiveResponseRef: React.MutableRefObject<boolean>;
  sessionReadyRef: React.MutableRefObject<boolean>;
  audioQueueRef: React.MutableRefObject<RingBuffer<Int16Array>>;
  isPlayingRef: React.MutableRefObject<boolean>;
  isBufferingRef: React.MutableRefObject<boolean>;
  scheduledSourcesRef: React.MutableRefObject<Set<AudioBufferSourceNode>>;
  playbackContextRef: React.MutableRefObject<AudioContext | null>;
  connectionTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
  greetingTimeoutsRef: React.MutableRefObject<NodeJS.Timeout[]>;
  webrtcDataChannelRef: React.MutableRefObject<RTCDataChannel | null>;
  userSpeechEndTimeRef: React.MutableRefObject<number | null>;
  firstAudioPlaybackTimeRef: React.MutableRefObject<number | null>;
  addTranscript: (role: "user" | "assistant", text: string) => void;
  setListening: (value: boolean) => void;
  setSpeaking: (value: boolean) => void;
  isSpeaking: boolean;
  voiceBargeInEnabled: boolean;
  sendSessionConfig: () => void;
  sendGreeting: () => void;
  initPlaybackContext: () => Promise<
    | {
        context: AudioContext;
        analyser: AnalyserNode | null;
        gainNode: GainNode | null;
      }
    | undefined
  >;
  startAudioCapture: () => void;
  playNextChunk: () => void;
  scheduleQueuedChunks: () => void;
}

/**
 * Main server event handler for Azure Realtime API events (WebRTC)
 */
export function useHandleServerEvent(deps: EventHandlerDeps) {
  return useCallback(
    (event: Record<string, unknown>) => {
      const eventType = event.type as string;
      logger.debug(
        `[VoiceSession] >>> handleServerEvent called with type: ${eventType}`,
      );

      switch (eventType) {
        case "session.created":
          logger.debug("[VoiceSession] Session created");
          break;

        case "session.updated":
          logger.debug(
            "[VoiceSession] Session configured, ready for conversation",
          );
          logger.debug("[VoiceSession] Full session.updated event", {
            eventPreview: JSON.stringify(event).slice(0, 500),
          });

          // eslint-disable-next-line react-hooks/immutability -- refs are mutable by design
          deps.sessionReadyRef.current = true;
          logger.debug("[VoiceSession] Starting audio capture...");
          deps.startAudioCapture();

          // Schedule multiple greeting attempts with increasing delays
          // sendGreeting() has internal guard (greetingSentRef) - only first success sends
          // Store timeout IDs for cleanup on unmount
          logger.debug("[VoiceSession] Scheduling greeting attempts...");
          deps.greetingTimeoutsRef.current = [300, 600, 1000, 1500, 2000].map(
            (delay, i) => {
              return setTimeout(() => {
                logger.debug(`[VoiceSession] Greeting attempt ${i + 1}/5`);
                deps.sendGreeting();
              }, delay);
            },
          );
          break;

        case "response.created":
          // Azure has started generating a response - track this for proper cancellation
          deps.hasActiveResponseRef.current = true;
          logger.debug(
            "[VoiceSession] Response created - hasActiveResponse = true",
          );
          break;

        case "input_audio_buffer.speech_started":
          logger.debug("[VoiceSession] User speech detected");
          deps.setListening(true);

          // AUTO-INTERRUPT: If maestro is speaking, stop them (barge-in)
          if (deps.options.disableBargeIn) {
            logger.debug(
              "[VoiceSession] Barge-in disabled (onboarding mode) - ignoring speech",
            );
          } else if (
            deps.voiceBargeInEnabled &&
            deps.hasActiveResponseRef.current
          ) {
            if (deps.webrtcDataChannelRef.current?.readyState === "open") {
              logger.debug(
                "[VoiceSession] Barge-in detected - interrupting assistant via WebRTC",
              );
              deps.webrtcDataChannelRef.current.send(
                JSON.stringify({ type: "response.cancel" }),
              );
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
            logger.debug(
              "[VoiceSession] Clearing local audio queue (response already done)",
            );
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

        case "input_audio_buffer.speech_stopped":
          logger.debug("[VoiceSession] User speech ended");
          recordUserSpeechEnd({
            userSpeechEndTimeRef: deps.userSpeechEndTimeRef,
            firstAudioPlaybackTimeRef: deps.firstAudioPlaybackTimeRef,
          });
          deps.setListening(false);
          break;

        case "conversation.item.input_audio_transcription.completed":
          if (event.transcript && typeof event.transcript === "string") {
            logger.info("[VoiceSession] User transcript received", {
              transcript: event.transcript.substring(0, 100),
            });
            deps.addTranscript("user", event.transcript);
            deps.options.onTranscript?.("user", event.transcript);
          } else {
            logger.warn(
              "[VoiceSession] User transcription completed but no transcript",
              { event: JSON.stringify(event).slice(0, 200) },
            );
          }
          break;

        // AUDIO OUTPUT EVENTS - WebRTC receives audio via ontrack event, not delta events
        case "response.output_audio.delta":
        case "response.audio.delta":
          // WebRTC: audio comes via ontrack event, skip delta processing
          logger.debug(
            "[VoiceSession] Skipping audio.delta processing (WebRTC transport)",
          );
          break;

        case "response.output_audio.done":
        case "response.audio.done":
          logger.debug("[VoiceSession] Audio response complete");
          break;

        // TRANSCRIPT EVENTS
        case "response.output_audio_transcript.delta":
        case "response.audio_transcript.delta":
          // Streaming transcript - could show in UI
          break;

        case "response.output_audio_transcript.done":
        case "response.audio_transcript.done":
          if (event.transcript && typeof event.transcript === "string") {
            logger.info("[VoiceSession] AI transcript received", {
              transcript: event.transcript.substring(0, 100),
            });
            deps.addTranscript("assistant", event.transcript);
            deps.options.onTranscript?.("assistant", event.transcript);
          } else {
            logger.warn("[VoiceSession] AI transcript.done but no transcript", {
              event: JSON.stringify(event).slice(0, 200),
            });
          }
          break;

        case "response.done":
          deps.hasActiveResponseRef.current = false;
          logger.debug(
            "[VoiceSession] Response complete - hasActiveResponse = false",
          );
          break;

        case "response.cancelled":
          deps.hasActiveResponseRef.current = false;
          logger.debug(
            "[VoiceSession] Response cancelled by client - hasActiveResponse = false",
          );
          break;

        case "error":
          handleErrorEvent(event as { error?: unknown }, deps.options);
          break;

        case "response.function_call_arguments.done":
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

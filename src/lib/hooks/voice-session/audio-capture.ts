// ============================================================================
// AUDIO CAPTURE
// Microphone capture and input level monitoring (WebRTC only)
// Note: Uses standard getUserMedia API, compatible with media-bridge abstraction
// For microphone permission checks, see @/lib/native/media-bridge
// ============================================================================

"use client";

import { useCallback } from "react";
import { logger } from "@/lib/logger";
import { logAudioContextState } from "./voice-error-logger";

export interface AudioCaptureRefs {
  captureContextRef: React.MutableRefObject<AudioContext | null>;
  mediaStreamRef: React.MutableRefObject<MediaStream | null>;
  sourceNodeRef: React.MutableRefObject<MediaStreamAudioSourceNode | null>;
  analyserRef: React.MutableRefObject<AnalyserNode | null>;
  animationFrameRef: React.MutableRefObject<number | null>;
  lastLevelUpdateRef: React.MutableRefObject<number>;
  /** Reusable typed array for frequency data - avoids allocation per frame */
  frequencyDataRef: React.MutableRefObject<Uint8Array<ArrayBuffer> | null>;
}

/**
 * Start capturing audio from microphone
 * WebRTC mode: audio sent via media track (no ScriptProcessor, no resampling)
 * Analyser used only for input level visualization
 */
export function useStartAudioCapture(
  refs: AudioCaptureRefs,
  setInputLevel: (value: number) => void,
) {
  return useCallback(async () => {
    if (!refs.mediaStreamRef.current) {
      logger.warn("[VoiceSession] Cannot start capture: missing media stream");
      return;
    }

    // Priority 1 Fix: AudioContext User Gesture Compliance (iOS Safari)
    // Create AudioContext lazily in user gesture handler (not on page load)
    // Ref: docs/voice-mobile-investigation-report.md - Priority 1, Item 1
    if (!refs.captureContextRef.current) {
      try {
        // eslint-disable-next-line react-hooks/immutability -- Lazy initialization
        refs.captureContextRef.current = new AudioContext();
        const context = refs.captureContextRef.current;
        logAudioContextState(context.state, {
          sampleRate: context.sampleRate,
          baseLatency: context.baseLatency,
        });
        logger.debug(
          "[VoiceSession] Created AudioContext for input level monitoring",
          { state: context.state },
        );

        // Resume immediately after creation (iOS Safari requirement)
        if (context.state === "suspended") {
          try {
            await context.resume();
            logger.debug("[VoiceSession] AudioContext resumed after creation");
          } catch (err) {
            logger.warn("[VoiceSession] Failed to resume AudioContext", {
              err,
            });
          }
        }
      } catch (error) {
        logger.error(
          "[VoiceSession] Failed to create AudioContext",
          { error: String(error) },
          error,
        );
        return;
      }
    }

    const context = refs.captureContextRef.current;
    const source = context.createMediaStreamSource(refs.mediaStreamRef.current);

    refs.sourceNodeRef.current = source;

    // WebRTC: Skip audio processing, codec handled by RTCPeerConnection
    logger.debug(
      "[VoiceSession] WebRTC mode: skipping ScriptProcessor (codec handled by RTCPeerConnection)",
    );

    // Create analyser for input levels only (no audio processing)
    refs.analyserRef.current = context.createAnalyser();
    refs.analyserRef.current.fftSize = 256;
    source.connect(refs.analyserRef.current);

    // Start input level monitoring
    const updateInputLevel = () => {
      if (!refs.analyserRef.current) {
        refs.animationFrameRef.current = null;
        return;
      }

      const now = performance.now();
      if (now - refs.lastLevelUpdateRef.current > 30) {
        refs.lastLevelUpdateRef.current = now;

        const binCount = refs.analyserRef.current.frequencyBinCount;
        if (
          !refs.frequencyDataRef.current ||
          refs.frequencyDataRef.current.length !== binCount
        ) {
          refs.frequencyDataRef.current = new Uint8Array(binCount);
        }
        refs.analyserRef.current.getByteFrequencyData(
          refs.frequencyDataRef.current,
        );

        let sum = 0;
        for (let i = 0; i < binCount; i++) {
          sum += refs.frequencyDataRef.current[i];
        }
        const average = sum / binCount;
        setInputLevel(Math.min(1, (average / 255) * 2));
      }

      refs.animationFrameRef.current = requestAnimationFrame(updateInputLevel);
    };

    refs.animationFrameRef.current = requestAnimationFrame(updateInputLevel);

    logger.debug(
      "[VoiceSession] Audio capture started (WebRTC, input level monitoring only)",
    );
  }, [refs, setInputLevel]);
}

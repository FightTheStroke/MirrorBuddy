// ============================================================================
// AUDIO CAPTURE
// Microphone capture and input level monitoring (WebRTC only)
// ============================================================================

"use client";

import { useCallback } from "react";
import { logger } from "@/lib/logger";

export interface AudioCaptureRefs {
  captureContextRef: React.MutableRefObject<AudioContext | null>;
  mediaStreamRef: React.MutableRefObject<MediaStream | null>;
  sourceNodeRef: React.MutableRefObject<MediaStreamAudioSourceNode | null>;
  analyserRef: React.MutableRefObject<AnalyserNode | null>;
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
  return useCallback(() => {
    if (!refs.captureContextRef.current || !refs.mediaStreamRef.current) {
      logger.warn(
        "[VoiceSession] Cannot start capture: missing context or stream",
      );
      return;
    }

    const context = refs.captureContextRef.current;
    const source = context.createMediaStreamSource(refs.mediaStreamRef.current);
    // eslint-disable-next-line react-hooks/immutability -- Intentional ref mutation
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
      if (!refs.analyserRef.current) return;

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

      requestAnimationFrame(updateInputLevel);
    };

    requestAnimationFrame(updateInputLevel);

    logger.debug(
      "[VoiceSession] Audio capture started (WebRTC, input level monitoring only)",
    );
  }, [refs, setInputLevel]);
}

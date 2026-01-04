// ============================================================================
// AUDIO CAPTURE
// Microphone capture, resampling, and input level monitoring
// ============================================================================

'use client';

import { useCallback } from 'react';
import { logger } from '@/lib/logger';
import { resample, float32ToInt16, int16ArrayToBase64 } from './audio-utils';
import { AZURE_SAMPLE_RATE, CAPTURE_BUFFER_SIZE } from './constants';

export interface AudioCaptureRefs {
  captureContextRef: React.MutableRefObject<AudioContext | null>;
  mediaStreamRef: React.MutableRefObject<MediaStream | null>;
  sourceNodeRef: React.MutableRefObject<MediaStreamAudioSourceNode | null>;
  processorRef: React.MutableRefObject<ScriptProcessorNode | null>;
  analyserRef: React.MutableRefObject<AnalyserNode | null>;
  lastLevelUpdateRef: React.MutableRefObject<number>;
}

/**
 * Start capturing audio from microphone and streaming to WebSocket
 */
export function useStartAudioCapture(
  refs: AudioCaptureRefs,
  wsRef: React.MutableRefObject<WebSocket | null>,
  hasActiveResponseRef: React.MutableRefObject<boolean>,
  isMuted: boolean,
  setInputLevel: (value: number) => void
) {
  return useCallback(() => {
    if (!refs.captureContextRef.current || !refs.mediaStreamRef.current) {
      logger.warn('[VoiceSession] Cannot start capture: missing context or stream');
      return;
    }

    const context = refs.captureContextRef.current;
    const nativeSampleRate = context.sampleRate;
    logger.debug(`[VoiceSession] Starting audio capture at ${nativeSampleRate}Hz, resampling to ${AZURE_SAMPLE_RATE}Hz`);

    const source = context.createMediaStreamSource(refs.mediaStreamRef.current);
    // eslint-disable-next-line react-hooks/immutability -- Intentional ref mutation
    refs.sourceNodeRef.current = source;

    // Create analyser for input levels
    refs.analyserRef.current = context.createAnalyser();
    refs.analyserRef.current.fftSize = 256;
    source.connect(refs.analyserRef.current);

    // Create processor for audio capture
    const processor = context.createScriptProcessor(CAPTURE_BUFFER_SIZE, 1, 1);
    refs.processorRef.current = processor;

    processor.onaudioprocess = (event) => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) return;
      if (isMuted) return;

      const inputData = event.inputBuffer.getChannelData(0);

      // Resample from native rate to 24kHz
      const resampledData = resample(inputData, nativeSampleRate, AZURE_SAMPLE_RATE);

      // Convert to PCM16 and base64
      const int16Data = float32ToInt16(resampledData);
      const base64 = int16ArrayToBase64(int16Data);

      // CRITICAL FIX: Don't send audio while maestro is speaking (prevents echo loop)
      // Only send audio when there's no active response from Azure
      if (!hasActiveResponseRef.current) {
        wsRef.current.send(JSON.stringify({
          type: 'input_audio_buffer.append',
          audio: base64,
        }));
      }
      // If maestro is speaking, silently drop the audio to prevent echo feedback

      // Update input level (throttled)
      const now = performance.now();
      if (now - refs.lastLevelUpdateRef.current > 50 && refs.analyserRef.current) {
        refs.lastLevelUpdateRef.current = now;
        const dataArray = new Uint8Array(refs.analyserRef.current.frequencyBinCount);
        refs.analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setInputLevel(average / 255);
      }
    };

    source.connect(processor);
    processor.connect(context.destination);
    logger.debug('[VoiceSession] Audio capture started');
  }, [refs, wsRef, hasActiveResponseRef, isMuted, setInputLevel]);
}

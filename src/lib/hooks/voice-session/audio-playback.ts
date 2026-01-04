// ============================================================================
// AUDIO PLAYBACK
// Audio playback context, scheduling, and queue management
// ============================================================================

'use client';

import { useCallback } from 'react';
import { logger } from '@/lib/logger';
import { int16ToFloat32 } from './audio-utils';
import {
  AZURE_SAMPLE_RATE,
  MIN_BUFFER_CHUNKS,
  SCHEDULE_AHEAD_TIME,
  CHUNK_GAP_TOLERANCE,
} from './constants';

export interface AudioPlaybackRefs {
  playbackContextRef: React.MutableRefObject<AudioContext | null>;
  audioQueueRef: React.MutableRefObject<Int16Array[]>;
  isPlayingRef: React.MutableRefObject<boolean>;
  isBufferingRef: React.MutableRefObject<boolean>;
  nextPlayTimeRef: React.MutableRefObject<number>;
  scheduledSourcesRef: React.MutableRefObject<AudioBufferSourceNode[]>;
  playNextChunkRef: React.MutableRefObject<(() => void) | null>;
}

/**
 * Initialize or resume the playback AudioContext at Azure's sample rate (24kHz)
 */
export function useInitPlaybackContext(
  playbackContextRef: React.MutableRefObject<AudioContext | null>,
  preferredOutputId?: string
) {
  return useCallback(async () => {
    if (playbackContextRef.current) {
      // Resume if suspended (browser policy requires user interaction)
      if (playbackContextRef.current.state === 'suspended') {
        logger.debug('[VoiceSession] 🔊 Resuming suspended AudioContext...');
        await playbackContextRef.current.resume();
      }
      return playbackContextRef.current;
    }

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    // CRITICAL: Create playback context at 24kHz to match Azure output
    playbackContextRef.current = new AudioContextClass({ sampleRate: AZURE_SAMPLE_RATE });
    logger.debug(`[VoiceSession] 🔊 Playback context created at ${AZURE_SAMPLE_RATE}Hz, state: ${playbackContextRef.current.state}`);

    // Set output device if specified (setSinkId API)
    if (preferredOutputId && 'setSinkId' in playbackContextRef.current) {
      try {
        await (playbackContextRef.current as AudioContext & { setSinkId: (id: string) => Promise<void> }).setSinkId(preferredOutputId);
        logger.debug(`[VoiceSession] 🔊 Audio output set to device: ${preferredOutputId}`);
      } catch (err) {
        logger.warn('[VoiceSession] ⚠️ Could not set output device, using default', { err });
      }
    }

    // Resume immediately if suspended
    if (playbackContextRef.current.state === 'suspended') {
      logger.debug('[VoiceSession] 🔊 Resuming new AudioContext...');
      await playbackContextRef.current.resume();
    }

    return playbackContextRef.current;
  }, [playbackContextRef, preferredOutputId]);
}

/**
 * Schedule all queued audio chunks for time-based playback
 * Uses AudioContext.currentTime for precise scheduling to prevent stuttering
 */
export function useScheduleQueuedChunks(refs: AudioPlaybackRefs, setSpeaking: (value: boolean) => void, setOutputLevel: (value: number) => void) {
  return useCallback(() => {
    const ctx = refs.playbackContextRef.current;
    if (!ctx || refs.audioQueueRef.current.length === 0) return;

    const currentTime = ctx.currentTime;

    // Schedule chunks from queue
    while (refs.audioQueueRef.current.length > 0) {
      const audioData = refs.audioQueueRef.current.shift()!;
      const float32Data = int16ToFloat32(audioData);

      // Create buffer at 24kHz
      const buffer = ctx.createBuffer(1, float32Data.length, AZURE_SAMPLE_RATE);
      buffer.getChannelData(0).set(float32Data);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);

      // Calculate chunk duration
      const chunkDuration = float32Data.length / AZURE_SAMPLE_RATE;

      // Determine when to play this chunk
      // If we're behind schedule, catch up; otherwise schedule ahead
      if (refs.nextPlayTimeRef.current < currentTime + CHUNK_GAP_TOLERANCE) {
        // eslint-disable-next-line react-hooks/immutability -- Intentional ref mutation
        refs.nextPlayTimeRef.current = currentTime + SCHEDULE_AHEAD_TIME;
      }

      try {
        source.start(refs.nextPlayTimeRef.current);
        refs.scheduledSourcesRef.current.push(source);

        // Clean up finished sources to prevent memory leak
        source.onended = () => {
          const idx = refs.scheduledSourcesRef.current.indexOf(source);
          if (idx > -1) refs.scheduledSourcesRef.current.splice(idx, 1);

          // Check if all playback is done
          if (refs.scheduledSourcesRef.current.length === 0 && refs.audioQueueRef.current.length === 0) {
            refs.isPlayingRef.current = false;
            refs.isBufferingRef.current = true; // Reset to buffering for next response
            setSpeaking(false);
            setOutputLevel(0);
          }
        };

        // Update next play time
        refs.nextPlayTimeRef.current += chunkDuration;

      } catch (e) {
        logger.error('[VoiceSession] Playback scheduling error', { error: e });
      }

      // Calculate and update output level (RMS)
      let sumSquares = 0;
      for (let i = 0; i < float32Data.length; i++) {
        sumSquares += float32Data[i] * float32Data[i];
      }
      const rms = Math.sqrt(sumSquares / float32Data.length);
      setOutputLevel(Math.min(rms * 5, 1));
    }
  }, [refs, setSpeaking, setOutputLevel]);
}

/**
 * Play next audio chunk from queue (triggers scheduled playback)
 */
export function usePlayNextChunk(
  refs: AudioPlaybackRefs,
  scheduleQueuedChunks: () => void,
  setSpeaking: (value: boolean) => void,
  setOutputLevel: (value: number) => void
) {
  return useCallback(() => {
    const ctx = refs.playbackContextRef.current;

    if (!ctx || refs.audioQueueRef.current.length === 0) {
      // Check if there are still scheduled sources playing
      if (refs.scheduledSourcesRef.current.length === 0) {
        // eslint-disable-next-line react-hooks/immutability -- Intentional ref mutation
        refs.isPlayingRef.current = false;
        setSpeaking(false);
        setOutputLevel(0);
      }
      return;
    }

    // If we're in buffering mode, wait for enough chunks
    if (refs.isBufferingRef.current && refs.audioQueueRef.current.length < MIN_BUFFER_CHUNKS) {
      logger.debug(`[VoiceSession] Buffering... ${refs.audioQueueRef.current.length}/${MIN_BUFFER_CHUNKS} chunks`);
      return;
    }

    // Exit buffering mode and start scheduled playback
    if (refs.isBufferingRef.current) {
      refs.isBufferingRef.current = false;
      refs.nextPlayTimeRef.current = ctx.currentTime + SCHEDULE_AHEAD_TIME;
      logger.debug(`[VoiceSession] Buffer ready, starting scheduled playback at ${refs.nextPlayTimeRef.current.toFixed(3)}`);
    }

    refs.isPlayingRef.current = true;
    setSpeaking(true);

    // Schedule all queued chunks
    scheduleQueuedChunks();
  }, [refs, scheduleQueuedChunks, setSpeaking, setOutputLevel]);
}

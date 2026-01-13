// ============================================================================
// AUDIO PLAYBACK
// Audio playback context, scheduling, and queue management
// ============================================================================

'use client';

import { useCallback, useRef, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { int16ToFloat32 } from './audio-utils';
import {
  AZURE_SAMPLE_RATE,
  MIN_BUFFER_CHUNKS,
  SCHEDULE_AHEAD_TIME,
  CHUNK_GAP_TOLERANCE,
} from './constants';
import type { AudioPlaybackRefs, PollingControls } from './audio-playback-types';
import {
  resumeAudioContext,
  setAudioOutputDevice,
  createPlaybackAnalyser,
  createAndConnectGainNode,
} from './audio-context-init';

export type { AudioPlaybackRefs, PollingControls };

/**
 * Initialize or resume the playback AudioContext at Azure's sample rate (24kHz)
 * Also sets up the analyser and gain node for real-time level monitoring
 */
export function useInitPlaybackContext(
  playbackContextRef: React.MutableRefObject<AudioContext | null>,
  playbackAnalyserRef: React.MutableRefObject<AnalyserNode | null>,
  gainNodeRef: React.MutableRefObject<GainNode | null>,
  preferredOutputId?: string
) {
  return useCallback(async () => {
    if (playbackContextRef.current) {
      await resumeAudioContext(playbackContextRef.current);
      return { context: playbackContextRef.current, analyser: playbackAnalyserRef.current, gainNode: gainNodeRef.current };
    }

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    playbackContextRef.current = new AudioContextClass({ sampleRate: AZURE_SAMPLE_RATE });
    logger.debug(`[VoiceSession] 🔊 Playback context created at ${AZURE_SAMPLE_RATE}Hz, state: ${playbackContextRef.current.state}`);

    playbackAnalyserRef.current = createPlaybackAnalyser(playbackContextRef.current);
    gainNodeRef.current = createAndConnectGainNode(playbackContextRef.current, playbackAnalyserRef.current);
    logger.debug('[VoiceSession] 🔊 Playback analyser and gain node created');

    await setAudioOutputDevice(playbackContextRef.current, preferredOutputId);
    await resumeAudioContext(playbackContextRef.current);

    return { context: playbackContextRef.current, analyser: playbackAnalyserRef.current, gainNode: gainNodeRef.current };
  }, [playbackContextRef, playbackAnalyserRef, gainNodeRef, preferredOutputId]);
}

/**
 * Schedule all queued audio chunks for time-based playback
 * Uses AudioContext.currentTime for precise scheduling to prevent stuttering
 * Audio is routed through gainNode -> analyser -> destination for real-time level monitoring
 */
export function useScheduleQueuedChunks(refs: AudioPlaybackRefs, setSpeaking: (value: boolean) => void, setOutputLevel: (value: number) => void) {
  return useCallback(() => {
    const ctx = refs.playbackContextRef.current;
    const gainNode = refs.gainNodeRef.current;
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

      // Connect to gain node (which routes to analyser -> destination) or fallback to direct
      if (gainNode) {
        source.connect(gainNode);
      } else {
        source.connect(ctx.destination);
      }

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

/**
 * Hook to poll the playback analyser for real-time output levels
 * Returns a function to start/stop the polling
 */
export function useOutputLevelPolling(
  playbackAnalyserRef: React.MutableRefObject<AnalyserNode | null>,
  isPlayingRef: React.MutableRefObject<boolean>,
  setOutputLevel: (value: number) => void
): PollingControls {
  const animationFrameRef = useRef<number | null>(null);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const pollLevelRef = useRef<(() => void) | null>(null);

  const pollLevel = useCallback(() => {
    const analyser = playbackAnalyserRef.current;

    if (!analyser || !isPlayingRef.current) {
      setOutputLevel(0);
      animationFrameRef.current = null;
      return;
    }

    // Initialize data array if needed
    if (!dataArrayRef.current || dataArrayRef.current.length !== analyser.frequencyBinCount) {
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
    }

    // Get frequency data from analyser
    analyser.getByteFrequencyData(dataArrayRef.current);

    // Calculate average level
    let sum = 0;
    for (let i = 0; i < dataArrayRef.current.length; i++) {
      sum += dataArrayRef.current[i];
    }
    const average = sum / dataArrayRef.current.length;

    // Scale and set output level (0-1 range)
    // Multiply by 2 for better visualization sensitivity
    setOutputLevel(Math.min(1, (average / 255) * 2.5));

    // Continue polling
    animationFrameRef.current = requestAnimationFrame(() => {
      if (pollLevelRef.current) pollLevelRef.current();
    });
  }, [playbackAnalyserRef, isPlayingRef, setOutputLevel]);

  useEffect(() => {
    // Store pollLevel in ref to enable recursion without linter issues
    pollLevelRef.current = pollLevel;
  }, [pollLevel]);

  const startPolling = useCallback(() => {
    if (!animationFrameRef.current) {
      if (pollLevelRef.current) {
        animationFrameRef.current = requestAnimationFrame(pollLevelRef.current);
      }
    }
  }, []);

  const stopPolling = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setOutputLevel(0);
  }, [setOutputLevel]);

  return { startPolling, stopPolling };
}

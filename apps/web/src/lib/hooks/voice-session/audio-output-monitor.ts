'use client';

import { useCallback, useEffect, useRef } from 'react';
import { AZURE_SAMPLE_RATE } from './constants';
import {
  createAndConnectGainNode,
  createPlaybackAnalyser,
  resumeAudioContext,
  setAudioOutputDevice,
} from './audio-context-init';
import {
  calculateAverageLevel,
  shouldUpdateLevel,
  shouldUpdateLevelByDelta,
} from './audio-polling-helpers';

export function useInitPlaybackContext(
  playbackContextRef: React.MutableRefObject<AudioContext | null>,
  playbackAnalyserRef: React.MutableRefObject<AnalyserNode | null>,
  gainNodeRef: React.MutableRefObject<GainNode | null>,
  preferredOutputId?: string,
) {
  return useCallback(async () => {
    if (playbackContextRef.current) {
      await resumeAudioContext(playbackContextRef.current);
      return {
        context: playbackContextRef.current,
        analyser: playbackAnalyserRef.current,
        gainNode: gainNodeRef.current,
      };
    }

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    playbackContextRef.current = new AudioContextClass({ sampleRate: AZURE_SAMPLE_RATE });
    playbackAnalyserRef.current = createPlaybackAnalyser(playbackContextRef.current);
    gainNodeRef.current = createAndConnectGainNode(
      playbackContextRef.current,
      playbackAnalyserRef.current,
    );

    await setAudioOutputDevice(playbackContextRef.current, preferredOutputId);
    await resumeAudioContext(playbackContextRef.current);
    return {
      context: playbackContextRef.current,
      analyser: playbackAnalyserRef.current,
      gainNode: gainNodeRef.current,
    };
  }, [gainNodeRef, playbackAnalyserRef, playbackContextRef, preferredOutputId]);
}

export function useOutputLevelPolling(
  playbackAnalyserRef: React.MutableRefObject<AnalyserNode | null>,
  isSpeakingRef: React.MutableRefObject<boolean>,
  setOutputLevel: (value: number) => void,
) {
  const animationFrameRef = useRef<number | null>(null);
  const pollLevelRef = useRef<(() => void) | null>(null);
  const lastUpdateRef = useRef(0);
  const lastLevelRef = useRef(0);

  const pollLevel = useCallback(() => {
    const analyser = playbackAnalyserRef.current;
    if (!analyser || !isSpeakingRef.current) {
      setOutputLevel(0);
      animationFrameRef.current = null;
      return;
    }

    if (!shouldUpdateLevel(lastUpdateRef)) {
      animationFrameRef.current = requestAnimationFrame(() => pollLevelRef.current?.());
      return;
    }

    const level = calculateAverageLevel(analyser);
    if (shouldUpdateLevelByDelta(level, lastLevelRef)) {
      setOutputLevel(level);
    }
    animationFrameRef.current = requestAnimationFrame(() => pollLevelRef.current?.());
  }, [isSpeakingRef, playbackAnalyserRef, setOutputLevel]);

  useEffect(() => {
    pollLevelRef.current = pollLevel;
  }, [pollLevel]);

  const startPolling = useCallback(() => {
    if (!animationFrameRef.current) {
      animationFrameRef.current = requestAnimationFrame(() => pollLevelRef.current?.());
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

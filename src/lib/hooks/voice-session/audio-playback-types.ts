/**
 * Audio Playback Types
 */

import type { RingBuffer } from './ring-buffer';

export interface AudioPlaybackRefs {
  playbackContextRef: React.MutableRefObject<AudioContext | null>;
  audioQueueRef: React.MutableRefObject<RingBuffer<Int16Array>>;
  isPlayingRef: React.MutableRefObject<boolean>;
  isBufferingRef: React.MutableRefObject<boolean>;
  nextPlayTimeRef: React.MutableRefObject<number>;
  scheduledSourcesRef: React.MutableRefObject<Set<AudioBufferSourceNode>>;
  playNextChunkRef: React.MutableRefObject<(() => void) | null>;
  playbackAnalyserRef: React.MutableRefObject<AnalyserNode | null>;
  gainNodeRef: React.MutableRefObject<GainNode | null>;
}

export interface PollingControls {
  startPolling: () => void;
  stopPolling: () => void;
}

/**
 * Audio Playback Types
 */

export interface AudioPlaybackRefs {
  playbackContextRef: React.MutableRefObject<AudioContext | null>;
  audioQueueRef: React.MutableRefObject<Int16Array[]>;
  isPlayingRef: React.MutableRefObject<boolean>;
  isBufferingRef: React.MutableRefObject<boolean>;
  nextPlayTimeRef: React.MutableRefObject<number>;
  scheduledSourcesRef: React.MutableRefObject<AudioBufferSourceNode[]>;
  playNextChunkRef: React.MutableRefObject<(() => void) | null>;
  playbackAnalyserRef: React.MutableRefObject<AnalyserNode | null>;
  gainNodeRef: React.MutableRefObject<GainNode | null>;
}

export interface PollingControls {
  startPolling: () => void;
  stopPolling: () => void;
}

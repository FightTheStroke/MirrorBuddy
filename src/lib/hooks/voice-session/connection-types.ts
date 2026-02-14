// ============================================================================
// CONNECTION TYPES
// Shared types for connection management
// ============================================================================

import type { Maestro } from '@/types';
import type { RingBuffer } from './ring-buffer';

/**
 * All refs used by connection management
 */
export interface ConnectionRefs {
  maestroRef: React.MutableRefObject<Maestro | null>;
  captureContextRef: React.MutableRefObject<AudioContext | null>;
  playbackContextRef: React.MutableRefObject<AudioContext | null>;
  mediaStreamRef: React.MutableRefObject<MediaStream | null>;
  sourceNodeRef: React.MutableRefObject<MediaStreamAudioSourceNode | null>;
  processorRef: React.MutableRefObject<ScriptProcessorNode | null>;
  audioQueueRef: React.MutableRefObject<RingBuffer<Int16Array>>;
  isPlayingRef: React.MutableRefObject<boolean>;
  isBufferingRef: React.MutableRefObject<boolean>;
  nextPlayTimeRef: React.MutableRefObject<number>;
  scheduledSourcesRef: React.MutableRefObject<Set<AudioBufferSourceNode>>;
  sessionReadyRef: React.MutableRefObject<boolean>;
  greetingSentRef: React.MutableRefObject<boolean>;
  hasActiveResponseRef: React.MutableRefObject<boolean>;
  handleServerEventRef: React.MutableRefObject<((event: Record<string, unknown>) => void) | null>;
  sessionIdRef: React.MutableRefObject<string | null>;
  connectionTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
  greetingTimeoutsRef: React.MutableRefObject<NodeJS.Timeout[]>;
  webrtcCleanupRef: React.MutableRefObject<(() => void) | null>;
  remoteAudioStreamRef: React.MutableRefObject<MediaStream | null>;
  webrtcAudioElementRef: React.MutableRefObject<HTMLAudioElement | null>;
  webrtcDataChannelRef: React.MutableRefObject<RTCDataChannel | null>;
  webrtcHeartbeatRef: React.MutableRefObject<NodeJS.Timeout | null>;
  animationFrameRef: React.MutableRefObject<number | null>;
  userSpeechEndTimeRef: React.MutableRefObject<number | null>;
  firstAudioPlaybackTimeRef: React.MutableRefObject<number | null>;
  /** performance.now() marks for end-to-end voice connection timing */
  voiceConnectStartTimeRef: React.MutableRefObject<number | null>;
  voiceDataChannelOpenTimeRef: React.MutableRefObject<number | null>;
  voiceSessionUpdatedTimeRef: React.MutableRefObject<number | null>;
  sendSessionConfigRef: React.MutableRefObject<(() => void) | null>;
  /** Unmute mic tracks after session.updated confirms character identity */
  unmuteAudioTracksRef: React.MutableRefObject<(() => void) | null>;
  /** Messages to inject for conversation continuity */
  initialMessagesRef: React.MutableRefObject<Array<{
    role: 'user' | 'assistant';
    content: string;
  }> | null>;
}

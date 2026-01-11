// ============================================================================
// LATENCY MEASUREMENT UTILITIES
// First-audio latency tracking for WebRTC and WebSocket
// ============================================================================

import { logger } from '@/lib/logger';

interface LatencyRefs {
  userSpeechEndTimeRef: React.MutableRefObject<number | null>;
  firstAudioPlaybackTimeRef: React.MutableRefObject<number | null>;
}

/**
 * Record user speech end time for latency tracking
 */
export function recordUserSpeechEnd(refs: LatencyRefs): void {
  refs.userSpeechEndTimeRef.current = performance.now();
}

/**
 * Measure and log latency for WebRTC first audio
 */
export function recordWebRTCFirstAudio(refs: LatencyRefs): void {
  refs.firstAudioPlaybackTimeRef.current = performance.now();
  if (refs.userSpeechEndTimeRef.current !== null) {
    const latency = refs.firstAudioPlaybackTimeRef.current - refs.userSpeechEndTimeRef.current;
    logger.info(`[WebRTC Latency] First audio received: ${latency.toFixed(2)}ms (target: <350ms)`);
  }
}

/**
 * Measure and log latency for WebSocket first audio
 */
export function recordWebSocketFirstAudio(refs: LatencyRefs): void {
  refs.firstAudioPlaybackTimeRef.current = performance.now();
  if (refs.userSpeechEndTimeRef.current !== null) {
    const latency = refs.firstAudioPlaybackTimeRef.current - refs.userSpeechEndTimeRef.current;
    logger.info(`[WebSocket Latency] First audio playback: ${latency.toFixed(2)}ms (target: <350ms)`);
  }
}

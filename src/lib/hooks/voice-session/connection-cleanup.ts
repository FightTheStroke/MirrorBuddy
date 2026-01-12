// ============================================================================
// CONNECTION CLEANUP
// Resource cleanup for voice session disconnect
// ============================================================================

'use client';

import { useCallback } from 'react';
import { logger } from '@/lib/logger';
import type { ConnectionRefs } from './connection-types';

/**
 * Disconnect from voice session and clean up all resources
 */
export function useDisconnect(
  refs: ConnectionRefs,
  reset: () => void,
  setConnectionState: (state: 'idle' | 'connecting' | 'connected' | 'error') => void
) {
  return useCallback(() => {
    logger.debug('[VoiceSession] Disconnecting...');

    // WebRTC heartbeat cleanup
    if (refs.webrtcHeartbeatRef.current) {
      clearInterval(refs.webrtcHeartbeatRef.current);
      // eslint-disable-next-line react-hooks/immutability -- Intentional ref cleanup
      refs.webrtcHeartbeatRef.current = null;
    }

    // WebRTC cleanup
    if (refs.webrtcCleanupRef.current) {
      logger.debug('[VoiceSession] Cleaning up WebRTC connection');
      refs.webrtcCleanupRef.current();
      refs.webrtcCleanupRef.current = null;
    }

    // WebRTC audio cleanup
    if (refs.webrtcAudioElementRef.current) {
      refs.webrtcAudioElementRef.current.pause();
      refs.webrtcAudioElementRef.current.srcObject = null;
      refs.webrtcAudioElementRef.current = null;
    }
    if (refs.remoteAudioStreamRef.current) {
      refs.remoteAudioStreamRef.current.getTracks().forEach(track => track.stop());
      refs.remoteAudioStreamRef.current = null;
    }

    // Clear connection timeout if still pending
    if (refs.connectionTimeoutRef.current) {
      clearTimeout(refs.connectionTimeoutRef.current);
      refs.connectionTimeoutRef.current = null;
    }

    // Audio nodes cleanup
    if (refs.processorRef.current) {
      refs.processorRef.current.disconnect();
      refs.processorRef.current = null;
    }
    if (refs.sourceNodeRef.current) {
      refs.sourceNodeRef.current.disconnect();
      refs.sourceNodeRef.current = null;
    }

    // WebSocket cleanup
    if (refs.wsRef.current) {
      refs.wsRef.current.close();
      refs.wsRef.current = null;
    }

    // Media stream cleanup
    if (refs.mediaStreamRef.current) {
      refs.mediaStreamRef.current.getTracks().forEach(track => track.stop());
      refs.mediaStreamRef.current = null;
    }

    // Audio contexts cleanup
    if (refs.captureContextRef.current) {
      refs.captureContextRef.current.close();
      refs.captureContextRef.current = null;
    }
    if (refs.playbackContextRef.current) {
      refs.playbackContextRef.current.close();
      refs.playbackContextRef.current = null;
    }

    // Reset audio state
    refs.audioQueueRef.current = [];
    refs.isPlayingRef.current = false;
    refs.isBufferingRef.current = true;
    refs.nextPlayTimeRef.current = 0;

    // Stop all scheduled audio sources
    refs.scheduledSourcesRef.current.forEach(source => {
      try { source.stop(); } catch { /* already stopped */ }
    });
    refs.scheduledSourcesRef.current = [];

    // Reset session state
    refs.sessionReadyRef.current = false;
    refs.greetingSentRef.current = false;
    refs.hasActiveResponseRef.current = false;
    refs.maestroRef.current = null;

    reset();
    setConnectionState('idle');
  }, [refs, reset, setConnectionState]);
}

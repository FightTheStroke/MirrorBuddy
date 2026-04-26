// ============================================================================
// WebRTC HANDLERS - Audio track handling
// ============================================================================

'use client';

import { clientLogger as logger } from '@/lib/logger/client';
import { recordWebRTCFirstAudio } from './latency-utils';

export function handleWebRTCTrack(
  event: RTCTrackEvent,
  refs: {
    remoteAudioStreamRef: React.MutableRefObject<MediaStream | null>;
    webrtcAudioElementRef: React.MutableRefObject<HTMLAudioElement | null>;
    userSpeechEndTimeRef: React.MutableRefObject<number | null>;
    firstAudioPlaybackTimeRef: React.MutableRefObject<number | null>;
  },
) {
  logger.debug('[VoiceSession] onTrack received from Azure', { track: event.track.kind });
  if (event.track.kind === 'audio') {
    // Guard against multiple ontrack events creating multiple audio elements.
    // If we replace the ref without stopping the previous element/stream, audio can overlap.
    const previousAudioEl = refs.webrtcAudioElementRef.current;
    if (previousAudioEl) {
      try {
        previousAudioEl.pause();
      } catch {
        /* best-effort */
      }
      previousAudioEl.srcObject = null;
    }

    const previousStream = refs.remoteAudioStreamRef.current;
    if (previousStream) {
      previousStream.getTracks().forEach((track) => track.stop());
      refs.remoteAudioStreamRef.current = null;
    }

    const remoteStream = new MediaStream();
    remoteStream.addTrack(event.track);
    refs.remoteAudioStreamRef.current = remoteStream;

    const audioElement = new Audio();
    audioElement.srcObject = remoteStream;
    audioElement.autoplay = true;

    // Setup error handling for audio playback issues
    audioElement.onerror = (_e) => {
      logger.error('[VoiceSession] WebRTC audio element error', {
        error: audioElement.error?.message || 'Unknown audio error',
      });
    };

    refs.webrtcAudioElementRef.current = audioElement;

    // If this track ends, ensure we stop playback and release resources.
    event.track.onended = () => {
      // Only clean up if we're still holding the same stream/element.
      if (refs.remoteAudioStreamRef.current === remoteStream) {
        refs.remoteAudioStreamRef.current.getTracks().forEach((t) => t.stop());
        refs.remoteAudioStreamRef.current = null;
      }
      if (refs.webrtcAudioElementRef.current === audioElement) {
        try {
          audioElement.pause();
        } catch {
          /* best-effort */
        }
        audioElement.srcObject = null;
        refs.webrtcAudioElementRef.current = null;
      }
    };

    recordWebRTCFirstAudio({
      userSpeechEndTimeRef: refs.userSpeechEndTimeRef,
      firstAudioPlaybackTimeRef: refs.firstAudioPlaybackTimeRef,
    });
    logger.debug('[VoiceSession] WebRTC audio element created and connected');
  }
}

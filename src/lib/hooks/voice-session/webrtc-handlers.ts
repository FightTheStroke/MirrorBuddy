// ============================================================================
// WebRTC HANDLERS - Audio track handling
// ============================================================================

'use client';

import { logger } from '@/lib/logger';
import { recordWebRTCFirstAudio } from './latency-utils';

export function handleWebRTCTrack(
  event: RTCTrackEvent,
  refs: {
    remoteAudioStreamRef: React.MutableRefObject<MediaStream | null>;
    webrtcAudioElementRef: React.MutableRefObject<HTMLAudioElement | null>;
    userSpeechEndTimeRef: React.MutableRefObject<number | null>;
    firstAudioPlaybackTimeRef: React.MutableRefObject<number | null>;
  }
) {
  logger.debug('[VoiceSession] onTrack received from Azure', { track: event.track.kind });
  if (event.track.kind === 'audio') {
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
    recordWebRTCFirstAudio({ userSpeechEndTimeRef: refs.userSpeechEndTimeRef, firstAudioPlaybackTimeRef: refs.firstAudioPlaybackTimeRef });
    logger.debug('[VoiceSession] WebRTC audio element created and connected');
  }
}

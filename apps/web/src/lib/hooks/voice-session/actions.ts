// ============================================================================
// USER ACTIONS
// User-initiated actions during voice session (WebRTC only)
// ============================================================================

'use client';

import { useCallback } from 'react';
import { clientLogger as logger } from '@/lib/logger/client';
import type { AudioChunkQueue } from './audio-queue';

export interface ActionRefs {
  hasActiveResponseRef: React.MutableRefObject<boolean>;
  audioQueueRef: React.MutableRefObject<AudioChunkQueue>;
  isPlayingRef: React.MutableRefObject<boolean>;
  isBufferingRef: React.MutableRefObject<boolean>;
  scheduledSourcesRef: React.MutableRefObject<Set<AudioBufferSourceNode>>;
  webrtcDataChannelRef: React.MutableRefObject<RTCDataChannel | null>;
  webrtcAudioElementRef: React.MutableRefObject<HTMLAudioElement | null>;
}

/**
 * Toggle mute state for microphone input.
 * The actual WebRTC track muting is handled by a useEffect in use-voice-session.ts
 * that watches the isMuted store value and sets track.enabled accordingly.
 */
export function useToggleMute(isMuted: boolean, setMuted: (value: boolean) => void) {
  return useCallback(() => {
    const newMuted = !isMuted;
    logger.debug(`[VoiceSession] Mute toggled: ${newMuted ? 'muted' : 'unmuted'}`);
    setMuted(newMuted);
  }, [isMuted, setMuted]);
}

/**
 * Send message via WebRTC data channel
 */
function sendViaWebRTC(
  webrtcDataChannelRef: React.MutableRefObject<RTCDataChannel | null>,
  message: Record<string, unknown>,
): boolean {
  if (webrtcDataChannelRef.current?.readyState === 'open') {
    webrtcDataChannelRef.current.send(JSON.stringify(message));
    return true;
  }
  return false;
}

/**
 * Send text message to voice session via WebRTC
 */
export function useSendText(
  webrtcDataChannelRef: React.MutableRefObject<RTCDataChannel | null>,
  addTranscript: (role: 'user' | 'assistant', text: string) => void,
) {
  return useCallback(
    (text: string) => {
      const sent = sendViaWebRTC(webrtcDataChannelRef, {
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [{ type: 'input_text', text }],
        },
      });

      if (sent) {
        sendViaWebRTC(webrtcDataChannelRef, { type: 'response.create' });
        addTranscript('user', text);
      } else {
        logger.warn('[VoiceSession] Failed to send text - WebRTC data channel not ready');
      }
    },
    [webrtcDataChannelRef, addTranscript],
  );
}

/**
 * Cancel the active assistant response and flush any locally buffered audio.
 *
 * Pure helper (not a hook) so callers like character switching can run the
 * same teardown without depending on the React `useCallback` returned by
 * `useCancelResponse`.
 */
export function performCancelResponse(
  refs: ActionRefs,
  setSpeaking: (value: boolean) => void,
): void {
  if (refs.hasActiveResponseRef.current) {
    logger.debug('[VoiceSession] Cancelling active response');

    if (refs.webrtcDataChannelRef.current?.readyState === 'open') {
      refs.webrtcDataChannelRef.current.send(JSON.stringify({ type: 'response.cancel' }));
      logger.debug('[VoiceSession] Sent response.cancel via WebRTC data channel');
    }

    refs.hasActiveResponseRef.current = false;
  }

  if (refs.webrtcAudioElementRef.current) {
    refs.webrtcAudioElementRef.current.pause();
    logger.debug('[VoiceSession] WebRTC audio element paused');
  }

  refs.audioQueueRef.current.clear();
  refs.isPlayingRef.current = false;
  refs.isBufferingRef.current = true;
  refs.scheduledSourcesRef.current.forEach((source) => {
    try {
      source.stop();
    } catch {
      /* already stopped */
    }
  });
  refs.scheduledSourcesRef.current.clear();
  setSpeaking(false);
}

/**
 * Cancel current AI response and clear audio queue
 */
export function useCancelResponse(refs: ActionRefs, setSpeaking: (value: boolean) => void) {
  return useCallback(() => {
    performCancelResponse(refs, setSpeaking);
  }, [refs, setSpeaking]);
}

/**
 * Send video frame to Azure Realtime API via data channel (ADR 0122).
 * Sends as conversation.item.create with input_image — no response.create
 * triggered, the frame serves as visual context for subsequent interactions.
 */
export function useSendVideoFrame(
  webrtcDataChannelRef: React.MutableRefObject<RTCDataChannel | null>,
) {
  return useCallback(
    (base64ImageData: string) => {
      const sent = sendViaWebRTC(webrtcDataChannelRef, {
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [
            {
              type: 'input_image',
              image_url: `data:image/jpeg;base64,${base64ImageData}`,
            },
          ],
        },
      });
      if (!sent) {
        logger.warn('[VoiceSession] Video frame send failed - DC not ready');
      }
      return sent;
    },
    [webrtcDataChannelRef],
  );
}

/**
 * Send webcam capture result back to Azure
 */
export function useSendWebcamResult(
  webrtcDataChannelRef: React.MutableRefObject<RTCDataChannel | null>,
) {
  return useCallback(
    (callId: string, imageData: string | null) => {
      if (imageData) {
        sendViaWebRTC(webrtcDataChannelRef, {
          type: 'conversation.item.create',
          item: {
            type: 'function_call_output',
            call_id: callId,
            output: JSON.stringify({ success: true, image_captured: true }),
          },
        });
        sendViaWebRTC(webrtcDataChannelRef, {
          type: 'conversation.item.create',
          item: {
            type: 'message',
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: 'Ho scattato una foto. Chiedimi di descriverti cosa vedo.',
              },
            ],
          },
        });
      } else {
        sendViaWebRTC(webrtcDataChannelRef, {
          type: 'conversation.item.create',
          item: {
            type: 'function_call_output',
            call_id: callId,
            output: JSON.stringify({
              success: false,
              error: 'Cattura annullata',
            }),
          },
        });
      }
      sendViaWebRTC(webrtcDataChannelRef, { type: 'response.create' });
    },
    [webrtcDataChannelRef],
  );
}

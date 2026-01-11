// ============================================================================
// USER ACTIONS
// User-initiated actions during voice session
// ============================================================================

'use client';

import { useCallback } from 'react';
import { logger } from '@/lib/logger';

export interface ActionRefs {
  wsRef: React.MutableRefObject<WebSocket | null>;
  hasActiveResponseRef: React.MutableRefObject<boolean>;
  audioQueueRef: React.MutableRefObject<Int16Array[]>;
  isPlayingRef: React.MutableRefObject<boolean>;
  isBufferingRef: React.MutableRefObject<boolean>;
  scheduledSourcesRef: React.MutableRefObject<AudioBufferSourceNode[]>;
  transportRef: React.MutableRefObject<'websocket' | 'webrtc'>;
  webrtcDataChannelRef: React.MutableRefObject<RTCDataChannel | null>;
  webrtcAudioElementRef: React.MutableRefObject<HTMLAudioElement | null>;
}

/**
 * Toggle mute state for microphone input
 */
export function useToggleMute(isMuted: boolean, setMuted: (value: boolean) => void) {
  return useCallback(() => {
    setMuted(!isMuted);
  }, [isMuted, setMuted]);
}

/**
 * Send text message to voice session
 * Supports both WebSocket and WebRTC transports
 */
export function useSendText(
  wsRef: React.MutableRefObject<WebSocket | null>,
  transportRef: React.MutableRefObject<'websocket' | 'webrtc'>,
  webrtcDataChannelRef: React.MutableRefObject<RTCDataChannel | null>,
  addTranscript: (role: 'user' | 'assistant', text: string) => void
) {
  return useCallback((text: string) => {
    const sent = sendViaTransportAction(wsRef, transportRef, webrtcDataChannelRef, {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }],
      },
    });

    if (sent) {
      sendViaTransportAction(wsRef, transportRef, webrtcDataChannelRef, { type: 'response.create' });
      addTranscript('user', text);
    } else {
      logger.warn('[VoiceSession] Failed to send text - no active transport');
    }
  }, [wsRef, transportRef, webrtcDataChannelRef, addTranscript]);
}

/**
 * Cancel current AI response and clear audio queue
 * Supports both WebSocket and WebRTC transports
 */
export function useCancelResponse(refs: ActionRefs, setSpeaking: (value: boolean) => void) {
  return useCallback(() => {
    // Only send response.cancel if Azure actually has an active response
    if (refs.hasActiveResponseRef.current) {
      logger.debug('[VoiceSession] Cancelling active response');

      // Send via appropriate transport
      if (refs.transportRef.current === 'webrtc' && refs.webrtcDataChannelRef.current?.readyState === 'open') {
        // WebRTC: send via data channel
        refs.webrtcDataChannelRef.current.send(JSON.stringify({ type: 'response.cancel' }));
        logger.debug('[VoiceSession] Sent response.cancel via WebRTC data channel');
      } else if (refs.wsRef.current?.readyState === WebSocket.OPEN) {
        // WebSocket: send via ws
        refs.wsRef.current.send(JSON.stringify({ type: 'response.cancel' }));
        logger.debug('[VoiceSession] Sent response.cancel via WebSocket');
      }

      // eslint-disable-next-line react-hooks/immutability -- Intentional ref mutation
      refs.hasActiveResponseRef.current = false;
    }

    // Pause WebRTC audio element if present
    if (refs.webrtcAudioElementRef.current) {
      refs.webrtcAudioElementRef.current.pause();
      logger.debug('[VoiceSession] WebRTC audio element paused');
    }

    // Always clear local audio queue and stop scheduled sources
    refs.audioQueueRef.current = [];
    refs.isPlayingRef.current = false;
    refs.isBufferingRef.current = true;
    refs.scheduledSourcesRef.current.forEach(source => {
      try { source.stop(); } catch { /* already stopped */ }
    });
    refs.scheduledSourcesRef.current = [];
    setSpeaking(false);
  }, [refs, setSpeaking]);
}

/**
 * Send message via appropriate transport (WebSocket or WebRTC)
 */
function sendViaTransportAction(
  wsRef: React.MutableRefObject<WebSocket | null>,
  transportRef: React.MutableRefObject<'websocket' | 'webrtc'>,
  webrtcDataChannelRef: React.MutableRefObject<RTCDataChannel | null>,
  message: Record<string, unknown>
): boolean {
  const messageStr = JSON.stringify(message);

  if (transportRef.current === 'webrtc') {
    if (webrtcDataChannelRef.current?.readyState === 'open') {
      webrtcDataChannelRef.current.send(messageStr);
      return true;
    }
  } else {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(messageStr);
      return true;
    }
  }

  return false;
}

/**
 * Send webcam capture result back to Azure
 */
export function useSendWebcamResult(
  wsRef: React.MutableRefObject<WebSocket | null>,
  transportRef: React.MutableRefObject<'websocket' | 'webrtc'>,
  webrtcDataChannelRef: React.MutableRefObject<RTCDataChannel | null>
) {
  return useCallback((callId: string, imageData: string | null) => {
    if (imageData) {
      sendViaTransportAction(wsRef, transportRef, webrtcDataChannelRef, {
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: callId,
          output: JSON.stringify({ success: true, image_captured: true }),
        },
      });
      sendViaTransportAction(wsRef, transportRef, webrtcDataChannelRef, {
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [{ type: 'input_text', text: 'Ho scattato una foto. Chiedimi di descriverti cosa vedo.' }],
        },
      });
    } else {
      sendViaTransportAction(wsRef, transportRef, webrtcDataChannelRef, {
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: callId,
          output: JSON.stringify({ success: false, error: 'Cattura annullata' }),
        },
      });
    }
    sendViaTransportAction(wsRef, transportRef, webrtcDataChannelRef, { type: 'response.create' });
  }, [wsRef, transportRef, webrtcDataChannelRef]);
}

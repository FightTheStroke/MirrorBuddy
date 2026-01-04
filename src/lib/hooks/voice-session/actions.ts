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
 */
export function useSendText(
  wsRef: React.MutableRefObject<WebSocket | null>,
  addTranscript: (role: 'user' | 'assistant', text: string) => void
) {
  return useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [{ type: 'input_text', text }],
        },
      }));
      wsRef.current.send(JSON.stringify({ type: 'response.create' }));
      addTranscript('user', text);
    }
  }, [wsRef, addTranscript]);
}

/**
 * Cancel current AI response and clear audio queue
 */
export function useCancelResponse(refs: ActionRefs, setSpeaking: (value: boolean) => void) {
  return useCallback(() => {
    // Only send response.cancel if Azure actually has an active response
    if (refs.wsRef.current?.readyState === WebSocket.OPEN && refs.hasActiveResponseRef.current) {
      logger.debug('[VoiceSession] Cancelling active response');
      refs.wsRef.current.send(JSON.stringify({ type: 'response.cancel' }));
      refs.hasActiveResponseRef.current = false;
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
 * Send webcam capture result back to Azure
 */
export function useSendWebcamResult(wsRef: React.MutableRefObject<WebSocket | null>) {
  return useCallback((callId: string, imageData: string | null) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      if (imageData) {
        wsRef.current.send(JSON.stringify({
          type: 'conversation.item.create',
          item: {
            type: 'function_call_output',
            call_id: callId,
            output: JSON.stringify({ success: true, image_captured: true }),
          },
        }));
        wsRef.current.send(JSON.stringify({
          type: 'conversation.item.create',
          item: {
            type: 'message',
            role: 'user',
            content: [{ type: 'input_text', text: 'Ho scattato una foto. Chiedimi di descriverti cosa vedo.' }],
          },
        }));
      } else {
        wsRef.current.send(JSON.stringify({
          type: 'conversation.item.create',
          item: {
            type: 'function_call_output',
            call_id: callId,
            output: JSON.stringify({ success: false, error: 'Cattura annullata' }),
          },
        }));
      }
      wsRef.current.send(JSON.stringify({ type: 'response.create' }));
    }
  }, [wsRef]);
}

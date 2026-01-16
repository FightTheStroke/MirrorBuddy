// ============================================================================
// SEND GREETING
// Voice session greeting functionality
// ============================================================================

'use client';

import { useCallback } from 'react';
import { logger } from '@/lib/logger';
import { useSettingsStore } from '@/lib/stores';
import { getRandomGreetingPrompt } from './session-constants';

/**
 * Send greeting to maestro after session is ready
 * Supports both WebSocket and WebRTC transports
 */
export function useSendGreeting(
  wsRef: React.MutableRefObject<WebSocket | null>,
  greetingSentRef: React.MutableRefObject<boolean>,
  transportRef?: React.MutableRefObject<'websocket' | 'webrtc' | null>,
  webrtcDataChannelRef?: React.MutableRefObject<RTCDataChannel | null>
) {
  return useCallback(() => {
    logger.debug('[VoiceSession] sendGreeting called');

    const isWebRTC = transportRef?.current === 'webrtc';
    const dataChannel = webrtcDataChannelRef?.current;
    const ws = wsRef.current;

    // Check transport availability
    const webrtcReady = isWebRTC && dataChannel?.readyState === 'open';
    const websocketReady = !isWebRTC && ws?.readyState === WebSocket.OPEN;

    if (!webrtcReady && !websocketReady) {
      logger.debug('[VoiceSession] sendGreeting: transport not ready', {
        transport: isWebRTC ? 'webrtc' : 'websocket',
        webrtcState: dataChannel?.readyState,
        wsState: ws?.readyState,
      });
      return;
    }

    if (greetingSentRef.current) {
      logger.debug('[VoiceSession] sendGreeting: already sent, skipping');
      return;
    }

    greetingSentRef.current = true;
    const studentName = useSettingsStore.getState().studentProfile?.name || null;
    const greetingPrompt = getRandomGreetingPrompt(studentName);

    logger.debug('[VoiceSession] Sending greeting request', { transport: isWebRTC ? 'WebRTC' : 'WebSocket' });

    const createMsg = JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'text', text: greetingPrompt }],
      },
    });
    const responseMsg = JSON.stringify({ type: 'response.create' });

    if (isWebRTC && dataChannel) {
      dataChannel.send(createMsg);
      dataChannel.send(responseMsg);
    } else if (ws) {
      ws.send(createMsg);
      ws.send(responseMsg);
    }

    logger.debug('[VoiceSession] Greeting request sent');
  }, [wsRef, greetingSentRef, transportRef, webrtcDataChannelRef]);
}

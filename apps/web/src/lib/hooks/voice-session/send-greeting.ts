// ============================================================================
// SEND GREETING
// Voice session greeting functionality (WebRTC only)
// ============================================================================

'use client';

import { useCallback } from 'react';
import { clientLogger as logger } from '@/lib/logger/client';
import { useSettingsStore } from '@/lib/stores';
import { getRandomGreetingPrompt } from './session-constants';
import type { SupportedLanguage } from '@/app/api/chat/types';

/**
 * Send greeting to maestro after session is ready
 * WebRTC transport only
 */
export function useSendGreeting(
  greetingSentRef: React.MutableRefObject<boolean>,
  webrtcDataChannelRef: React.MutableRefObject<RTCDataChannel | null>,
  locale?: SupportedLanguage,
) {
  return useCallback(() => {
    logger.debug('[VoiceSession] sendGreeting called');

    const dataChannel = webrtcDataChannelRef.current;

    if (dataChannel?.readyState !== 'open') {
      logger.debug('[VoiceSession] sendGreeting: WebRTC data channel not ready', {
        state: dataChannel?.readyState,
      });
      return;
    }

    if (greetingSentRef.current) {
      logger.debug('[VoiceSession] sendGreeting: already sent, skipping');
      return;
    }

    greetingSentRef.current = true;
    const studentName = useSettingsStore.getState().studentProfile?.name || null;
    const greetingPrompt = getRandomGreetingPrompt(studentName, locale || 'it');

    logger.debug('[VoiceSession] Sending greeting request via WebRTC', {
      locale: locale || 'it',
    });

    const createMsg = JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text: greetingPrompt }],
      },
    });
    const responseMsg = JSON.stringify({ type: 'response.create' });

    dataChannel.send(createMsg);
    dataChannel.send(responseMsg);

    logger.debug('[VoiceSession] Greeting request sent');
  }, [greetingSentRef, webrtcDataChannelRef, locale]);
}

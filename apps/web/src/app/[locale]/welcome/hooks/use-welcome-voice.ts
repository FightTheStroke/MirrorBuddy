import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useVoiceSession } from '@/lib/hooks/use-voice-session';
import {
  isTransientVoiceNotice,
  VOICE_ERROR_I18N_KEYS,
} from '@/lib/hooks/voice-session/voice-error-codes';
import { useTransientVoiceNotice } from '@/lib/hooks/voice-session/use-transient-voice-notice';
import { logger } from '@/lib/logger';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';
import type { VoiceConnectionInfo, ExistingUserData } from '../types';
import { createOnboardingMelissa } from '../utils/create-onboarding-melissa';

const MAX_VOICE_RETRIES = 3;
const VOICE_RETRY_DELAY_MS = 2000;

export function useWelcomeVoice(
  existingUserData: ExistingUserData | null,
  connectionInfo: VoiceConnectionInfo | null,
) {
  const [useWebSpeechFallback, setUseWebSpeechFallback] = useState(false);
  const [voiceRetryAttempts, setVoiceRetryAttempts] = useState(0);
  const voiceRetryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTranscriptRef = useRef<string | null>(null);
  const tVoice = useTranslations('voice');
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const showTransientNotice = useTransientVoiceNotice(setVoiceNotice);

  const { addVoiceTranscript } = useOnboardingStore();

  const voiceSession = useVoiceSession({
    noiseReductionType: 'far_field',
    onError: (error) => {
      // A filtered turn is not a connection failure: tell the child briefly,
      // but do not consume retries or switch to the Web Speech fallback.
      if (isTransientVoiceNotice(error)) {
        showTransientNotice(tVoice(VOICE_ERROR_I18N_KEYS.VOICE_CONTENT_FILTERED));
        return;
      }

      const message = error instanceof Error ? error.message : String(error);

      if (voiceRetryAttempts < MAX_VOICE_RETRIES) {
        logger.warn('[WelcomePage] Voice connection issue, will retry', {
          message,
          retryAttempt: voiceRetryAttempts + 1,
          maxRetries: MAX_VOICE_RETRIES,
        });
        setVoiceRetryAttempts((prev) => prev + 1);
      } else {
        logger.error('[WelcomePage] Voice connection failed after all retries', {
          message,
          totalAttempts: voiceRetryAttempts,
          maxRetries: MAX_VOICE_RETRIES,
        });
        setUseWebSpeechFallback(true);
      }
    },
    onTranscript: (role, text) => {
      if (voiceRetryAttempts > 0) {
        logger.info('[WelcomePage] Voice session recovered, resetting retry counter');
        setVoiceRetryAttempts(0);
      }

      if (lastTranscriptRef.current === text.substring(0, 50)) return;
      lastTranscriptRef.current = text.substring(0, 50);
      addVoiceTranscript(role as 'user' | 'assistant', text);
    },
  });

  useEffect(() => {
    if (
      connectionInfo &&
      !useWebSpeechFallback &&
      voiceRetryAttempts > 0 &&
      voiceRetryAttempts <= MAX_VOICE_RETRIES
    ) {
      const retryDelay = VOICE_RETRY_DELAY_MS * voiceRetryAttempts;

      if (voiceRetryTimeoutRef.current) {
        clearTimeout(voiceRetryTimeoutRef.current);
      }

      voiceRetryTimeoutRef.current = setTimeout(() => {
        voiceSession.disconnect();
        setTimeout(() => {
          if (connectionInfo) {
            voiceSession.connect(createOnboardingMelissa(existingUserData), connectionInfo);
          }
        }, 500);
      }, retryDelay);
    }

    return () => {
      if (voiceRetryTimeoutRef.current) {
        clearTimeout(voiceRetryTimeoutRef.current);
      }
    };
  }, [connectionInfo, useWebSpeechFallback, voiceRetryAttempts, voiceSession, existingUserData]);

  const handleAzureUnavailable = useCallback(() => {
    setUseWebSpeechFallback(true);
  }, []);

  return {
    voiceSession,
    voiceNotice,
    useWebSpeechFallback,
    setUseWebSpeechFallback,
    handleAzureUnavailable,
  };
}

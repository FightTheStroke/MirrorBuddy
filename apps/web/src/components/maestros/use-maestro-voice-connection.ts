import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useVoiceSession } from '@/lib/hooks/use-voice-session';
import { logger } from '@/lib/logger';
import { shouldEscalateVoiceError } from '@/lib/hooks/voice-session/error-classification';
import {
  getVoiceErrorCode,
  VOICE_ERROR_I18N_KEYS,
} from '@/lib/hooks/voice-session/voice-error-codes';
import type { Maestro, ChatMessage } from '@/types';

interface UseMaestroVoiceConnectionProps {
  maestro: Maestro;
  initialMode: 'voice' | 'chat';
  onTranscript: (message: ChatMessage) => void;
  onQuestionAsked: () => void;
  /** Current messages to provide context when starting voice */
  currentMessages?: ChatMessage[];
  /**
   * Called when the assistant requests a webcam capture (capture_homework tool)
   * during a voice call. Without this, the realtime model would wait forever for
   * a tool result and stop responding.
   */
  onWebcamRequest?: (request: {
    purpose: string;
    instructions?: string;
    callId: string;
  }) => void;
}

export function useMaestroVoiceConnection({
  maestro,
  initialMode,
  onTranscript,
  onQuestionAsked,
  currentMessages = [],
  onWebcamRequest,
}: UseMaestroVoiceConnectionProps) {
  const t = useTranslations('voice');
  const [isVoiceActive, setIsVoiceActive] = useState(initialMode === 'voice');
  const [configError, setConfigError] = useState<string | null>(null);

  // Resolve any voice error to a localized, child-friendly message.
  // Coded errors (VoiceError) map to dedicated keys; anything else falls back
  // to a single calm generic message. A child must never read raw provider text.
  const resolveVoiceError = useCallback(
    (error: unknown): string => {
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        return t(VOICE_ERROR_I18N_KEYS.MIC_NOT_ALLOWED);
      }
      const code = getVoiceErrorCode(error);
      if (code) return t(VOICE_ERROR_I18N_KEYS[code]);
      return t(VOICE_ERROR_I18N_KEYS.VOICE_CONNECTION_FAILED);
    },
    [t],
  );
  const [connectionInfo, setConnectionInfo] = useState<{
    provider: 'azure';
    proxyPort: number;
    configured: boolean;
  } | null>(null);

  const lastTranscriptIdRef = useRef<string | null>(null);

  const {
    isConnected,
    isListening,
    isSpeaking,
    isMuted,
    inputLevel,
    outputLevel,
    connectionState,
    connect,
    disconnect,
    toggleMute,
    sessionId: voiceSessionId,
    sendWebcamResult,
  } = useVoiceSession({
    onWebcamRequest,
    onError: (error) => {
      const message = error instanceof Error ? error.message : String(error);
      if (shouldEscalateVoiceError(error)) {
        logger.error(
          'Voice call error',
          { component: 'UseMaestroVoiceConnection', message },
          error,
        );
      } else {
        logger.info('[UseMaestroVoiceConnection] Voice call unavailable', {
          component: 'UseMaestroVoiceConnection',
          message,
        });
      }
      setConfigError(resolveVoiceError(error));
    },
    onTranscript: (role, text) => {
      const transcriptId = `voice-${role}-${Date.now()}`;
      if (lastTranscriptIdRef.current === text.substring(0, 50)) return;
      lastTranscriptIdRef.current = text.substring(0, 50);

      if (role === 'user' && text.includes('?')) {
        onQuestionAsked();
      }

      onTranscript({
        id: transcriptId,
        role,
        content: text,
        timestamp: new Date(),
        isVoice: true,
      });
    },
  });

  // Fetch voice connection info
  useEffect(() => {
    async function fetchConnectionInfo() {
      try {
        const cached = sessionStorage.getItem('voice-connection-info');
        if (cached) {
          try {
            const data = JSON.parse(cached);
            if (data.provider && data.proxyPort !== undefined) {
              setConnectionInfo(data);
              return;
            }
          } catch {
            sessionStorage.removeItem('voice-connection-info');
          }
        }

        const response = await fetch('/api/realtime/token');
        const data = await response.json();

        if (response.status === 429) {
          logger.warn('Rate limit exceeded for voice token', { retryAfter: data.retryAfter });
          setConfigError(t(VOICE_ERROR_I18N_KEYS.VOICE_RATE_LIMITED));
          return;
        }

        if (data.error) {
          logger.error('Voice API error', { error: data.error });
          setConfigError(t(VOICE_ERROR_I18N_KEYS.VOICE_CONFIG_UNAVAILABLE));
          return;
        }

        sessionStorage.setItem('voice-connection-info', JSON.stringify(data));
        setConnectionInfo(data);
      } catch (error) {
        logger.error('Failed to get voice connection info', { error: String(error) });
        setConfigError(t(VOICE_ERROR_I18N_KEYS.VOICE_CONFIG_UNAVAILABLE));
      }
    }
    fetchConnectionInfo();
  }, [t]);

  // Connect voice when activated
  useEffect(() => {
    if (!isVoiceActive || !connectionInfo || connectionState !== 'idle') return;

    const startVoice = async () => {
      setConfigError(null);
      try {
        // Convert messages to format needed for voice context
        const initialMessages = currentMessages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

        await connect(maestro, { ...connectionInfo, initialMessages });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (shouldEscalateVoiceError(error)) {
          logger.error(
            'Voice connection failed',
            { component: 'UseMaestroVoiceConnection', message },
            error,
          );
        } else {
          logger.info('[UseMaestroVoiceConnection] Voice connection unavailable', {
            component: 'UseMaestroVoiceConnection',
            message,
          });
        }
        setConfigError(resolveVoiceError(error));
        setIsVoiceActive(false);
      }
    };

    startVoice();
  }, [
    isVoiceActive,
    connectionInfo,
    connectionState,
    maestro,
    connect,
    currentMessages,
    resolveVoiceError,
  ]);

  const handleVoiceCall = useCallback(() => {
    if (isVoiceActive) disconnect();
    setIsVoiceActive((prev) => !prev);
  }, [isVoiceActive, disconnect]);

  return {
    isVoiceActive,
    configError,
    isConnected,
    isListening,
    isSpeaking,
    isMuted,
    inputLevel,
    outputLevel,
    connectionState,
    voiceSessionId,
    toggleMute,
    handleVoiceCall,
    setIsVoiceActive,
    disconnect,
    sendWebcamResult,
  };
}

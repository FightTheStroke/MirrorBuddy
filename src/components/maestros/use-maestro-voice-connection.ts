import { useState, useRef, useEffect, useCallback } from 'react';
import { useVoiceSession } from '@/lib/hooks/use-voice-session';
import { logger } from '@/lib/logger';
import type { Maestro, ChatMessage } from '@/types';

interface UseMaestroVoiceConnectionProps {
  maestro: Maestro;
  initialMode: 'voice' | 'chat';
  onTranscript: (message: ChatMessage) => void;
  onQuestionAsked: () => void;
}

export function useMaestroVoiceConnection({
  maestro,
  initialMode,
  onTranscript,
  onQuestionAsked,
}: UseMaestroVoiceConnectionProps) {
  const [isVoiceActive, setIsVoiceActive] = useState(initialMode === 'voice');
  const [configError, setConfigError] = useState<string | null>(null);
  const [connectionInfo, setConnectionInfo] = useState<{ provider: 'azure'; proxyPort: number; configured: boolean } | null>(null);

  const lastTranscriptIdRef = useRef<string | null>(null);

  const {
    isConnected,
    isListening,
    isSpeaking,
    isMuted,
    inputLevel,
    connectionState,
    connect,
    disconnect,
    toggleMute,
    sessionId: voiceSessionId,
  } = useVoiceSession({
    onError: (error) => {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Voice call error', { message });
      setConfigError(message || 'Errore di connessione vocale');
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
          setConfigError('Troppe richieste. Riprova tra qualche secondo.');
          return;
        }

        if (data.error) {
          logger.error('Voice API error', { error: data.error });
          setConfigError(data.message || 'Servizio vocale non configurato');
          return;
        }

        sessionStorage.setItem('voice-connection-info', JSON.stringify(data));
        setConnectionInfo(data);
      } catch (error) {
        logger.error('Failed to get voice connection info', { error: String(error) });
        setConfigError('Impossibile connettersi al servizio vocale');
      }
    }
    fetchConnectionInfo();
  }, []);

  // Connect voice when activated
  useEffect(() => {
    if (!isVoiceActive || !connectionInfo || connectionState !== 'idle') return;

    const startVoice = async () => {
      setConfigError(null);
      try {
        await connect(maestro, connectionInfo);
      } catch (error) {
        logger.error('Voice connection failed', { error: String(error) });
        if (error instanceof DOMException && error.name === 'NotAllowedError') {
          setConfigError('Microfono non autorizzato. Abilita il microfono nelle impostazioni del browser.');
        } else {
          setConfigError('Errore di connessione vocale');
        }
        setIsVoiceActive(false);
      }
    };

    startVoice();
  }, [isVoiceActive, connectionInfo, connectionState, maestro, connect]);

  const handleVoiceCall = useCallback(() => {
    if (isVoiceActive) disconnect();
    setIsVoiceActive(prev => !prev);
  }, [isVoiceActive, disconnect]);

  return {
    isVoiceActive,
    configError,
    isConnected,
    isListening,
    isSpeaking,
    isMuted,
    inputLevel,
    connectionState,
    voiceSessionId,
    toggleMute,
    handleVoiceCall,
    setIsVoiceActive,
    disconnect,
  };
}

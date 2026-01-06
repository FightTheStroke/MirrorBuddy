import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import type { VoiceConnectionInfo } from '../types';

export function useVoiceConnection() {
  const [connectionInfo, setConnectionInfo] = useState<VoiceConnectionInfo | null>(null);
  const [hasCheckedAzure, setHasCheckedAzure] = useState(false);
  const [useWebSpeechFallback, setUseWebSpeechFallback] = useState(false);

  useEffect(() => {
    async function fetchConnectionInfo() {
      try {
        const cached = sessionStorage.getItem('voice-connection-info');
        if (cached) {
          try {
            const data = JSON.parse(cached);
            if (data.provider && data.proxyPort !== undefined) {
              setConnectionInfo(data as VoiceConnectionInfo);
              setHasCheckedAzure(true);
              return;
            }
          } catch {
            sessionStorage.removeItem('voice-connection-info');
          }
        }

        const response = await fetch('/api/realtime/token');
        const data = await response.json();

        if (response.status === 429) {
          logger.warn('[WelcomePage] Rate limit exceeded, using Web Speech fallback');
          setHasCheckedAzure(true);
          setUseWebSpeechFallback(true);
          return;
        }

        if (data.error) {
          logger.warn('[WelcomePage] Voice API not available, using Web Speech fallback');
          setHasCheckedAzure(true);
          setUseWebSpeechFallback(true);
          return;
        }

        sessionStorage.setItem('voice-connection-info', JSON.stringify(data));
        setConnectionInfo(data as VoiceConnectionInfo);
        setHasCheckedAzure(true);
      } catch (error) {
        logger.warn('[WelcomePage] Voice API unavailable, using Web Speech fallback', {
          error: String(error),
        });
        setHasCheckedAzure(true);
        setUseWebSpeechFallback(true);
      }
    }
    fetchConnectionInfo();
  }, []);

  return {
    connectionInfo,
    hasCheckedAzure,
    useWebSpeechFallback,
    setUseWebSpeechFallback,
  };
}


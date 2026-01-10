/**
 * Voice session management logic
 */

import { logger } from '@/lib/logger';
import type { ConnectionInfo } from '@/lib/hooks/use-voice-session';
import type { CharacterInfo } from '../../utils/character-utils';

/**
 * Fetch voice connection info from server
 */
export async function fetchVoiceConnectionInfo(): Promise<{
  connectionInfo: ConnectionInfo | null;
  error: string | null;
}> {
  try {
    const cached = sessionStorage.getItem('voice-connection-info');
    if (cached) {
      try {
        const data = JSON.parse(cached);
        if (data.provider) {
          return { connectionInfo: data as ConnectionInfo, error: null };
        }
      } catch {
        sessionStorage.removeItem('voice-connection-info');
      }
    }

    const response = await fetch('/api/realtime/token');
    const data = await response.json();

    if (response.status === 429) {
      logger.warn('Rate limit exceeded for voice token', { retryAfter: data.retryAfter });
      return {
        connectionInfo: null,
        error: 'Troppe richieste. Riprova tra qualche secondo.',
      };
    }

    if (data.error) {
      logger.error('Voice API error', { error: data.error });
      return {
        connectionInfo: null,
        error: data.message || 'Servizio vocale non configurato',
      };
    }

    sessionStorage.setItem('voice-connection-info', JSON.stringify(data));
    return { connectionInfo: data as ConnectionInfo, error: null };
  } catch (error) {
    logger.error('Failed to get voice connection info', { error: String(error) });
    return {
      connectionInfo: null,
      error: 'Impossibile connettersi al servizio vocale',
    };
  }
}

/**
 * Handle microphone permission errors
 */
export function handleMicrophoneError(error: unknown): string {
  if (error instanceof DOMException && error.name === 'NotAllowedError') {
    return 'Microfono non autorizzato. Abilita il microfono nelle impostazioni del browser.';
  }
  return 'Errore di connessione vocale';
}

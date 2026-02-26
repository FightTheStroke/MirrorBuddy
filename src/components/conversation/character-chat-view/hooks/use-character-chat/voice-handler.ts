/**
 * Voice session management logic
 */

import { logger } from '@/lib/logger';
import type { ConnectionInfo } from '@/lib/hooks/use-voice-session';

/**
 * Fetch voice connection info from server
 */
export async function fetchVoiceConnectionInfo(): Promise<{
  connectionInfo: ConnectionInfo | null;
  error: string | null;
}> {
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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch('/api/realtime/token', { signal: controller.signal });
    clearTimeout(timeout);
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
  } catch (fetchError) {
    clearTimeout(timeout);
    const message =
      fetchError instanceof DOMException && fetchError.name === 'AbortError'
        ? 'Connessione al servizio vocale scaduta. Verifica la connessione internet.'
        : 'Impossibile connettersi al servizio vocale';
    logger.error('Failed to get voice connection info', { error: String(fetchError) });
    return { connectionInfo: null, error: message };
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

// ============================================================================
// ERROR HANDLER
// Azure Realtime API error event parsing
// ============================================================================

import { logger } from '@/lib/logger';
import type { UseVoiceSessionOptions } from './types';

interface ErrorEvent {
  error?: unknown;
}

/**
 * Handle error events from Azure Realtime API
 * Parses various error formats and suppresses benign race conditions
 */
type ErrorDetails = { message?: string; code?: string; type?: string; error?: string };

export function handleErrorEvent(
  event: ErrorEvent,
  options: UseVoiceSessionOptions
): void {
  const errorObj = event.error;

  let errorMessage: string;
  if (typeof errorObj === 'string') {
    errorMessage = errorObj;
  } else if (errorObj && typeof errorObj === 'object') {
    const details = errorObj as ErrorDetails;
    errorMessage = details.message || details.error || details.code || details.type || '';
    if (!errorMessage && Object.keys(errorObj).length > 0) {
      try {
        errorMessage = `Server error: ${JSON.stringify(errorObj)}`;
      } catch {
        errorMessage = 'Unknown server error (unparseable)';
      }
    }
  } else {
    errorMessage = '';
  }

  // Suppress benign race condition errors
  const isCancelRaceCondition = errorMessage.toLowerCase().includes('cancel') &&
    (errorMessage.toLowerCase().includes('no active response') ||
     errorMessage.toLowerCase().includes('not found'));

  if (isCancelRaceCondition) {
    logger.debug('[VoiceSession] Cancel race condition (benign)', { message: errorMessage });
    return;
  }

  if (!errorMessage) {
    errorMessage = 'Errore di connessione al server vocale';
  }

  const hasDetails = errorObj && typeof errorObj === 'object' && Object.keys(errorObj).length > 0;
  if (hasDetails) {
    logger.error('[VoiceSession] Server error', { message: errorMessage, details: errorObj });
  } else {
    logger.warn('[VoiceSession] Server error', { message: errorMessage });
  }
  options.onError?.(new Error(errorMessage));
}

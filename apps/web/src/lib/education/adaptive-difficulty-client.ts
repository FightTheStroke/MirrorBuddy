/**
 * Adaptive Difficulty Client - Browser-side signal detection and submission
 */

import { logger } from '@/lib/logger';
import { csrfFetch } from '@/lib/auth';
import type { AdaptiveSignalInput, AdaptiveSignalSource } from '@/types';

// Patterns handle both accented and non-accented versions
const QUESTION_PATTERN = /\?|perch[eé]|come|quando|dove|spiega|puoi\s+mostrare/i;
const REPEAT_PATTERNS = [
  /non\s+ho\s+capito/i,
  /ripet[ei]/i, // matches ripeti, ripete, ripetere
  /di\s+nuovo/i,
  /puoi\s+spiegare\s+ancora/i,
  /non\s+mi\s+[eè]\s+chiaro/i,
  /non\s+capisco/i,
];
const FRUSTRATION_PATTERNS = [
  /non\s+ce\s+la\s+faccio/i,
  /sono\s+frustrat/i,
  /mi\s+stresso/i,
  /odio/i,
  /non\s+ci\s+riesco/i,
  /[eè]\s+troppo\s+difficile/i,
  /non\s+ne\s+posso\s+pi[uù]/i,
];

export function buildSignalsFromText(
  text: string,
  source: AdaptiveSignalSource,
  subject?: string,
  topic?: string
): AdaptiveSignalInput[] {
  const signals: AdaptiveSignalInput[] = [];
  if (!text) return signals;

  if (QUESTION_PATTERN.test(text)) {
    signals.push({ type: 'question', source, subject, topic });
  }

  if (REPEAT_PATTERNS.some((pattern) => pattern.test(text))) {
    signals.push({ type: 'repeat_request', source, subject, topic });
  }

  if (FRUSTRATION_PATTERNS.some((pattern) => pattern.test(text))) {
    signals.push({ type: 'frustration', source, subject, topic, value: 0.8 });
  }

  return signals;
}

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendAdaptiveSignals(
  signals: AdaptiveSignalInput[],
  options: { retries?: number } = {}
): Promise<boolean> {
  if (signals.length === 0) return true;

  const maxRetries = options.retries ?? MAX_RETRIES;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      const response = await csrfFetch('/api/adaptive/signals', {
        method: 'POST',
        body: JSON.stringify({ signals }),
      });

      if (response.ok) {
        return true;
      }

      // Non-retryable errors (client errors)
      if (response.status >= 400 && response.status < 500) {
        logger.warn('[AdaptiveDifficulty] Signal rejected by server', {
          status: response.status,
          signalCount: signals.length,
        });
        return false;
      }

      // Server error - retry
      logger.debug('[AdaptiveDifficulty] Server error, will retry', {
        status: response.status,
        attempt: attempt + 1,
        maxRetries,
      });
    } catch (error) {
      // Network error - retry
      logger.debug('[AdaptiveDifficulty] Network error, will retry', {
        error: String(error),
        attempt: attempt + 1,
        maxRetries,
      });
    }

    attempt++;
    if (attempt <= maxRetries) {
      await delay(RETRY_DELAY_MS * attempt);
    }
  }

  logger.error('[AdaptiveDifficulty] Failed to send signals after retries', {
    signalCount: signals.length,
    attempts: maxRetries + 1,
  });
  return false;
}

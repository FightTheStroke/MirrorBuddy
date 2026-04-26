/**
 * SSE Reconnection Logic
 * Exponential backoff with jitter for EventSource reconnection
 */

'use client';

import { clientLogger as logger } from '@/lib/logger/client';

/**
 * Calculate delay for next reconnection attempt
 * Uses exponential backoff with jitter
 */
export function calculateReconnectDelay(attemptNumber: number, baseDelayMs: number): number {
  // Exponential backoff: base * 2^attempt + random(0-500ms)
  const exponentialDelay = baseDelayMs * Math.pow(2, attemptNumber - 1);
  const jitter = Math.random() * 500;
  const delay = exponentialDelay + jitter;

  // Cap at 30 seconds
  return Math.min(delay, 30000);
}

/**
 * Check if max reconnect attempts exceeded
 */
export function shouldStopReconnecting(currentAttempt: number, maxAttempts: number): boolean {
  return currentAttempt >= maxAttempts;
}

/**
 * Log reconnection attempt
 */
export function logReconnectionAttempt(attemptNumber: number, delayMs: number): void {
  logger.info('Reconnecting to tool stream', {
    attempt: attemptNumber,
    delayMs: Math.round(delayMs),
  });
}

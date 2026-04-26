/**
 * Session Throttling Service
 * Part of Ethical Design Hardening (F-16)
 *
 * Rate limits jailbreak attempts per session to prevent
 * brute force attacks while remaining child-friendly.
 */

import { logger } from '@/lib/logger';
import {
  SessionThrottleState,
  ThrottleConfig,
  DEFAULT_THROTTLE_CONFIG,
} from './types';

const log = logger.child({ module: 'session-throttling' });

/**
 * In-memory throttle state storage
 */
const throttleStates: Map<string, SessionThrottleState> = new Map();

/**
 * Escalation tracking (repeat offenders)
 */
const escalationCounts: Map<string, number> = new Map();

/**
 * Check if session is currently throttled
 */
export function isThrottled(
  sessionId: string,
  _config: ThrottleConfig = DEFAULT_THROTTLE_CONFIG
): { throttled: boolean; remainingSeconds?: number; message?: string } {
  const sessionHash = hashSessionId(sessionId);
  const state = throttleStates.get(sessionHash);

  if (!state) {
    return { throttled: false };
  }

  // Check if throttle has expired
  if (state.isThrottled && state.throttleEndsAt) {
    const now = new Date();
    if (now >= state.throttleEndsAt) {
      // Throttle expired, reset state
      state.isThrottled = false;
      state.attemptCount = 0;
      state.windowStart = now;
      return { throttled: false };
    }

    const remainingMs = state.throttleEndsAt.getTime() - now.getTime();
    const remainingSeconds = Math.ceil(remainingMs / 1000);

    return {
      throttled: true,
      remainingSeconds,
      message: getThrottleMessage(remainingSeconds),
    };
  }

  return { throttled: false };
}

/**
 * Record a jailbreak attempt and check if should throttle
 */
export function recordAttemptAndCheckThrottle(
  sessionId: string,
  config: ThrottleConfig = DEFAULT_THROTTLE_CONFIG
): {
  shouldThrottle: boolean;
  attemptsRemaining: number;
  message?: string;
} {
  const sessionHash = hashSessionId(sessionId);
  const now = new Date();

  // Get or create state
  let state = throttleStates.get(sessionHash);
  if (!state) {
    state = {
      sessionHash,
      attemptCount: 0,
      windowStart: now,
      isThrottled: false,
    };
    throttleStates.set(sessionHash, state);
  }

  // Check if window has expired
  const windowEnd = new Date(
    state.windowStart.getTime() + config.windowSeconds * 1000
  );
  if (now >= windowEnd) {
    // Reset window
    state.attemptCount = 0;
    state.windowStart = now;
  }

  // Increment attempt count
  state.attemptCount++;

  // Check if should throttle
  if (state.attemptCount >= config.maxAttempts) {
    // Apply throttle with escalation
    const escalation = escalationCounts.get(sessionHash) || 0;
    const multiplier = Math.pow(config.escalationMultiplier, escalation);
    const throttleDuration = config.throttleDurationSeconds * multiplier;

    state.isThrottled = true;
    state.throttleEndsAt = new Date(now.getTime() + throttleDuration * 1000);

    // Increment escalation for next time
    escalationCounts.set(sessionHash, escalation + 1);

    log.warn('Session throttled for jailbreak attempts', {
      sessionHash,
      attemptCount: state.attemptCount,
      throttleDuration,
      escalationLevel: escalation + 1,
    });

    return {
      shouldThrottle: true,
      attemptsRemaining: 0,
      message: getThrottleMessage(Math.ceil(throttleDuration)),
    };
  }

  const attemptsRemaining = config.maxAttempts - state.attemptCount;

  // Warn if getting close to limit
  if (attemptsRemaining === 1) {
    return {
      shouldThrottle: false,
      attemptsRemaining,
      message: getWarningMessage(),
    };
  }

  return {
    shouldThrottle: false,
    attemptsRemaining,
  };
}

/**
 * Clear throttle state for session (admin function)
 */
export function clearThrottleState(sessionId: string): void {
  const sessionHash = hashSessionId(sessionId);
  throttleStates.delete(sessionHash);
  escalationCounts.delete(sessionHash);

  log.info('Throttle state cleared', { sessionHash });
}

/**
 * Get throttle statistics
 */
export function getThrottleStatistics(): {
  activeThrottles: number;
  totalSessions: number;
  averageEscalation: number;
} {
  const now = new Date();
  let activeThrottles = 0;

  for (const state of throttleStates.values()) {
    if (state.isThrottled && state.throttleEndsAt && state.throttleEndsAt > now) {
      activeThrottles++;
    }
  }

  const escalations = Array.from(escalationCounts.values());
  const averageEscalation =
    escalations.length > 0
      ? escalations.reduce((a, b) => a + b, 0) / escalations.length
      : 0;

  return {
    activeThrottles,
    totalSessions: throttleStates.size,
    averageEscalation,
  };
}

/**
 * Cleanup expired states (call periodically)
 */
export function cleanupExpiredStates(): number {
  const now = new Date();
  const expirationThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours
  let cleaned = 0;

  for (const [hash, state] of throttleStates.entries()) {
    if (state.windowStart < expirationThreshold && !state.isThrottled) {
      throttleStates.delete(hash);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    log.debug('Cleaned up expired throttle states', { cleaned });
  }

  return cleaned;
}

// Helper functions
function hashSessionId(sessionId: string): string {
  let hash = 0;
  for (let i = 0; i < sessionId.length; i++) {
    const char = sessionId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `sess_${Math.abs(hash).toString(16)}`;
}

function getThrottleMessage(remainingSeconds: number): string {
  const minutes = Math.ceil(remainingSeconds / 60);

  if (minutes === 1) {
    return 'Devi aspettare un momento prima di continuare. Usa questo tempo per pensare a una domanda di studio!';
  }

  return `Devi aspettare ${minutes} minuti prima di continuare. Prova a fare una pausa e pensa a cosa vorresti studiare!`;
}

function getWarningMessage(): string {
  return 'Sembra che le tue domande non siano relative allo studio. Prova a chiedermi qualcosa sulle materie che stai imparando!';
}

// Set up periodic cleanup
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredStates, 60 * 60 * 1000); // Every hour
}

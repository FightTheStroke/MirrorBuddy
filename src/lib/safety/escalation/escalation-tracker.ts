/**
 * Escalation Tracker - Session-level jailbreak tracking
 * Part of human escalation pathway (F-06)
 */

import { logger } from "@/lib/logger";

const log = logger.child({ module: "escalation-tracker" });

/**
 * In-memory tracking of jailbreak attempts per session
 * Map: sessionId -> count
 */
const jailbreakAttemptsBySession = new Map<string, number>();

/**
 * Jailbreak attempt threshold for escalation
 */
let jailbreakThreshold = 3;

/**
 * Set jailbreak threshold
 */
export function setJailbreakThreshold(threshold: number): void {
  jailbreakThreshold = threshold;
}

/**
 * Track jailbreak attempt for session
 * Returns true if escalation threshold reached
 */
export function trackJailbreakAttempt(sessionId: string): boolean {
  const current = jailbreakAttemptsBySession.get(sessionId) || 0;
  const newCount = current + 1;
  jailbreakAttemptsBySession.set(sessionId, newCount);

  log.debug("Jailbreak attempt tracked", {
    sessionId,
    attemptCount: newCount,
    threshold: jailbreakThreshold,
  });

  const shouldEscalate = newCount >= jailbreakThreshold;
  if (shouldEscalate) {
    log.warn("Jailbreak threshold reached", {
      sessionId,
      attemptCount: newCount,
    });
  }

  return shouldEscalate;
}

/**
 * Get current jailbreak attempt count for session
 */
export function getJailbreakAttemptCount(sessionId: string): number {
  return jailbreakAttemptsBySession.get(sessionId) || 0;
}

/**
 * Clear session jailbreak tracking on session end
 */
export function clearSessionTracking(sessionId: string): void {
  jailbreakAttemptsBySession.delete(sessionId);
  log.debug("Session tracking cleared", { sessionId });
}

/**
 * Clear all tracking (for testing/reset)
 */
export function clearAllTracking(): void {
  jailbreakAttemptsBySession.clear();
  log.debug("All session tracking cleared");
}

/**
 * Get sessions with high jailbreak attempt counts
 */
export function getHighRiskSessions(threshold = 3): string[] {
  return Array.from(jailbreakAttemptsBySession.entries())
    .filter(([, count]) => count >= threshold)
    .map(([sessionId]) => sessionId);
}

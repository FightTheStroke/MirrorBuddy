/**
 * MirrorBuddy Safety Monitoring Module
 * Logs and tracks safety-related events for analysis and compliance
 *
 * This module provides:
 * - Safety event logging
 * - Pattern detection for repeated violations
 * - Aggregated metrics for reporting
 * - Audit trail for compliance
 *
 * Related: #30 Safety Guardrails Issue
 */

export { logSafetyEvent } from './monitoring/logging';
export { getSessionEvents, getEventsByType, getEventsBySeverity, getMetrics } from './monitoring/queries';
export { getSafetyEventsFromDb, getSafetyStatsFromDb, resolveSafetyEvent } from './monitoring/db-queries';
export {
  logInputBlocked,
  logJailbreakAttempt,
  logCrisisDetected,
  logOutputSanitized,
  logHandoffToAdult,
  logAgeGateTriggered,
  shouldTerminateSession,
  clearEventBuffer,
  exportEvents,
  getSummary,
} from './monitoring/helpers';
export type { SafetyEvent, SafetyEventType, EventSeverity, SafetyMetrics } from './monitoring/types';

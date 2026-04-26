/**
 * @module safety/server
 * Server-only safety functionality (requires Prisma/DB access)
 *
 * Re-exports all client-safe exports from ./index, plus server-only exports
 */

// Re-export all client-safe exports
export * from './index';

// Server-only exports - Audit trail (uses Prisma)
export { recordContentFiltered } from './audit/server';

// Server-only exports - DB queries (monitoring)
export {
  getSafetyEventsFromDb,
  getSafetyStatsFromDb,
  resolveSafetyEvent,
} from './monitoring/db-queries';

// Server-only exports - Dependency tracking (uses Prisma)
export { recordSessionStart, recordMessage, runDependencyAnalysis } from './dependency';

// Server-only exports - Escalation service (admin-notifier → @/lib/email → prisma)
export {
  initializeEscalationService,
  escalateCrisisDetected,
  escalateRepeatedJailbreak,
  escalateSevereContentFilter,
  resolveEscalation,
  clearSessionEscalations,
  getEscalationConfig,
  getRecentEscalations,
  getUnresolvedEscalations,
  clearEscalationBuffer,
} from './escalation/escalation-service';

// Server-only exports - Safety event logging
export { logSafetyEvent } from './monitoring/logging';

// Server-only exports - Compliance audit
export { recordComplianceCrisisDetected } from './audit/compliance-audit-service';

// Server-only exports - Parent crisis notification
export { notifyParentOfCrisis } from './escalation/parent-notifier';

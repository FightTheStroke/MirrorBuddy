/**
 * Safety Audit Module - Server-Only Exports
 * IMPORTANT: Uses Prisma and Node.js APIs. Import ONLY in server contexts.
 */

// ========== Audit Trail Service (F-07) ==========
export {
  recordSafetyEvent,
  recordContentFiltered,
  recordGuardrailTriggered,
  recordPromptInjectionAttempt,
  recordSafetyConfigChange,
  getAuditEntries,
  getAuditStatistics,
} from "./audit-trail-service";

// ========== Compliance Audit Service (F-07 - L.132 Art.4) ==========
export {
  recordComplianceEvent,
  recordComplianceContentFiltered,
  recordComplianceCrisisDetected,
  recordComplianceJailbreakAttempt,
  recordComplianceGuardrailTriggered,
  getComplianceEntries,
  getComplianceStatistics,
  exportComplianceAudit,
} from "./compliance-audit-service";

// ========== Durable Compliance Audit Reads (D-07) ==========
// Source of truth for the admin oversight dashboard — in-memory buffers
// reset per serverless instance and must never back API reads.
export {
  persistComplianceEntry,
  getComplianceEntriesFromDb,
  getComplianceStatisticsFromDb,
} from "./compliance-audit-db";

// ========== Knowledge Base Auditor (F-08) ==========
export {
  auditKnowledgeBase,
  auditAllMaestri,
  formatAuditSummary,
} from "./knowledge-auditor";

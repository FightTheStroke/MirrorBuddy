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

// ========== Knowledge Base Auditor (F-08) ==========
export {
  auditKnowledgeBase,
  auditAllMaestri,
  formatAuditSummary,
} from "./knowledge-auditor";

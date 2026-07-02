/**
 * Compliance Audit Statistics - Pure Helpers
 * Part of Ethical Design Hardening (F-07 - L.132 Art.4)
 *
 * Pure functions shared by the in-memory compliance audit service and the
 * durable (database-backed) compliance readers. No I/O, no Prisma imports —
 * safe for both client and server bundles.
 */

import type {
  ComplianceAuditEntry,
  ComplianceAuditStats,
  ComplianceEventType,
  RegulatoryContext,
} from "./compliance-audit-types";

/**
 * Build regulatory context defaults for an event type,
 * optionally overridden by explicit values.
 */
export function buildRegulatoryContext(
  eventType: ComplianceEventType,
  override?: Partial<RegulatoryContext>,
): RegulatoryContext {
  // Default context based on event type
  const defaults: RegulatoryContext = {
    aiAct: true, // All events are AI Act relevant
    gdpr: true, // Data processing compliance
    coppa: false, // Only for child-related events
    italianL132Art4: true, // Italian education compliance
  };

  // Override with specific types that trigger COPPA
  if (eventType === "crisis_detected" || eventType === "content_filtered") {
    defaults.coppa = true;
  }

  return { ...defaults, ...override };
}

/**
 * Compute compliance audit statistics from a set of entries.
 * Entries outside [periodStart, periodEnd] are excluded.
 */
export function computeComplianceStatistics(
  allEntries: ComplianceAuditEntry[],
  periodStart: string,
  periodEnd: string,
): ComplianceAuditStats {
  const entries = allEntries.filter(
    (e) => e.timestamp >= periodStart && e.timestamp <= periodEnd,
  );

  const eventsByType: Record<string, number> = {};
  const eventsBySeverity: Record<string, number> = {};
  const eventsByOutcome: Record<string, number> = {};
  const ageGroupDistribution: Record<string, number> = {};

  let aiActCount = 0;
  let gdprCount = 0;
  let coppaCount = 0;
  let italianL132Count = 0;

  for (const entry of entries) {
    eventsByType[entry.eventType] = (eventsByType[entry.eventType] || 0) + 1;
    eventsBySeverity[entry.severity] =
      (eventsBySeverity[entry.severity] || 0) + 1;
    eventsByOutcome[entry.outcome] = (eventsByOutcome[entry.outcome] || 0) + 1;
    ageGroupDistribution[entry.userContext.ageGroup] =
      (ageGroupDistribution[entry.userContext.ageGroup] || 0) + 1;

    if (entry.regulatoryContext.aiAct) aiActCount++;
    if (entry.regulatoryContext.gdpr) gdprCount++;
    if (entry.regulatoryContext.coppa) coppaCount++;
    if (entry.regulatoryContext.italianL132Art4) italianL132Count++;
  }

  // Count mitigation outcomes
  const blockedCount = entries.filter((e) => e.outcome === "blocked").length;
  const modifiedCount = entries.filter((e) => e.outcome === "modified").length;
  const escalatedCount = entries.filter(
    (e) => e.outcome === "escalated",
  ).length;
  const allowedCount = entries.filter((e) => e.outcome === "allowed").length;
  const monitoredCount = entries.filter(
    (e) => e.outcome === "monitored",
  ).length;

  // Calculate trend
  const periodEndDate = new Date(periodEnd);
  const midpoint = new Date(periodStart);
  midpoint.setTime(
    midpoint.getTime() + (periodEndDate.getTime() - midpoint.getTime()) / 2,
  );
  const firstHalf = entries.filter(
    (e) => new Date(e.timestamp) < midpoint,
  ).length;
  const secondHalf = entries.filter(
    (e) => new Date(e.timestamp) >= midpoint,
  ).length;

  let trendDirection: "increasing" | "decreasing" | "stable" = "stable";
  if (secondHalf > firstHalf * 1.2) {
    trendDirection = "increasing";
  } else if (secondHalf < firstHalf * 0.8) {
    trendDirection = "decreasing";
  }

  const criticalEvents = entries.filter(
    (e) => e.severity === "critical",
  ).length;

  return {
    periodStart,
    periodEnd,
    totalEvents: entries.length,
    eventsByType,
    eventsBySeverity,
    eventsByOutcome,
    regulatoryImpact: {
      aiActEvents: aiActCount,
      gdprEvents: gdprCount,
      coppaEvents: coppaCount,
      italianL132Art4Events: italianL132Count,
    },
    ageGroupDistribution,
    mitigationMetrics: {
      blockedCount,
      modifiedCount,
      escalatedCount,
      allowedCount,
      monitoredCount,
    },
    trendDirection,
    criticalEvents,
  };
}

/**
 * Compliance Audit Service Tests
 * Tests F-07 - Safety events logging per audit compliance (L.132 Art.4)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  recordComplianceEvent,
  recordComplianceContentFiltered,
  recordComplianceCrisisDetected,
  recordComplianceJailbreakAttempt,
  recordComplianceGuardrailTriggered,
  getComplianceEntries,
  getComplianceStatistics,
  exportComplianceAudit,
} from "../compliance-audit-service";
import type {
  ComplianceAuditEntry,
  ComplianceOutcome,
  RegulatoryContext,
} from "../compliance-audit-types";

describe("Compliance Audit Service (F-07)", () => {
  describe("recordComplianceEvent", () => {
    it("should record a compliance event with required fields", () => {
      const entryId = recordComplianceEvent("content_filtered", {
        severity: "medium",
        ageGroup: "teen",
        eventDetails: { reason: "test" },
      });

      expect(entryId).toMatch(/^comp_audit_/);
      expect(entryId.length).toBeGreaterThan(0);
    });

    it("should include timestamp in ISO 8601 format", () => {
      recordComplianceEvent("guardrail_triggered", {
        severity: "medium",
      });

      const entries = getComplianceEntries({ limit: 1 });
      expect(entries.length).toBeGreaterThan(0);

      const entry = entries[0];
      // Validate ISO 8601 format
      expect(new Date(entry.timestamp)).toBeInstanceOf(Date);
      expect(entry.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
    });

    it("should include regulatory context", () => {
      recordComplianceEvent("crisis_detected", {
        severity: "critical",
      });

      const entries = getComplianceEntries({ severity: "critical", limit: 1 });
      const entry = entries[0];

      expect(entry.regulatoryContext).toBeDefined();
      expect(entry.regulatoryContext.aiAct).toBe(true);
      expect(entry.regulatoryContext.gdpr).toBe(true);
      expect(entry.regulatoryContext.italianL132Art4).toBe(true);
    });

    it("should include user context with anonymized session hash", () => {
      recordComplianceEvent("content_filtered", {
        sessionId: "test-session-12345",
        ageGroup: "child",
      });

      const entries = getComplianceEntries({ ageGroup: "child", limit: 1 });
      const entry = entries[0];

      expect(entry.userContext).toBeDefined();
      expect(entry.userContext.ageGroup).toBe("child");
      expect(entry.userContext.sessionHash).toBeDefined();
      expect(entry.userContext.sessionHash).toMatch(/^sess_/);
      expect(entry.userContext.region).toBe("EU");
    });

    it("should include mitigation and outcome fields", () => {
      recordComplianceEvent("content_filtered", {
        mitigationApplied: "content_blocked",
        outcome: "blocked",
      });

      const entries = getComplianceEntries({ limit: 1 });
      const entry = entries[0];

      expect(entry.mitigationApplied).toBe("content_blocked");
      expect(entry.outcome).toBe("blocked");
    });
  });

  describe("Event-specific recording functions", () => {
    it("recordComplianceContentFiltered should set outcome to blocked", () => {
      recordComplianceContentFiltered("profanity", {
        ageGroup: "child",
        confidence: 0.95,
      });

      const entries = getComplianceEntries({
        eventType: "content_filtered",
        limit: 1,
      });
      const entry = entries[0];

      expect(entry.eventType).toBe("content_filtered");
      expect(entry.outcome).toBe("blocked");
      expect(entry.mitigationApplied).toBe("content_blocked");
      expect(entry.confidenceScore).toBe(0.95);
    });

    it("recordComplianceCrisisDetected should set severity to critical and outcome to escalated", () => {
      recordComplianceCrisisDetected("self_harm", {
        ageGroup: "teen",
      });

      const entries = getComplianceEntries({
        eventType: "crisis_detected",
        limit: 1,
      });
      const entry = entries[0];

      expect(entry.eventType).toBe("crisis_detected");
      expect(entry.severity).toBe("critical");
      expect(entry.outcome).toBe("escalated");
      expect(entry.mitigationApplied).toBe("escalated_to_human");
      expect(entry.regulatoryContext.coppa).toBe(true);
    });

    it("recordComplianceJailbreakAttempt should set severity to high", () => {
      recordComplianceJailbreakAttempt({
        pattern: "roleplay",
        confidence: 0.85,
      });

      const entries = getComplianceEntries({
        eventType: "jailbreak_attempt",
        limit: 1,
      });
      const entry = entries[0];

      expect(entry.eventType).toBe("jailbreak_attempt");
      expect(entry.severity).toBe("high");
      expect(entry.outcome).toBe("blocked");
    });

    it("recordComplianceGuardrailTriggered should set outcome to modified", () => {
      recordComplianceGuardrailTriggered("bias-check-v1", {
        confidence: 0.72,
      });

      const entries = getComplianceEntries({
        eventType: "guardrail_triggered",
        limit: 1,
      });
      const entry = entries[0];

      expect(entry.eventType).toBe("guardrail_triggered");
      expect(entry.severity).toBe("medium");
      expect(entry.outcome).toBe("modified");
      expect(entry.mitigationApplied).toBe("content_modified");
    });
  });

  describe("getComplianceEntries", () => {
    beforeEach(() => {
      // Record various events for filtering tests
      recordComplianceEvent("content_filtered", {
        severity: "medium",
        ageGroup: "child",
      });
      recordComplianceEvent("crisis_detected", {
        severity: "critical",
        ageGroup: "teen",
      });
      recordComplianceEvent("jailbreak_attempt", {
        severity: "high",
        ageGroup: "adult",
      });
    });

    it("should filter by event type", () => {
      const entries = getComplianceEntries({
        eventType: "content_filtered",
      });

      expect(entries.length).toBeGreaterThan(0);
      expect(entries.every((e) => e.eventType === "content_filtered")).toBe(
        true,
      );
    });

    it("should filter by severity", () => {
      const criticalEntries = getComplianceEntries({ severity: "critical" });

      expect(criticalEntries.length).toBeGreaterThan(0);
      expect(criticalEntries.every((e) => e.severity === "critical")).toBe(
        true,
      );
    });

    it("should filter by age group", () => {
      const childEntries = getComplianceEntries({ ageGroup: "child" });

      expect(childEntries.length).toBeGreaterThan(0);
      expect(
        childEntries.every((e) => e.userContext.ageGroup === "child"),
      ).toBe(true);
    });

    it("should filter by outcome", () => {
      const blockedEntries = getComplianceEntries({ outcome: "blocked" });

      expect(blockedEntries.length).toBeGreaterThan(0);
      expect(blockedEntries.every((e) => e.outcome === "blocked")).toBe(true);
    });

    it("should sort by timestamp descending", () => {
      const entries = getComplianceEntries({});

      for (let i = 0; i < entries.length - 1; i++) {
        const current = new Date(entries[i].timestamp).getTime();
        const next = new Date(entries[i + 1].timestamp).getTime();
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });

    it("should respect limit parameter", () => {
      const limited = getComplianceEntries({ limit: 2 });

      expect(limited.length).toBeLessThanOrEqual(2);
    });
  });

  describe("getComplianceStatistics", () => {
    beforeEach(() => {
      // Record various events for statistics
      for (let i = 0; i < 3; i++) {
        recordComplianceContentFiltered("test-filter", {
          ageGroup: "child",
        });
      }
      for (let i = 0; i < 2; i++) {
        recordComplianceJailbreakAttempt({ ageGroup: "teen" });
      }
      recordComplianceCrisisDetected("test-crisis", { ageGroup: "adult" });
    });

    it("should calculate correct total events", () => {
      const stats = getComplianceStatistics(30);

      expect(stats.totalEvents).toBeGreaterThanOrEqual(6);
    });

    it("should count events by type", () => {
      const stats = getComplianceStatistics(30);

      expect(stats.eventsByType["content_filtered"]).toBeGreaterThanOrEqual(3);
      expect(stats.eventsByType["jailbreak_attempt"]).toBeGreaterThanOrEqual(2);
      expect(stats.eventsByType["crisis_detected"]).toBeGreaterThanOrEqual(1);
    });

    it("should count events by severity", () => {
      const stats = getComplianceStatistics(30);

      expect(stats.eventsBySeverity["critical"]).toBeGreaterThanOrEqual(1);
      expect(stats.eventsBySeverity["high"]).toBeGreaterThanOrEqual(2);
      expect(stats.eventsBySeverity["medium"]).toBeGreaterThanOrEqual(3);
    });

    it("should track regulatory framework impact", () => {
      const stats = getComplianceStatistics(30);

      expect(stats.regulatoryImpact.aiActEvents).toBeGreaterThan(0);
      expect(stats.regulatoryImpact.gdprEvents).toBeGreaterThan(0);
      expect(stats.regulatoryImpact.italianL132Art4Events).toBeGreaterThan(0);
    });

    it("should count age group distribution", () => {
      const stats = getComplianceStatistics(30);

      expect(stats.ageGroupDistribution["child"]).toBeGreaterThanOrEqual(3);
      expect(stats.ageGroupDistribution["teen"]).toBeGreaterThanOrEqual(2);
      expect(stats.ageGroupDistribution["adult"]).toBeGreaterThanOrEqual(1);
    });

    it("should calculate mitigation metrics", () => {
      const stats = getComplianceStatistics(30);

      expect(stats.mitigationMetrics.blockedCount).toBeGreaterThanOrEqual(5);
      expect(stats.mitigationMetrics.escalatedCount).toBeGreaterThanOrEqual(1);
      expect(stats.mitigationMetrics.modifiedCount).toBeGreaterThanOrEqual(0);
    });

    it("should include trend direction", () => {
      const stats = getComplianceStatistics(30);

      expect(["increasing", "decreasing", "stable"]).toContain(
        stats.trendDirection,
      );
    });

    it("should count critical events", () => {
      const stats = getComplianceStatistics(30);

      expect(stats.criticalEvents).toBeGreaterThanOrEqual(1);
    });
  });

  describe("exportComplianceAudit", () => {
    beforeEach(() => {
      recordComplianceContentFiltered("test", { ageGroup: "child" });
      recordComplianceCrisisDetected("test-crisis");
    });

    it("should export compliance audit with metadata", () => {
      const now = new Date();
      const periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      const periodEnd = now.toISOString().split("T")[0];

      const exportData = exportComplianceAudit(periodStart, periodEnd, "admin");

      expect(exportData.metadata).toBeDefined();
      expect(exportData.metadata.exportedBy).toMatch(/^\*{3}$/);
      expect(exportData.metadata.periodStart).toBe(periodStart);
      expect(exportData.metadata.periodEnd).toBe(periodEnd);
    });

    it("should include statistics in export", () => {
      const now = new Date();
      const periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      const periodEnd = now.toISOString().split("T")[0];

      const exportData = exportComplianceAudit(periodStart, periodEnd, "admin");

      expect(exportData.statistics).toBeDefined();
      expect(exportData.statistics.totalEvents).toBeGreaterThanOrEqual(2);
    });

    it("should include audit entries in export", () => {
      const now = new Date();
      const periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      const periodEnd = now.toISOString().split("T")[0];

      const exportData = exportComplianceAudit(periodStart, periodEnd, "admin");

      expect(exportData.entries).toBeDefined();
      expect(Array.isArray(exportData.entries)).toBe(true);
    });

    it("should include summary in export", () => {
      const now = new Date();
      const periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      const periodEnd = now.toISOString().split("T")[0];

      const exportData = exportComplianceAudit(periodStart, periodEnd, "admin");

      expect(exportData.summary).toBeDefined();
      expect(exportData.summary).toContain("Compliance Audit Summary");
      expect(exportData.summary).toContain("Regulatory Framework Impact");
    });
  });

  describe("GDPR Compliance", () => {
    it("should anonymize user identifiers", () => {
      recordComplianceEvent("content_filtered", {
        eventDetails: {
          userId: "user-very-long-id-12345",
        },
      });

      const entries = getComplianceEntries({ limit: 1 });
      const entry = entries[0];

      // User details should not leak into event details
      expect(JSON.stringify(entry)).not.toContain("user-very-long");
    });

    it("should generate unique session hashes per event", () => {
      recordComplianceEvent("content_filtered", {
        sessionId: "same-session",
      });
      recordComplianceEvent("guardrail_triggered", {
        sessionId: "same-session",
      });

      const entries = getComplianceEntries({ limit: 2 });

      // Same session ID should produce same hash
      if (entries.length >= 2) {
        expect(entries[0].userContext.sessionHash).toBe(
          entries[1].userContext.sessionHash,
        );
      }
    });
  });

  describe("Regulatory Context Mapping", () => {
    it("should mark crisis detection as all regulatory frameworks", () => {
      recordComplianceCrisisDetected("test");

      const entries = getComplianceEntries({
        eventType: "crisis_detected",
        limit: 1,
      });
      const entry = entries[0];

      expect(entry.regulatoryContext.aiAct).toBe(true);
      expect(entry.regulatoryContext.gdpr).toBe(true);
      expect(entry.regulatoryContext.coppa).toBe(true);
      expect(entry.regulatoryContext.italianL132Art4).toBe(true);
    });

    it("should mark jailbreak attempt as AI Act relevant", () => {
      recordComplianceJailbreakAttempt();

      const entries = getComplianceEntries({
        eventType: "jailbreak_attempt",
        limit: 1,
      });
      const entry = entries[0];

      expect(entry.regulatoryContext.aiAct).toBe(true);
      expect(entry.regulatoryContext.gdpr).toBe(true);
      expect(entry.regulatoryContext.italianL132Art4).toBe(true);
    });
  });
});

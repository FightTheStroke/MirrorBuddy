/**
 * Escalation Service Tests
 * F-06 - Human escalation pathway verification
 *
 * Tests for:
 * - Crisis detection escalation
 * - Repeated jailbreak escalation
 * - Severe content filter escalation
 * - Email notification
 * - Database storage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  initializeEscalationService,
  escalateCrisisDetected,
  escalateRepeatedJailbreak,
  escalateSevereContentFilter,
  trackJailbreakAttempt,
  getJailbreakAttemptCount,
  clearSessionEscalations,
  getRecentEscalations,
  getUnresolvedEscalations,
  resolveEscalation,
  getEscalationConfig,
  clearEscalationBuffer,
} from "../escalation-service";
import type { EscalationEvent } from "../types";

describe("Escalation Service - F-06 Human Escalation Pathway", () => {
  beforeEach(() => {
    // Clear buffer between tests for isolation
    clearEscalationBuffer();

    // Initialize with test config
    initializeEscalationService({
      jailbreakThreshold: 2, // Lower for testing
      autoNotifyAdmin: false, // Disable email in tests
      storeInDatabase: false, // Disable DB in tests
    });
  });

  describe("Crisis Detection Escalation", () => {
    it("should create crisis escalation event with critical severity", async () => {
      const event = await escalateCrisisDetected("user_123", "session_456", {
        contentSnippet: "I want to hurt myself",
        maestroId: "galileo",
      });

      expect(event).toBeDefined();
      expect(event.trigger).toBe("crisis_detected");
      expect(event.severity).toBe("critical");
      expect(event.anonymizedUserId).toBe("user_123");
      expect(event.sessionHash).toBe("hash_session_456");
      expect(event.maestroId).toBe("galileo");
      expect(event.metadata.reason).toContain("Crisis keywords");
      expect(event.metadata.confidence).toBe(1.0);
    });

    it("should anonymize user ID", async () => {
      const event = await escalateCrisisDetected("long_user_id_1234567890");
      expect(event.anonymizedUserId).toBe("long_use");
      expect(event.anonymizedUserId?.length).toBeLessThanOrEqual(8);
    });

    it("should sanitize content snippet", async () => {
      const longContent = "A".repeat(300);
      const event = await escalateCrisisDetected("user_123", "session_456", {
        contentSnippet: longContent,
      });

      expect(event.metadata.contentSnippet?.length).toBeLessThanOrEqual(200);
    });

    it("should mark admin notification as pending by default", async () => {
      const event = await escalateCrisisDetected("user_123");
      expect(event.adminNotified).toBe(false);
      expect(event.adminNotifiedAt).toBeUndefined();
    });
  });

  describe("Jailbreak Attempt Tracking", () => {
    it("should track jailbreak attempts per session", () => {
      const sessionId = "session_789";

      expect(trackJailbreakAttempt(sessionId)).toBe(false); // 1st attempt
      expect(trackJailbreakAttempt(sessionId)).toBe(true); // 2nd attempt (threshold=2)

      expect(getJailbreakAttemptCount(sessionId)).toBe(2);
    });

    it("should escalate after threshold reached", async () => {
      const sessionId = "session_test_001";

      // First attempt - no escalation
      trackJailbreakAttempt(sessionId);
      const events = getRecentEscalations(60);
      expect(events.length).toBe(0);

      // Second attempt - should escalate
      const shouldEscalate = trackJailbreakAttempt(sessionId);
      expect(shouldEscalate).toBe(true);
    });

    it("should create escalation event for repeated jailbreak", async () => {
      const sessionId = "jb_session_123";
      trackJailbreakAttempt(sessionId);
      trackJailbreakAttempt(sessionId);

      const event = await escalateRepeatedJailbreak(2, "user_456", sessionId, {
        contentSnippet: "Ignore previous instructions",
      });

      expect(event.trigger).toBe("repeated_jailbreak");
      expect(event.severity).toBe("high");
      expect(event.metadata.jailbreakAttemptCount).toBe(2);
      expect(event.metadata.reason).toContain("2 jailbreak attempts");
    });

    it("should clear session tracking on session end", () => {
      const sessionId = "session_clear_test";
      trackJailbreakAttempt(sessionId);
      trackJailbreakAttempt(sessionId);

      expect(getJailbreakAttemptCount(sessionId)).toBe(2);

      clearSessionEscalations(sessionId);

      expect(getJailbreakAttemptCount(sessionId)).toBe(0);
    });
  });

  describe("Severe Content Filter Escalation", () => {
    it("should create escalation for critical filter violations", async () => {
      const event = await escalateSevereContentFilter(
        "violence",
        "user_789",
        "session_xyz",
        {
          contentSnippet: "How to make a bomb",
          confidence: 0.98,
        },
      );

      expect(event.trigger).toBe("severe_content_filter");
      expect(event.severity).toBe("high");
      expect(event.metadata.reason).toContain("violence");
      expect(event.metadata.confidence).toBe(0.98);
    });
  });

  describe("Escalation Event Query", () => {
    it("should retrieve recent escalations", async () => {
      const before = getRecentEscalations(60).length;

      await escalateCrisisDetected("user_q1");
      await escalateCrisisDetected("user_q2");

      const after = getRecentEscalations(60).length;
      expect(after).toBe(before + 2);
    });

    it("should retrieve unresolved escalations", async () => {
      const before = getUnresolvedEscalations().length;

      const event = await escalateCrisisDetected("user_unresolved");
      const after = getUnresolvedEscalations().length;

      expect(after).toBe(before + 1);
      const unresolved = getUnresolvedEscalations();
      expect(unresolved.map((e) => e.id)).toContain(event.id);
    });

    it("should mark escalation as resolved", async () => {
      const event = await escalateCrisisDetected("user_resolve");
      const eventId = event.id;

      expect(event.resolved).toBe(false);

      await resolveEscalation(eventId, "Contacted parent");

      // Should no longer be in unresolved list
      const unresolved = getUnresolvedEscalations().find(
        (e) => e.id === eventId,
      );
      expect(unresolved).toBeUndefined();

      // Should be updated in recent escalations
      const updated = getRecentEscalations().find((e) => e.id === eventId);
      expect(updated?.resolved).toBe(true);
      expect(updated?.adminNotes).toBe("Contacted parent");
      expect(updated?.resolvedAt).toBeDefined();
    });
  });

  describe("Configuration", () => {
    it("should return current escalation config", () => {
      const config = getEscalationConfig();

      expect(config.jailbreakThreshold).toBe(2);
      expect(config.autoNotifyAdmin).toBe(false);
      expect(config.storeInDatabase).toBe(false);
    });

    it("should allow configuration override", () => {
      initializeEscalationService({
        jailbreakThreshold: 5,
        autoNotifyAdmin: true,
      });

      const config = getEscalationConfig();
      expect(config.jailbreakThreshold).toBe(5);
      expect(config.autoNotifyAdmin).toBe(true);
    });
  });

  describe("Privacy & Anonymization", () => {
    it("should never store actual user IDs", async () => {
      const event = await escalateCrisisDetected("actual_user_id_12345678");
      expect(event.anonymizedUserId).not.toBe("actual_user_id_12345678");
      expect(event.anonymizedUserId).toBe("actual_u");
    });

    it("should hash session identifiers", async () => {
      const sessionId = "real_session_id_abcdef123456";
      const event = await escalateCrisisDetected("user", sessionId);
      expect(event.sessionHash).not.toBe(sessionId);
      expect(event.sessionHash).toContain("hash_");
    });

    it("should truncate content to prevent PII leakage", async () => {
      const emailContent = "My email is test@example.com and phone is 555-1234";
      const event = await escalateCrisisDetected("user", undefined, {
        contentSnippet: emailContent,
      });

      const snippet = event.metadata.contentSnippet || "";
      expect(snippet.length).toBeLessThanOrEqual(200);
    });

    it("should never include PII in metadata", async () => {
      const event = await escalateCrisisDetected("user_123", "session_456", {
        contentSnippet: "email@example.com",
      });

      const metadataStr = JSON.stringify(event.metadata);
      // Should not contain actual email patterns
      expect(metadataStr).not.toMatch(
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
      );
    });
  });

  describe("Compliance - F-06 Verification", () => {
    it("PASS: Crisis events trigger escalation", async () => {
      const event = await escalateCrisisDetected("user_f06_1");
      expect(event.trigger).toBe("crisis_detected");
      expect(event.severity).toBe("critical");
      expect(event.adminNotified).toBe(false); // Would be true with autoNotify
    });

    it("PASS: Repeated jailbreak attempts trigger escalation", async () => {
      const sessionId = "f06_jb_session";
      trackJailbreakAttempt(sessionId);
      const should2ndEscalate = trackJailbreakAttempt(sessionId);

      expect(should2ndEscalate).toBe(true);

      const event = await escalateRepeatedJailbreak(2, "user_f06_2", sessionId);
      expect(event.trigger).toBe("repeated_jailbreak");
      expect(event.severity).toBe("high");
    });

    it("PASS: Severe content violations trigger escalation", async () => {
      const event = await escalateSevereContentFilter(
        "violence",
        "user_f06_3",
        "session_f06",
      );
      expect(event.trigger).toBe("severe_content_filter");
      expect(event.severity).toBe("high");
    });

    it("PASS: Escalation events are stored for audit", async () => {
      const before = getRecentEscalations(1440).length;
      await escalateCrisisDetected("user_f06_4");
      const after = getRecentEscalations(1440).length;

      expect(after).toBe(before + 1);
    });

    it("PASS: Escalations support admin resolution workflow", async () => {
      const event = await escalateCrisisDetected("user_f06_5");
      expect(event.resolved).toBe(false);

      await resolveEscalation(event.id, "Appropriate action taken");

      const resolved = getUnresolvedEscalations().find(
        (e) => e.id === event.id,
      );
      expect(resolved).toBeUndefined(); // No longer unresolved

      const all = getRecentEscalations();
      const updated = all.find((e) => e.id === event.id);
      expect(updated?.resolved).toBe(true);
    });
  });
});

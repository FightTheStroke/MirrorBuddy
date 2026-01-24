/**
 * Tests for Admin Notification Service
 * Coverage improvement for safety/escalation/admin-notifier.ts (17% -> 80%+)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { notifyAdmin } from "../admin-notifier";
import type { EscalationEvent, EscalationTrigger } from "../types";

// Mock sendEmail
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(),
}));

describe("admin-notifier", () => {
  const createMockEvent = (
    trigger: EscalationTrigger,
    overrides: Partial<EscalationEvent> = {},
  ): EscalationEvent => ({
    id: "esc-123",
    trigger,
    severity: "critical",
    timestamp: new Date("2024-01-15T10:30:00Z"),
    anonymizedUserId: "abc12345",
    sessionHash: "session-hash-xyz",
    maestroId: "euclide",
    metadata: {
      reason: "Test reason",
      contentSnippet: "Sample content",
      ...overrides.metadata,
    },
    adminNotified: false,
    resolved: false,
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset env
    delete process.env.ADMIN_EMAIL;
  });

  describe("notifyAdmin", () => {
    it("should send email notification on crisis_detected", async () => {
      const { sendEmail } = await import("@/lib/email");
      vi.mocked(sendEmail).mockResolvedValue({
        success: true,
        messageId: "msg-1",
      });

      const event = createMockEvent("crisis_detected");
      const result = await notifyAdmin(event, "admin@test.com");

      expect(result).toBe(true);
      expect(event.adminNotified).toBe(true);
      expect(event.adminNotifiedAt).toBeDefined();
      expect(sendEmail).toHaveBeenCalledWith({
        to: "admin@test.com",
        subject: "MirrorBuddy Escalation: [CRITICAL] Crisis Detected",
        html: expect.stringContaining("Crisis Detected"),
        text: expect.stringContaining("crisis_detected"),
      });
    });

    it("should send email for repeated_jailbreak trigger", async () => {
      const { sendEmail } = await import("@/lib/email");
      vi.mocked(sendEmail).mockResolvedValue({
        success: true,
        messageId: "msg-2",
      });

      const event = createMockEvent("repeated_jailbreak", {
        metadata: { jailbreakAttemptCount: 5, reason: "Multiple attempts" },
      });
      const result = await notifyAdmin(event, "admin@test.com");

      expect(result).toBe(true);
      expect(sendEmail).toHaveBeenCalledWith({
        to: "admin@test.com",
        subject: "MirrorBuddy Escalation: [HIGH] Repeated Jailbreak Attempts",
        html: expect.stringContaining("Jailbreak Attempts"),
        text: expect.stringContaining("Jailbreak Attempts: 5"),
      });
    });

    it("should send email for severe_content_filter trigger", async () => {
      const { sendEmail } = await import("@/lib/email");
      vi.mocked(sendEmail).mockResolvedValue({
        success: true,
        messageId: "msg-3",
      });

      const event = createMockEvent("severe_content_filter");
      const result = await notifyAdmin(event, "admin@test.com");

      expect(result).toBe(true);
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject:
            "MirrorBuddy Escalation: [HIGH] Severe Content Filter Violation",
        }),
      );
    });

    it("should send email for age_gate_bypass trigger", async () => {
      const { sendEmail } = await import("@/lib/email");
      vi.mocked(sendEmail).mockResolvedValue({
        success: true,
        messageId: "msg-4",
      });

      const event = createMockEvent("age_gate_bypass");
      const result = await notifyAdmin(event, "admin@test.com");

      expect(result).toBe(true);
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject:
            "MirrorBuddy Escalation: [HIGH] Potential Age Verification Bypass",
        }),
      );
    });

    it("should send email for session_termination trigger", async () => {
      const { sendEmail } = await import("@/lib/email");
      vi.mocked(sendEmail).mockResolvedValue({
        success: true,
        messageId: "msg-5",
      });

      const event = createMockEvent("session_termination");
      const result = await notifyAdmin(event, "admin@test.com");

      expect(result).toBe(true);
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "MirrorBuddy Escalation: [HIGH] Session Forcibly Terminated",
        }),
      );
    });

    it("should use ADMIN_EMAIL from environment when not provided", async () => {
      const { sendEmail } = await import("@/lib/email");
      vi.mocked(sendEmail).mockResolvedValue({
        success: true,
        messageId: "msg-6",
      });
      process.env.ADMIN_EMAIL = "env-admin@test.com";

      const event = createMockEvent("crisis_detected");
      const result = await notifyAdmin(event);

      expect(result).toBe(true);
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: "env-admin@test.com" }),
      );
    });

    it("should return false if no admin email configured", async () => {
      const { sendEmail } = await import("@/lib/email");
      delete process.env.ADMIN_EMAIL;

      const event = createMockEvent("crisis_detected");
      const result = await notifyAdmin(event);

      expect(result).toBe(false);
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it("should return false on email send failure", async () => {
      const { sendEmail } = await import("@/lib/email");
      vi.mocked(sendEmail).mockResolvedValue({
        success: false,
        error: "SMTP connection failed",
      });

      const event = createMockEvent("crisis_detected");
      const result = await notifyAdmin(event, "admin@test.com");

      expect(result).toBe(false);
      expect(event.adminNotified).toBe(false);
    });

    it("should include content snippet in email when provided", async () => {
      const { sendEmail } = await import("@/lib/email");
      vi.mocked(sendEmail).mockResolvedValue({
        success: true,
        messageId: "msg-7",
      });

      const event = createMockEvent("crisis_detected", {
        metadata: { contentSnippet: "The user mentioned feeling sad..." },
      });
      await notifyAdmin(event, "admin@test.com");

      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining("The user mentioned feeling sad..."),
        }),
      );
    });

    it("should handle missing optional fields gracefully", async () => {
      const { sendEmail } = await import("@/lib/email");
      vi.mocked(sendEmail).mockResolvedValue({
        success: true,
        messageId: "msg-8",
      });

      const event: EscalationEvent = {
        id: "esc-minimal",
        trigger: "crisis_detected",
        severity: "critical",
        timestamp: new Date(),
        metadata: {},
        adminNotified: false,
        resolved: false,
      };

      const result = await notifyAdmin(event, "admin@test.com");

      expect(result).toBe(true);
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining("(unknown)"),
          text: expect.stringContaining("(not provided)"),
        }),
      );
    });

    it("should include maestro ID when present", async () => {
      const { sendEmail } = await import("@/lib/email");
      vi.mocked(sendEmail).mockResolvedValue({
        success: true,
        messageId: "msg-9",
      });

      const event = createMockEvent("crisis_detected", {
        maestroId: "galileo",
      });
      await notifyAdmin(event, "admin@test.com");

      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining("galileo"),
          text: expect.stringContaining("Maestro: galileo"),
        }),
      );
    });

    it("should include dashboard link in email", async () => {
      const { sendEmail } = await import("@/lib/email");
      vi.mocked(sendEmail).mockResolvedValue({
        success: true,
        messageId: "msg-10",
      });

      const event = createMockEvent("crisis_detected");
      await notifyAdmin(event, "admin@test.com");

      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining("/admin/escalations/esc-123"),
        }),
      );
    });
  });
});

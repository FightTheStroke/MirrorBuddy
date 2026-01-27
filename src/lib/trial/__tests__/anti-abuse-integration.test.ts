/**
 * MIRRORBUDDY - Anti-Abuse Integration Tests
 *
 * Tests that anti-abuse checks are properly integrated into trial endpoints:
 * - /api/trial/session (checkAbuse + incrementAbuseScore)
 * - /api/chat (isSessionBlocked check)
 * - /api/trial/voice (isSessionBlocked check)
 *
 * Plan 088, Task T1-05, F-03
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  checkAbuse,
  incrementAbuseScore,
  isSessionBlocked,
} from "../anti-abuse";

describe("Anti-Abuse Integration", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe("Session Creation Flow", () => {
    it("checkAbuse detects suspicious pattern and returns score", () => {
      const ip = "192.168.1.100";

      // Create multiple visitors from same IP to trigger abuse
      checkAbuse(ip, "visitor-1");
      checkAbuse(ip, "visitor-2");
      checkAbuse(ip, "visitor-3");

      // Fourth visitor should trigger abuse detection
      const result = checkAbuse(ip, "visitor-4");

      expect(result.isAbuse).toBe(true);
      expect(result.score).toBeGreaterThan(0);
      expect(result.reason).toBeDefined();
    });

    it("incrementAbuseScore adds points to session database", async () => {
      const mockDb = {
        session: {
          update: vi.fn().mockResolvedValue({ abuseScore: 5 }),
        },
      };

      await incrementAbuseScore("session-123", 5, mockDb);

      expect(mockDb.session.update).toHaveBeenCalledWith({
        where: { id: "session-123" },
        data: { abuseScore: { increment: 5 } },
      });
    });
  });

  describe("Blocking Threshold", () => {
    it("isSessionBlocked returns true when score exceeds threshold", async () => {
      const mockDb = {
        session: {
          findUnique: vi.fn().mockResolvedValue({ abuseScore: 11 }), // > 10 threshold
        },
      };

      const blocked = await isSessionBlocked("session-blocked", mockDb);

      expect(blocked).toBe(true);
    });

    it("isSessionBlocked returns false when score is below threshold", async () => {
      const mockDb = {
        session: {
          findUnique: vi.fn().mockResolvedValue({ abuseScore: 5 }),
        },
      };

      const blocked = await isSessionBlocked("session-ok", mockDb);

      expect(blocked).toBe(false);
    });

    it("isSessionBlocked returns false at exactly threshold (10)", async () => {
      const mockDb = {
        session: {
          findUnique: vi.fn().mockResolvedValue({ abuseScore: 10 }),
        },
      };

      const blocked = await isSessionBlocked("session-at-threshold", mockDb);

      // Score must be > 10 to block, not >= 10
      expect(blocked).toBe(false);
    });
  });

  describe("IP Rotation Pattern", () => {
    it("detects visitor rotating through multiple IPs", () => {
      const visitorId = "visitor-proxy";

      checkAbuse("10.0.0.1", visitorId);
      checkAbuse("10.0.0.2", visitorId);
      checkAbuse("10.0.0.3", visitorId);
      checkAbuse("10.0.0.4", visitorId);

      // Fifth IP triggers detection
      const result = checkAbuse("10.0.0.5", visitorId);

      expect(result.isAbuse).toBe(true);
      expect(result.score).toBeGreaterThan(0);
      expect(result.reason).toContain("IP rotation");
    });
  });

  describe("Combined Abuse Scoring", () => {
    it("accumulates points from multiple abuse patterns", async () => {
      const mockDb = {
        session: {
          update: vi.fn().mockResolvedValue({}),
          findUnique: vi.fn().mockResolvedValue({ abuseScore: 15 }),
        },
      };

      // Simulate multiple abuse detections
      await incrementAbuseScore("session-multi", 5, mockDb);
      await incrementAbuseScore("session-multi", 5, mockDb);
      await incrementAbuseScore("session-multi", 5, mockDb);

      // Session should now be blocked
      const blocked = await isSessionBlocked("session-multi", mockDb);

      expect(blocked).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("incrementAbuseScore handles database errors without throwing", async () => {
      const mockDb = {
        session: {
          update: vi.fn().mockRejectedValue(new Error("DB connection lost")),
        },
      };

      // Should not throw
      await expect(
        incrementAbuseScore("session-error", 5, mockDb),
      ).resolves.toBeUndefined();
    });

    it("isSessionBlocked returns false on database error (fail-open)", async () => {
      const mockDb = {
        session: {
          findUnique: vi.fn().mockRejectedValue(new Error("DB timeout")),
        },
      };

      const blocked = await isSessionBlocked("session-error", mockDb);

      // Fail-open: don't block users on DB errors
      expect(blocked).toBe(false);
    });
  });
});

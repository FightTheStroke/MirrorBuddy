/**
 * MIRRORBUDDY - Anti-Abuse Tests
 *
 * Unit tests for abuse detection:
 * - checkAbuse (multiple visitors per IP, IP rotation)
 * - incrementAbuseScore
 * - isSessionBlocked
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  checkAbuse,
  incrementAbuseScore,
  isSessionBlocked,
  ABUSE_THRESHOLD,
} from "../anti-abuse";

// Reset module state between tests
beforeEach(() => {
  vi.resetModules();
});

describe("Anti-Abuse", () => {
  describe("checkAbuse", () => {
    it("returns no abuse for first visitor from IP", async () => {
      // Dynamic import to reset module state
      const { checkAbuse } = await import("../anti-abuse");
      const result = checkAbuse("192.168.1.100", "visitor-first");

      expect(result.isAbuse).toBe(false);
      expect(result.score).toBe(0);
      expect(result.reason).toBeUndefined();
    });

    it("returns no abuse for second visitor from same IP", async () => {
      const { checkAbuse } = await import("../anti-abuse");
      checkAbuse("192.168.1.101", "visitor-1");
      const result = checkAbuse("192.168.1.101", "visitor-2");

      expect(result.isAbuse).toBe(false);
      expect(result.score).toBe(0);
    });

    it("detects abuse when 3+ visitors from same IP", async () => {
      const { checkAbuse } = await import("../anti-abuse");
      const ip = "192.168.1.102";

      checkAbuse(ip, "visitor-a");
      checkAbuse(ip, "visitor-b");
      checkAbuse(ip, "visitor-c");

      // Fourth visitor triggers abuse detection
      const result = checkAbuse(ip, "visitor-d");

      expect(result.isAbuse).toBe(true);
      expect(result.score).toBeGreaterThan(0);
      expect(result.reason).toContain("Multiple visitors");
    });

    it("detects abuse when visitor uses 4+ IPs", async () => {
      const { checkAbuse } = await import("../anti-abuse");
      const visitorId = "visitor-rotating";

      checkAbuse("10.0.0.1", visitorId);
      checkAbuse("10.0.0.2", visitorId);
      checkAbuse("10.0.0.3", visitorId);
      checkAbuse("10.0.0.4", visitorId);

      // Fifth IP triggers abuse detection
      const result = checkAbuse("10.0.0.5", visitorId);

      expect(result.isAbuse).toBe(true);
      expect(result.score).toBeGreaterThan(0);
      expect(result.reason).toContain("Rapid IP rotation");
    });

    it("same visitor from same IP does not increase counts", async () => {
      const { checkAbuse } = await import("../anti-abuse");
      const ip = "192.168.1.103";
      const visitorId = "visitor-same";

      // Multiple calls with same IP and visitor
      for (let i = 0; i < 10; i++) {
        const result = checkAbuse(ip, visitorId);
        expect(result.isAbuse).toBe(false);
      }
    });
  });

  describe("incrementAbuseScore", () => {
    it("does nothing when db not provided", async () => {
      const { incrementAbuseScore } = await import("../anti-abuse");

      // Should not throw
      await incrementAbuseScore("session-123", 5);
    });

    it("increments score in database", async () => {
      const { incrementAbuseScore } = await import("../anti-abuse");
      const mockDb = {
        session: {
          update: vi.fn().mockResolvedValue({}),
        },
      };

      await incrementAbuseScore("session-456", 5, mockDb);

      expect(mockDb.session.update).toHaveBeenCalledWith({
        where: { id: "session-456" },
        data: { abuseScore: { increment: 5 } },
      });
    });

    it("handles database errors gracefully", async () => {
      const { incrementAbuseScore } = await import("../anti-abuse");
      const mockDb = {
        session: {
          update: vi.fn().mockRejectedValue(new Error("DB error")),
        },
      };

      // Should not throw
      await incrementAbuseScore("session-789", 5, mockDb);
    });
  });

  describe("isSessionBlocked", () => {
    it("returns false when db not provided", async () => {
      const { isSessionBlocked } = await import("../anti-abuse");

      const result = await isSessionBlocked("session-123");

      expect(result).toBe(false);
    });

    it("returns false when session not found", async () => {
      const { isSessionBlocked } = await import("../anti-abuse");
      const mockDb = {
        session: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
      };

      const result = await isSessionBlocked("session-not-found", mockDb);

      expect(result).toBe(false);
    });

    it("returns false when abuse score below threshold", async () => {
      const { isSessionBlocked, ABUSE_THRESHOLD } =
        await import("../anti-abuse");
      const mockDb = {
        session: {
          findUnique: vi.fn().mockResolvedValue({ abuseScore: 5 }),
        },
      };

      const result = await isSessionBlocked("session-low-score", mockDb);

      expect(result).toBe(false);
      expect(ABUSE_THRESHOLD).toBeGreaterThan(5);
    });

    it("returns true when abuse score exceeds threshold", async () => {
      const { isSessionBlocked, ABUSE_THRESHOLD } =
        await import("../anti-abuse");
      const mockDb = {
        session: {
          findUnique: vi
            .fn()
            .mockResolvedValue({ abuseScore: ABUSE_THRESHOLD + 1 }),
        },
      };

      const result = await isSessionBlocked("session-blocked", mockDb);

      expect(result).toBe(true);
    });

    it("returns false when abuse score equals threshold", async () => {
      const { isSessionBlocked, ABUSE_THRESHOLD } =
        await import("../anti-abuse");
      const mockDb = {
        session: {
          findUnique: vi
            .fn()
            .mockResolvedValue({ abuseScore: ABUSE_THRESHOLD }),
        },
      };

      const result = await isSessionBlocked("session-at-threshold", mockDb);

      expect(result).toBe(false);
    });

    it("handles database errors gracefully", async () => {
      const { isSessionBlocked } = await import("../anti-abuse");
      const mockDb = {
        session: {
          findUnique: vi.fn().mockRejectedValue(new Error("DB error")),
        },
      };

      const result = await isSessionBlocked("session-error", mockDb);

      expect(result).toBe(false);
    });
  });

  describe("ABUSE_THRESHOLD", () => {
    it("exports abuse threshold constant", () => {
      expect(ABUSE_THRESHOLD).toBe(10);
    });
  });
});

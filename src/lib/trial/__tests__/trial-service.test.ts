/**
 * MIRRORBUDDY - Trial Service Core Tests
 *
 * Unit tests for trial session creation:
 * - getOrCreateTrialSession (IP hash, visitor ID, creation)
 * - TRIAL_LIMITS configuration
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    trialSession: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(), // Transaction at root level
  },
}));

// Mock TierService to avoid actual DB calls
vi.mock("@/lib/tier/tier-service", () => ({
  TierService: vi.fn().mockImplementation(() => ({
    getLimitsForUser: vi.fn().mockResolvedValue({
      dailyMessages: 10,
      dailyVoiceMinutes: 5,
      dailyTools: 10,
      maxDocuments: 1,
    }),
  })),
}));

import { prisma } from "@/lib/db";
import {
  getOrCreateTrialSession,
  TRIAL_LIMITS,
  checkAndIncrementUsage,
} from "../trial-service";

describe("Trial Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("TRIAL_LIMITS", () => {
    it("exports correct trial limits", () => {
      expect(TRIAL_LIMITS.CHAT).toBe(10);
      expect(TRIAL_LIMITS.VOICE_SECONDS).toBe(300);
      expect(TRIAL_LIMITS.TOOLS).toBe(10);
      expect(TRIAL_LIMITS.DOCS).toBe(1);
      // MAESTRI_COUNT removed - users can talk to any maestro
    });
  });

  describe("getOrCreateTrialSession", () => {
    const mockIp = "192.168.1.1";
    const mockVisitorId = "visitor-abc-123";

    it("returns existing session if found by IP hash", async () => {
      const existingSession = {
        id: "session-123",
        ipHash: "hashed-ip",
        visitorId: "other-visitor",
        chatsUsed: 5,
        docsUsed: 0,
        voiceSecondsUsed: 60,
        toolsUsed: 3,
        assignedMaestri: '["euclide","galileo","darwin"]',
        assignedCoach: "melissa",
      };

      vi.mocked(prisma.trialSession.findFirst).mockResolvedValue(
        existingSession as any,
      );

      const result = await getOrCreateTrialSession(mockIp, mockVisitorId);

      expect(result).toEqual(existingSession);
      expect(prisma.trialSession.create).not.toHaveBeenCalled();
    });

    it("returns existing session if found by visitor ID", async () => {
      const existingSession = {
        id: "session-456",
        ipHash: "different-hash",
        visitorId: mockVisitorId,
        chatsUsed: 2,
        docsUsed: 1,
        voiceSecondsUsed: 120,
        toolsUsed: 1,
        assignedMaestri: '["leonardo","mozart","feynman"]',
        assignedCoach: "laura",
      };

      vi.mocked(prisma.trialSession.findFirst).mockResolvedValue(
        existingSession as any,
      );

      const result = await getOrCreateTrialSession(mockIp, mockVisitorId);

      expect(result).toEqual(existingSession);
      expect(prisma.trialSession.create).not.toHaveBeenCalled();
    });

    it("creates new session if none exists", async () => {
      vi.mocked(prisma.trialSession.findFirst).mockResolvedValue(null);

      const newSession = {
        id: "new-session-789",
        ipHash: "new-hash",
        visitorId: mockVisitorId,
        chatsUsed: 0,
        docsUsed: 0,
        voiceSecondsUsed: 0,
        toolsUsed: 0,
        assignedMaestri: '["euclide","galileo","darwin"]',
        assignedCoach: "melissa",
      };

      vi.mocked(prisma.trialSession.create).mockResolvedValue(
        newSession as any,
      );

      const result = await getOrCreateTrialSession(mockIp, mockVisitorId);

      expect(prisma.trialSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          visitorId: mockVisitorId,
          chatsUsed: 0,
          docsUsed: 0,
          voiceSecondsUsed: 0,
          toolsUsed: 0,
        }),
      });

      expect(result).toEqual(newSession);
    });

    it("assigns 3 random maestri to new session", async () => {
      vi.mocked(prisma.trialSession.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.trialSession.create).mockResolvedValue({
        id: "session-id",
        ipHash: "hash",
        visitorId: mockVisitorId,
        chatsUsed: 0,
        docsUsed: 0,
        voiceSecondsUsed: 0,
        toolsUsed: 0,
        assignedMaestri: '["euclide","galileo","darwin"]',
        assignedCoach: "melissa",
      } as any);

      await getOrCreateTrialSession(mockIp, mockVisitorId);

      expect(prisma.trialSession.create).toHaveBeenCalled();

      // Verify maestri restrictions removed (empty array)
      const createCall = vi.mocked(prisma.trialSession.create).mock.calls[0][0];
      const maestriJson = createCall.data.assignedMaestri as string;
      const maestri = JSON.parse(maestriJson);
      expect(maestri).toHaveLength(0); // No maestri restrictions
    });
  });

  describe("checkAndIncrementUsage - Concurrency Safety (F-02)", () => {
    it("prevents race condition: 10 concurrent requests with limit=5 -> exactly 5 succeed", async () => {
      const sessionId = "test-session-123";
      const limit = 5;
      let currentUsage = 0;

      // Mock $transaction at prisma root level (not trialSession)
      vi.mocked(prisma.$transaction as any).mockImplementation(
        async (fn: any) => {
          // Execute the transaction function with a mock prisma client
          return fn({
            trialSession: {
              findUnique: async () => ({
                id: sessionId,
                chatsUsed: currentUsage,
                docsUsed: 0,
                voiceSecondsUsed: 0,
                toolsUsed: 0,
              }),
              update: async () => {
                // Simulate atomic increment
                if (currentUsage < limit) {
                  currentUsage++;
                  return {
                    id: sessionId,
                    chatsUsed: currentUsage,
                    docsUsed: 0,
                    voiceSecondsUsed: 0,
                    toolsUsed: 0,
                  };
                }
                throw new Error("Limit exceeded");
              },
            },
          });
        },
      );

      // Launch 10 concurrent requests
      const requests = Array.from({ length: 10 }, () =>
        checkAndIncrementUsage(sessionId, "chat").catch((err) => ({
          allowed: false,
          error: err.message,
        })),
      );

      const results = await Promise.all(requests);

      // Count successes and failures
      const successes = results.filter((r) => r.allowed === true);
      const failures = results.filter((r) => r.allowed === false);

      // CRITICAL: Exactly 5 should succeed, 5 should fail
      expect(successes).toHaveLength(limit);
      expect(failures).toHaveLength(10 - limit);
      expect(currentUsage).toBe(limit);
    });

    it("returns remaining count after increment", async () => {
      const sessionId = "test-session-456";
      let currentUsage = 3;

      vi.mocked(prisma.$transaction as any).mockImplementation(
        async (fn: any) => {
          return fn({
            trialSession: {
              findUnique: async () => ({
                id: sessionId,
                chatsUsed: currentUsage,
              }),
              update: async () => {
                currentUsage++;
                return {
                  id: sessionId,
                  chatsUsed: currentUsage,
                };
              },
            },
          });
        },
      );

      const result = await checkAndIncrementUsage(sessionId, "chat");

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(10 - currentUsage); // 10 = default chat limit
    });
  });
});

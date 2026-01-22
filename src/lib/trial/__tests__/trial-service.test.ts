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
  },
}));

import { prisma } from "@/lib/db";
import { getOrCreateTrialSession, TRIAL_LIMITS } from "../trial-service";

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
});

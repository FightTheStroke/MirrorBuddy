/**
 * MIRRORBUDDY - Trial Service Tests
 *
 * Unit tests for trial session management:
 * - getOrCreateTrialSession
 * - checkTrialLimits (chat, voice, tool, doc)
 * - incrementUsage
 * - addVoiceSeconds
 * - getTrialStatus
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
  },
}));

import { prisma } from "@/lib/db";
import {
  getOrCreateTrialSession,
  checkTrialLimits,
  TRIAL_LIMITS,
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
      expect(TRIAL_LIMITS.MAESTRI_COUNT).toBe(3);
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

      // Verify the call arguments contain 3 maestri
      const createCall = vi.mocked(prisma.trialSession.create).mock.calls[0][0];
      const maestriJson = createCall.data.assignedMaestri as string;
      const maestri = JSON.parse(maestriJson);
      expect(maestri).toHaveLength(TRIAL_LIMITS.MAESTRI_COUNT);
    });
  });

  describe("checkTrialLimits", () => {
    const sessionId = "test-session-123";

    it("returns error when session not found", async () => {
      vi.mocked(prisma.trialSession.findUnique).mockResolvedValue(null);

      const result = await checkTrialLimits(sessionId, "chat");

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("Session not found");
    });

    describe("chat limits", () => {
      it("allows chat when under limit", async () => {
        vi.mocked(prisma.trialSession.findUnique).mockResolvedValue({
          id: sessionId,
          chatsUsed: 5,
          docsUsed: 0,
          voiceSecondsUsed: 0,
          toolsUsed: 0,
        } as any);

        const result = await checkTrialLimits(sessionId, "chat");

        expect(result.allowed).toBe(true);
      });

      it("denies chat at limit", async () => {
        vi.mocked(prisma.trialSession.findUnique).mockResolvedValue({
          id: sessionId,
          chatsUsed: TRIAL_LIMITS.CHAT,
          docsUsed: 0,
          voiceSecondsUsed: 0,
          toolsUsed: 0,
        } as any);

        const result = await checkTrialLimits(sessionId, "chat");

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain("Limite chat");
      });

      it("denies chat when over limit", async () => {
        vi.mocked(prisma.trialSession.findUnique).mockResolvedValue({
          id: sessionId,
          chatsUsed: TRIAL_LIMITS.CHAT + 5,
          docsUsed: 0,
          voiceSecondsUsed: 0,
          toolsUsed: 0,
        } as any);

        const result = await checkTrialLimits(sessionId, "chat");

        expect(result.allowed).toBe(false);
      });
    });

    describe("voice limits", () => {
      it("allows voice when under limit", async () => {
        vi.mocked(prisma.trialSession.findUnique).mockResolvedValue({
          id: sessionId,
          chatsUsed: 0,
          docsUsed: 0,
          voiceSecondsUsed: 100,
          toolsUsed: 0,
        } as any);

        const result = await checkTrialLimits(sessionId, "voice", 60);

        expect(result.allowed).toBe(true);
      });

      it("denies voice when would exceed limit", async () => {
        vi.mocked(prisma.trialSession.findUnique).mockResolvedValue({
          id: sessionId,
          chatsUsed: 0,
          docsUsed: 0,
          voiceSecondsUsed: 280, // 280 + 60 > 300
          toolsUsed: 0,
        } as any);

        const result = await checkTrialLimits(sessionId, "voice", 60);

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain("Limite voce");
        expect(result.reason).toContain("20 secondi"); // 300 - 280
      });

      it("allows voice exactly at remaining limit", async () => {
        vi.mocked(prisma.trialSession.findUnique).mockResolvedValue({
          id: sessionId,
          chatsUsed: 0,
          docsUsed: 0,
          voiceSecondsUsed: 250, // 250 + 50 = 300 (exactly at limit)
          toolsUsed: 0,
        } as any);

        const result = await checkTrialLimits(sessionId, "voice", 50);

        expect(result.allowed).toBe(true);
      });
    });

    describe("tool limits", () => {
      it("allows tool when under limit", async () => {
        vi.mocked(prisma.trialSession.findUnique).mockResolvedValue({
          id: sessionId,
          chatsUsed: 0,
          docsUsed: 0,
          voiceSecondsUsed: 0,
          toolsUsed: 5,
        } as any);

        const result = await checkTrialLimits(sessionId, "tool");

        expect(result.allowed).toBe(true);
      });

      it("denies tool at limit", async () => {
        vi.mocked(prisma.trialSession.findUnique).mockResolvedValue({
          id: sessionId,
          chatsUsed: 0,
          docsUsed: 0,
          voiceSecondsUsed: 0,
          toolsUsed: TRIAL_LIMITS.TOOLS,
        } as any);

        const result = await checkTrialLimits(sessionId, "tool");

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain("Limite strumenti");
      });
    });

    describe("doc limits", () => {
      it("allows doc when under limit", async () => {
        vi.mocked(prisma.trialSession.findUnique).mockResolvedValue({
          id: sessionId,
          chatsUsed: 0,
          docsUsed: 0,
          voiceSecondsUsed: 0,
          toolsUsed: 0,
        } as any);

        const result = await checkTrialLimits(sessionId, "doc");

        expect(result.allowed).toBe(true);
      });

      it("denies doc at limit", async () => {
        vi.mocked(prisma.trialSession.findUnique).mockResolvedValue({
          id: sessionId,
          chatsUsed: 0,
          docsUsed: TRIAL_LIMITS.DOCS,
          voiceSecondsUsed: 0,
          toolsUsed: 0,
        } as any);

        const result = await checkTrialLimits(sessionId, "doc");

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain("Limite documenti");
      });
    });
  });
});

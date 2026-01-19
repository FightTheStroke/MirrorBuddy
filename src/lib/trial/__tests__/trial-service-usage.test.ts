/**
 * MIRRORBUDDY - Trial Service Usage Tests
 *
 * Unit tests for usage tracking:
 * - incrementUsage
 * - addVoiceSeconds
 * - getTrialStatus
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    trialSession: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db";
import {
  incrementUsage,
  addVoiceSeconds,
  getTrialStatus,
  TRIAL_LIMITS,
} from "../trial-service";

describe("Trial Service Usage", () => {
  const sessionId = "test-session-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("incrementUsage", () => {
    it("increments chat count", async () => {
      vi.mocked(prisma.trialSession.update).mockResolvedValue({
        id: sessionId,
        chatsUsed: 1,
      } as any);

      await incrementUsage(sessionId, "chat");

      expect(prisma.trialSession.update).toHaveBeenCalledWith({
        where: { id: sessionId },
        data: { chatsUsed: { increment: 1 } },
      });
    });

    it("increments doc count", async () => {
      vi.mocked(prisma.trialSession.update).mockResolvedValue({
        id: sessionId,
        docsUsed: 1,
      } as any);

      await incrementUsage(sessionId, "doc");

      expect(prisma.trialSession.update).toHaveBeenCalledWith({
        where: { id: sessionId },
        data: { docsUsed: { increment: 1 } },
      });
    });

    it("increments tool count", async () => {
      vi.mocked(prisma.trialSession.update).mockResolvedValue({
        id: sessionId,
        toolsUsed: 1,
      } as any);

      await incrementUsage(sessionId, "tool");

      expect(prisma.trialSession.update).toHaveBeenCalledWith({
        where: { id: sessionId },
        data: { toolsUsed: { increment: 1 } },
      });
    });
  });

  describe("addVoiceSeconds", () => {
    it("adds voice seconds and returns updated total", async () => {
      vi.mocked(prisma.trialSession.update).mockResolvedValue({
        id: sessionId,
        voiceSecondsUsed: 120,
      } as any);

      const result = await addVoiceSeconds(sessionId, 60);

      expect(result).toBe(120);
      expect(prisma.trialSession.update).toHaveBeenCalledWith({
        where: { id: sessionId },
        data: { voiceSecondsUsed: { increment: 60 } },
      });
    });

    it("rounds fractional seconds up", async () => {
      vi.mocked(prisma.trialSession.update).mockResolvedValue({
        id: sessionId,
        voiceSecondsUsed: 61,
      } as any);

      await addVoiceSeconds(sessionId, 60.3);

      expect(prisma.trialSession.update).toHaveBeenCalledWith({
        where: { id: sessionId },
        data: { voiceSecondsUsed: { increment: 61 } },
      });
    });

    it("handles zero seconds", async () => {
      vi.mocked(prisma.trialSession.update).mockResolvedValue({
        id: sessionId,
        voiceSecondsUsed: 100,
      } as any);

      const result = await addVoiceSeconds(sessionId, 0);

      expect(result).toBe(100);
    });
  });

  describe("getTrialStatus", () => {
    it("returns null when session not found", async () => {
      vi.mocked(prisma.trialSession.findUnique).mockResolvedValue(null);

      const result = await getTrialStatus(sessionId);

      expect(result).toBeNull();
    });

    it("calculates remaining chats correctly", async () => {
      vi.mocked(prisma.trialSession.findUnique).mockResolvedValue({
        id: sessionId,
        chatsUsed: 3,
        docsUsed: 0,
        voiceSecondsUsed: 0,
        toolsUsed: 0,
        assignedMaestri: '["euclide","galileo","darwin"]',
        assignedCoach: "melissa",
      } as any);

      const result = await getTrialStatus(sessionId);

      expect(result?.chatsRemaining).toBe(TRIAL_LIMITS.CHAT - 3);
      expect(result?.totalChatsUsed).toBe(3);
      expect(result?.maxChats).toBe(TRIAL_LIMITS.CHAT);
    });

    it("calculates remaining voice seconds correctly", async () => {
      vi.mocked(prisma.trialSession.findUnique).mockResolvedValue({
        id: sessionId,
        chatsUsed: 0,
        docsUsed: 0,
        voiceSecondsUsed: 180,
        toolsUsed: 0,
        assignedMaestri: '["euclide","galileo","darwin"]',
        assignedCoach: "melissa",
      } as any);

      const result = await getTrialStatus(sessionId);

      expect(result?.voiceSecondsRemaining).toBe(120); // 300 - 180
      expect(result?.voiceSecondsUsed).toBe(180);
      expect(result?.maxVoiceSeconds).toBe(TRIAL_LIMITS.VOICE_SECONDS);
      expect(result?.voiceMinutesRemaining).toBe(2); // floor(120/60)
    });

    it("calculates remaining tools correctly", async () => {
      vi.mocked(prisma.trialSession.findUnique).mockResolvedValue({
        id: sessionId,
        chatsUsed: 0,
        docsUsed: 0,
        voiceSecondsUsed: 0,
        toolsUsed: 7,
        assignedMaestri: '["euclide","galileo","darwin"]',
        assignedCoach: "melissa",
      } as any);

      const result = await getTrialStatus(sessionId);

      expect(result?.toolsRemaining).toBe(TRIAL_LIMITS.TOOLS - 7);
      expect(result?.totalToolsUsed).toBe(7);
      expect(result?.maxTools).toBe(TRIAL_LIMITS.TOOLS);
    });

    it("calculates remaining docs correctly", async () => {
      vi.mocked(prisma.trialSession.findUnique).mockResolvedValue({
        id: sessionId,
        chatsUsed: 0,
        docsUsed: 1,
        voiceSecondsUsed: 0,
        toolsUsed: 0,
        assignedMaestri: '["euclide","galileo","darwin"]',
        assignedCoach: "melissa",
      } as any);

      const result = await getTrialStatus(sessionId);

      expect(result?.docsRemaining).toBe(0);
      expect(result?.totalDocsUsed).toBe(1);
      expect(result?.maxDocs).toBe(TRIAL_LIMITS.DOCS);
    });

    it("returns assigned maestri and coach", async () => {
      const maestri = ["euclide", "galileo", "darwin"];
      vi.mocked(prisma.trialSession.findUnique).mockResolvedValue({
        id: sessionId,
        chatsUsed: 0,
        docsUsed: 0,
        voiceSecondsUsed: 0,
        toolsUsed: 0,
        assignedMaestri: JSON.stringify(maestri),
        assignedCoach: "laura",
      } as any);

      const result = await getTrialStatus(sessionId);

      expect(result?.assignedMaestri).toEqual(maestri);
      expect(result?.assignedCoach).toBe("laura");
    });

    it("clamps remaining values to zero when over limit", async () => {
      vi.mocked(prisma.trialSession.findUnique).mockResolvedValue({
        id: sessionId,
        chatsUsed: 15, // Over limit
        docsUsed: 5, // Over limit
        voiceSecondsUsed: 500, // Over limit
        toolsUsed: 20, // Over limit
        assignedMaestri: '["euclide"]',
        assignedCoach: "melissa",
      } as any);

      const result = await getTrialStatus(sessionId);

      expect(result?.chatsRemaining).toBe(0);
      expect(result?.docsRemaining).toBe(0);
      expect(result?.voiceSecondsRemaining).toBe(0);
      expect(result?.toolsRemaining).toBe(0);
    });
  });
});

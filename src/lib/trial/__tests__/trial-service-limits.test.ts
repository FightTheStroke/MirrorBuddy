/**
 * MIRRORBUDDY - Trial Limits Tests
 *
 * Unit tests for trial session limit checks:
 * - Chat, voice, tool, and document limits
 * - Usage validation and enforcement
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    trialSession: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db";
import { checkTrialLimits, TRIAL_LIMITS } from "../trial-service";

describe("checkTrialLimits - Trial Limits Enforcement", () => {
  const sessionId = "test-session-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

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
        voiceSecondsUsed: 280,
        toolsUsed: 0,
      } as any);

      const result = await checkTrialLimits(sessionId, "voice", 60);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Limite voce");
      expect(result.reason).toContain("20 secondi");
    });

    it("allows voice exactly at remaining limit", async () => {
      vi.mocked(prisma.trialSession.findUnique).mockResolvedValue({
        id: sessionId,
        chatsUsed: 0,
        docsUsed: 0,
        voiceSecondsUsed: 250,
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

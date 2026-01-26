/**
 * Tests for conversation memory loader
 * @module conversation/memory-loader
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { loadPreviousContext, formatRelativeDate } from "../memory-loader";

// Mock prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    conversation: {
      findMany: vi.fn(),
    },
  },
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock tier-memory-config
vi.mock("../tier-memory-config", () => ({
  getTierMemoryLimits: vi.fn(),
}));

import { prisma } from "@/lib/db";
import { getTierMemoryLimits } from "../tier-memory-config";

// Helper to create mock conversation with all required fields
function createMockConversation(overrides: {
  summary?: string | null;
  keyFacts?: string | null;
  topics?: string;
  updatedAt?: Date;
}) {
  return {
    id: "conv-" + Math.random().toString(36).slice(2),
    createdAt: new Date(),
    updatedAt: overrides.updatedAt ?? new Date(),
    userId: "user-1",
    maestroId: "melissa",
    topics: overrides.topics ?? "[]",
    title: null,
    summary: overrides.summary ?? null,
    keyFacts: overrides.keyFacts ?? null,
    messageCount: 0,
    isActive: false,
    lastMessageAt: null,
    isParentMode: false,
    studentId: null,
    markedForDeletion: false,
    markedForDeletionAt: null,
    isTestData: false,
  };
}

describe("memory-loader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock to base tier limits
    vi.mocked(getTierMemoryLimits).mockReturnValue({
      recentConversations: 3,
      timeWindowDays: 15,
      maxKeyFacts: 10,
      maxTopics: 15,
      semanticEnabled: false,
      crossMaestroEnabled: false,
    });
  });

  describe("loadPreviousContext", () => {
    it("returns empty memory for user with no previous conversations", async () => {
      vi.mocked(prisma.conversation.findMany).mockResolvedValue([]);

      const result = await loadPreviousContext("user-1", "melissa", "base");

      expect(result).toEqual({
        recentSummary: null,
        keyFacts: [],
        topics: [],
        lastSessionDate: null,
      });
    });

    it("defaults to base tier when tierName not provided", async () => {
      vi.mocked(prisma.conversation.findMany).mockResolvedValue([]);

      await loadPreviousContext("user-1", "melissa");

      expect(getTierMemoryLimits).toHaveBeenCalledWith("base");
    });

    it("loads summary from most recent closed conversation", async () => {
      const mockConversation = createMockConversation({
        summary: "Lo studente ha imparato le frazioni",
        keyFacts: '["preferisce esempi visivi"]',
        topics: '["matematica", "frazioni"]',
        updatedAt: new Date("2026-01-01"),
      });
      vi.mocked(prisma.conversation.findMany).mockResolvedValue([
        mockConversation,
      ]);

      const result = await loadPreviousContext("user-1", "melissa", "base");

      expect(result.recentSummary).toBe("Lo studente ha imparato le frazioni");
      expect(result.keyFacts).toContain("preferisce esempi visivi");
      expect(result.topics).toContain("matematica");
      expect(result.lastSessionDate).toEqual(new Date("2026-01-01"));
    });

    it("merges key facts from multiple conversations", async () => {
      const conversations = [
        createMockConversation({
          summary: "Recent session",
          keyFacts: '["fact1", "fact2"]',
          topics: '["topic1"]',
          updatedAt: new Date("2026-01-01"),
        }),
        createMockConversation({
          summary: "Older session",
          keyFacts: '["fact2", "fact3"]',
          topics: '["topic2"]',
          updatedAt: new Date("2025-12-31"),
        }),
      ];
      vi.mocked(prisma.conversation.findMany).mockResolvedValue(conversations);

      const result = await loadPreviousContext("user-1", "melissa", "base");

      expect(result.keyFacts).toHaveLength(3);
      expect(result.keyFacts).toContain("fact1");
      expect(result.keyFacts).toContain("fact2");
      expect(result.keyFacts).toContain("fact3");
    });

    it("limits key facts to tier-specific max", async () => {
      vi.mocked(getTierMemoryLimits).mockReturnValue({
        recentConversations: 1,
        timeWindowDays: 30,
        maxKeyFacts: 5,
        maxTopics: 15,
        semanticEnabled: false,
        crossMaestroEnabled: false,
      });
      const conversations = [
        createMockConversation({
          summary: "Session",
          keyFacts: '["f1", "f2", "f3", "f4", "f5", "f6", "f7"]',
          topics: "[]",
        }),
      ];
      vi.mocked(prisma.conversation.findMany).mockResolvedValue(conversations);

      const result = await loadPreviousContext("user-1", "melissa", "base");

      expect(result.keyFacts.length).toBeLessThanOrEqual(5);
    });

    it("limits topics to tier-specific max", async () => {
      vi.mocked(getTierMemoryLimits).mockReturnValue({
        recentConversations: 1,
        timeWindowDays: 30,
        maxKeyFacts: 10,
        maxTopics: 10,
        semanticEnabled: false,
        crossMaestroEnabled: false,
      });
      const manyTopics = Array.from({ length: 15 }, (_, i) => `topic${i}`);
      const conversations = [
        createMockConversation({
          summary: "Session",
          keyFacts: "[]",
          topics: JSON.stringify(manyTopics),
        }),
      ];
      vi.mocked(prisma.conversation.findMany).mockResolvedValue(conversations);

      const result = await loadPreviousContext("user-1", "melissa", "base");

      expect(result.topics.length).toBeLessThanOrEqual(10);
    });

    it("handles invalid JSON in keyFacts gracefully", async () => {
      const conversations = [
        createMockConversation({
          summary: "Session",
          keyFacts: "not valid json",
          topics: '["valid"]',
        }),
      ];
      vi.mocked(prisma.conversation.findMany).mockResolvedValue(conversations);

      const result = await loadPreviousContext("user-1", "melissa", "base");

      expect(result.keyFacts).toEqual([]);
      expect(result.topics).toContain("valid");
    });

    it("trial tier returns empty memory", async () => {
      vi.mocked(getTierMemoryLimits).mockReturnValue({
        recentConversations: 0,
        timeWindowDays: 0,
        maxKeyFacts: 0,
        maxTopics: 0,
        semanticEnabled: false,
        crossMaestroEnabled: false,
      });
      const mockConversation = createMockConversation({
        summary: "Should be ignored",
        keyFacts: '["should", "be", "ignored"]',
        topics: '["ignored"]',
      });
      vi.mocked(prisma.conversation.findMany).mockResolvedValue([
        mockConversation,
      ]);

      const result = await loadPreviousContext("user-1", "melissa", "trial");

      expect(result).toEqual({
        recentSummary: null,
        keyFacts: [],
        topics: [],
        lastSessionDate: null,
      });
    });

    it("pro tier uses higher limits", async () => {
      vi.mocked(getTierMemoryLimits).mockReturnValue({
        recentConversations: 5,
        timeWindowDays: null,
        maxKeyFacts: 50,
        maxTopics: 30,
        semanticEnabled: true,
        crossMaestroEnabled: true,
      });
      const conversations = Array.from({ length: 5 }, (_, i) =>
        createMockConversation({
          summary: `Session ${i}`,
          keyFacts: JSON.stringify([`fact${i}`]),
          topics: JSON.stringify([`topic${i}`]),
          updatedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        }),
      );
      vi.mocked(prisma.conversation.findMany).mockResolvedValue(conversations);

      await loadPreviousContext("user-1", "melissa", "pro");

      expect(prisma.conversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        }),
      );
    });

    it("respects timeWindowDays filter", async () => {
      vi.mocked(getTierMemoryLimits).mockReturnValue({
        recentConversations: 5,
        timeWindowDays: 7,
        maxKeyFacts: 10,
        maxTopics: 15,
        semanticEnabled: false,
        crossMaestroEnabled: false,
      });

      vi.mocked(prisma.conversation.findMany).mockResolvedValue([]);

      await loadPreviousContext("user-1", "melissa", "base");

      const call = vi.mocked(prisma.conversation.findMany).mock.calls[0][0];
      const whereClause = call?.where as Record<string, unknown>;
      expect(
        (whereClause?.updatedAt as Record<string, unknown>)?.gte,
      ).toBeDefined();
    });

    it("excludes active conversations", async () => {
      await loadPreviousContext("user-1", "melissa", "base");

      expect(prisma.conversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: false,
          }),
        }),
      );
    });

    it("excludes parent mode conversations", async () => {
      await loadPreviousContext("user-1", "melissa", "base");

      expect(prisma.conversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isParentMode: false,
          }),
        }),
      );
    });

    it("passes correct recentConversations limit to query", async () => {
      vi.mocked(getTierMemoryLimits).mockReturnValue({
        recentConversations: 3,
        timeWindowDays: 15,
        maxKeyFacts: 10,
        maxTopics: 15,
        semanticEnabled: false,
        crossMaestroEnabled: false,
      });
      vi.mocked(prisma.conversation.findMany).mockResolvedValue([]);

      await loadPreviousContext("user-1", "melissa", "base");

      expect(prisma.conversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 3,
        }),
      );
    });
  });

  describe("formatRelativeDate", () => {
    it('returns "data sconosciuta" for null date', () => {
      expect(formatRelativeDate(null)).toBe("data sconosciuta");
    });

    it('returns "oggi" for today', () => {
      const today = new Date();
      expect(formatRelativeDate(today)).toBe("oggi");
    });

    it('returns "ieri" for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(formatRelativeDate(yesterday)).toBe("ieri");
    });

    it('returns "X giorni fa" for recent days', () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      expect(formatRelativeDate(threeDaysAgo)).toBe("3 giorni fa");
    });

    it('returns "la settimana scorsa" for 7-13 days ago', () => {
      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);
      expect(formatRelativeDate(eightDaysAgo)).toBe("la settimana scorsa");
    });

    it("returns weeks for 14-29 days ago", () => {
      const threeWeeksAgo = new Date();
      threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);
      expect(formatRelativeDate(threeWeeksAgo)).toBe("3 settimane fa");
    });

    it('returns "il mese scorso" for 30-59 days ago', () => {
      const fortyDaysAgo = new Date();
      fortyDaysAgo.setDate(fortyDaysAgo.getDate() - 40);
      expect(formatRelativeDate(fortyDaysAgo)).toBe("il mese scorso");
    });

    it("returns months for 60+ days ago", () => {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 90);
      expect(formatRelativeDate(threeMonthsAgo)).toBe("3 mesi fa");
    });
  });
});

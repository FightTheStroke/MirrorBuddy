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

import { prisma } from "@/lib/db";

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
  };
}

describe("memory-loader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loadPreviousContext", () => {
    it("returns empty memory for user with no previous conversations", async () => {
      vi.mocked(prisma.conversation.findMany).mockResolvedValue([]);

      const result = await loadPreviousContext("user-1", "melissa");

      expect(result).toEqual({
        recentSummary: null,
        keyFacts: [],
        topics: [],
        lastSessionDate: null,
      });
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

      const result = await loadPreviousContext("user-1", "melissa");

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

      const result = await loadPreviousContext("user-1", "melissa");

      expect(result.keyFacts).toHaveLength(3);
      expect(result.keyFacts).toContain("fact1");
      expect(result.keyFacts).toContain("fact2");
      expect(result.keyFacts).toContain("fact3");
    });

    it("limits key facts to 5", async () => {
      const conversations = [
        createMockConversation({
          summary: "Session",
          keyFacts: '["f1", "f2", "f3", "f4", "f5", "f6", "f7"]',
          topics: "[]",
        }),
      ];
      vi.mocked(prisma.conversation.findMany).mockResolvedValue(conversations);

      const result = await loadPreviousContext("user-1", "melissa");

      expect(result.keyFacts.length).toBeLessThanOrEqual(5);
    });

    it("limits topics to 10", async () => {
      const manyTopics = Array.from({ length: 15 }, (_, i) => `topic${i}`);
      const conversations = [
        createMockConversation({
          summary: "Session",
          keyFacts: "[]",
          topics: JSON.stringify(manyTopics),
        }),
      ];
      vi.mocked(prisma.conversation.findMany).mockResolvedValue(conversations);

      const result = await loadPreviousContext("user-1", "melissa");

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

      const result = await loadPreviousContext("user-1", "melissa");

      expect(result.keyFacts).toEqual([]);
      expect(result.topics).toContain("valid");
    });

    it("excludes active conversations", async () => {
      await loadPreviousContext("user-1", "melissa");

      expect(prisma.conversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: false,
          }),
        }),
      );
    });

    it("excludes parent mode conversations", async () => {
      await loadPreviousContext("user-1", "melissa");

      expect(prisma.conversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isParentMode: false,
          }),
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

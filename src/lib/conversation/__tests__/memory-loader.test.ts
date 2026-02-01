/**
 * Tests for conversation memory loader
 * @module conversation/memory-loader
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  loadPreviousContext,
  loadEnhancedContext,
  formatRelativeDate,
} from "../memory-loader";

// Mock prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    conversation: {
      findMany: vi.fn(),
    },
    hierarchicalSummary: {
      findMany: vi.fn(),
    },
  },
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

// Mock tier-memory-config
vi.mock("../tier-memory-config", () => ({
  getTierMemoryLimits: vi.fn(),
}));

// Mock semantic-memory
vi.mock("../semantic-memory", () => ({
  searchRelevantSummaries: vi.fn(),
}));

import { prisma } from "@/lib/db";
import { getTierMemoryLimits } from "../tier-memory-config";
import { searchRelevantSummaries } from "../semantic-memory";

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

  describe("loadEnhancedContext", () => {
    beforeEach(() => {
      // Reset semantic search mock
      vi.mocked(searchRelevantSummaries).mockResolvedValue([]);
    });

    it("returns semantic memories for Pro users when query provided", async () => {
      // Mock Pro tier config
      vi.mocked(getTierMemoryLimits).mockReturnValue({
        recentConversations: 5,
        timeWindowDays: null,
        maxKeyFacts: 50,
        maxTopics: 30,
        semanticEnabled: true,
        crossMaestroEnabled: true,
      });

      // Mock conversation data
      const mockConversation = createMockConversation({
        summary: "Discussed fractions",
        keyFacts: '["prefers visual examples"]',
        topics: '["mathematics"]',
      });
      vi.mocked(prisma.conversation.findMany).mockResolvedValue([
        mockConversation,
      ]);

      // Mock semantic search results
      const mockSemanticResults = [
        {
          conversationId: "conv-123",
          content: "Previous discussion about fractions and ratios",
          relevanceScore: 0.85,
          date: new Date("2026-01-10"),
          subject: "Mathematics",
          tags: ["fractions", "ratios"],
        },
        {
          conversationId: "conv-456",
          content: "Worked on fraction problems together",
          relevanceScore: 0.72,
          date: new Date("2026-01-05"),
          subject: "Mathematics",
          tags: ["fractions"],
        },
      ];
      vi.mocked(searchRelevantSummaries).mockResolvedValue(mockSemanticResults);

      const query = "What did we learn about fractions?";
      const result = await loadEnhancedContext(
        "user-1",
        "melissa",
        "pro",
        query,
      );

      // Should call semantic search with correct parameters
      expect(searchRelevantSummaries).toHaveBeenCalledWith(
        "user-1",
        query,
        "pro",
        10,
      );

      // Should include semantic memories in result
      expect(result.semanticMemories).toBeDefined();
      expect(result.semanticMemories).toHaveLength(2);
      expect(result.semanticMemories?.[0].conversationId).toBe("conv-123");
      expect(result.semanticMemories?.[0].relevanceScore).toBe(0.85);

      // Should still include regular memory fields
      expect(result.recentSummary).toBe("Discussed fractions");
      expect(result.keyFacts).toContain("prefers visual examples");
    });

    it("skips semantic search for Base tier users", async () => {
      // Mock Base tier config (semanticEnabled: false)
      vi.mocked(getTierMemoryLimits).mockReturnValue({
        recentConversations: 3,
        timeWindowDays: 15,
        maxKeyFacts: 10,
        maxTopics: 15,
        semanticEnabled: false,
        crossMaestroEnabled: false,
      });

      const mockConversation = createMockConversation({
        summary: "Regular session",
        keyFacts: '["fact1"]',
        topics: '["topic1"]',
      });
      vi.mocked(prisma.conversation.findMany).mockResolvedValue([
        mockConversation,
      ]);

      const query = "What did we discuss?";
      const result = await loadEnhancedContext(
        "user-1",
        "melissa",
        "base",
        query,
      );

      // Should NOT call semantic search for base tier
      expect(searchRelevantSummaries).not.toHaveBeenCalled();

      // Should still return regular memory
      expect(result.recentSummary).toBe("Regular session");
      expect(result.keyFacts).toContain("fact1");

      // semanticMemories should be undefined (not included)
      expect(result.semanticMemories).toBeUndefined();
    });

    it("skips semantic search for Trial tier users", async () => {
      // Mock Trial tier config
      vi.mocked(getTierMemoryLimits).mockReturnValue({
        recentConversations: 0,
        timeWindowDays: 0,
        maxKeyFacts: 0,
        maxTopics: 0,
        semanticEnabled: false,
        crossMaestroEnabled: false,
      });

      const query = "Some query";
      const result = await loadEnhancedContext(
        "user-1",
        "melissa",
        "trial",
        query,
      );

      // Should NOT call semantic search for trial tier
      expect(searchRelevantSummaries).not.toHaveBeenCalled();

      // Should return empty memory
      expect(result.recentSummary).toBeNull();
      expect(result.semanticMemories).toBeUndefined();
    });

    it("skips semantic search when no query provided", async () => {
      // Mock Pro tier config
      vi.mocked(getTierMemoryLimits).mockReturnValue({
        recentConversations: 5,
        timeWindowDays: null,
        maxKeyFacts: 50,
        maxTopics: 30,
        semanticEnabled: true,
        crossMaestroEnabled: true,
      });

      const mockConversation = createMockConversation({
        summary: "Session",
        keyFacts: "[]",
        topics: "[]",
      });
      vi.mocked(prisma.conversation.findMany).mockResolvedValue([
        mockConversation,
      ]);

      // Call without query
      const result = await loadEnhancedContext("user-1", "melissa", "pro");

      // Should NOT call semantic search without query
      expect(searchRelevantSummaries).not.toHaveBeenCalled();

      // Should still return regular memory
      expect(result.recentSummary).toBe("Session");
      expect(result.semanticMemories).toBeUndefined();
    });

    it("handles empty semantic search results gracefully", async () => {
      vi.mocked(getTierMemoryLimits).mockReturnValue({
        recentConversations: 5,
        timeWindowDays: null,
        maxKeyFacts: 50,
        maxTopics: 30,
        semanticEnabled: true,
        crossMaestroEnabled: true,
      });

      const mockConversation = createMockConversation({
        summary: "Session",
        keyFacts: "[]",
        topics: "[]",
      });
      vi.mocked(prisma.conversation.findMany).mockResolvedValue([
        mockConversation,
      ]);

      // Mock empty semantic results
      vi.mocked(searchRelevantSummaries).mockResolvedValue([]);

      const result = await loadEnhancedContext(
        "user-1",
        "melissa",
        "pro",
        "query",
      );

      // Should include empty array for semantic memories
      expect(result.semanticMemories).toEqual([]);
    });

    it("defaults to base tier when tierName not provided", async () => {
      vi.mocked(getTierMemoryLimits).mockReturnValue({
        recentConversations: 3,
        timeWindowDays: 15,
        maxKeyFacts: 10,
        maxTopics: 15,
        semanticEnabled: false,
        crossMaestroEnabled: false,
      });

      vi.mocked(prisma.conversation.findMany).mockResolvedValue([]);

      await loadEnhancedContext("user-1", "melissa");

      expect(getTierMemoryLimits).toHaveBeenCalledWith("base");
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

    it('returns "la settimana scorsa" for exactly 7 days ago', () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      expect(formatRelativeDate(sevenDaysAgo)).toBe("la settimana scorsa");
    });

    it("returns weeks for exactly 14 days ago", () => {
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
      expect(formatRelativeDate(fourteenDaysAgo)).toBe("2 settimane fa");
    });

    it('returns "il mese scorso" for exactly 30 days ago', () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      expect(formatRelativeDate(thirtyDaysAgo)).toBe("il mese scorso");
    });

    it("returns months for exactly 60 days ago", () => {
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      expect(formatRelativeDate(sixtyDaysAgo)).toBe("2 mesi fa");
    });
  });

  describe("loadPreviousContext - Error Handling", () => {
    it("handles database error gracefully and returns empty memory", async () => {
      vi.mocked(prisma.conversation.findMany).mockRejectedValue(
        new Error("Database connection failed"),
      );

      const result = await loadPreviousContext("user-1", "melissa", "base");

      expect(result).toEqual({
        recentSummary: null,
        keyFacts: [],
        topics: [],
        lastSessionDate: null,
      });
    });

    it("handles null summary in conversation data", async () => {
      const conversation = createMockConversation({
        summary: null,
        keyFacts: '["fact1", "fact2"]',
        topics: '["topic1"]',
      });
      vi.mocked(prisma.conversation.findMany).mockResolvedValue([conversation]);

      const result = await loadPreviousContext("user-1", "melissa", "base");

      expect(result.recentSummary).toBeNull();
      expect(result.keyFacts).toContain("fact1");
      expect(result.topics).toContain("topic1");
    });

    it("handles empty string summary (different from null)", async () => {
      const conversation = createMockConversation({
        summary: "",
        keyFacts: '["fact1"]',
        topics: '["topic1"]',
      });
      vi.mocked(prisma.conversation.findMany).mockResolvedValue([conversation]);

      const result = await loadPreviousContext("user-1", "melissa", "base");

      expect(result.recentSummary).toBe("");
      expect(result.keyFacts).toContain("fact1");
    });

    it("handles topic JSON with non-array JSON gracefully", async () => {
      const conversation = createMockConversation({
        summary: "Session",
        keyFacts: "[]",
        topics: '{"invalid": "object"}', // Not an array
      });
      vi.mocked(prisma.conversation.findMany).mockResolvedValue([conversation]);

      const result = await loadPreviousContext("user-1", "melissa", "base");

      expect(result.topics).toEqual([]); // Should gracefully handle non-array JSON
    });

    it("handles null keyFacts (different from invalid JSON)", async () => {
      const conversation = createMockConversation({
        summary: "Session",
        keyFacts: null,
        topics: '["topic1"]',
      });
      vi.mocked(prisma.conversation.findMany).mockResolvedValue([conversation]);

      const result = await loadPreviousContext("user-1", "melissa", "base");

      expect(result.keyFacts).toEqual([]);
      expect(result.topics).toContain("topic1");
    });

    it("handles topic JSON parsing with empty strings in array", async () => {
      const conversation = createMockConversation({
        summary: "Session",
        keyFacts: "[]",
        topics: '["", "  ", "valid_topic", null]',
      });
      vi.mocked(prisma.conversation.findMany).mockResolvedValue([conversation]);

      const result = await loadPreviousContext("user-1", "melissa", "base");

      // Only "valid_topic" should be included (empty strings and null filtered)
      expect(result.topics).toEqual(["valid_topic"]);
    });

    it("merges key facts with duplicate detection", async () => {
      const conversations = [
        createMockConversation({
          summary: "Session 1",
          keyFacts: '["duplicate", "unique1"]',
          topics: "[]",
        }),
        createMockConversation({
          summary: "Session 2",
          keyFacts: '["duplicate", "unique2"]',
          topics: "[]",
        }),
      ];
      vi.mocked(prisma.conversation.findMany).mockResolvedValue(conversations);

      const result = await loadPreviousContext("user-1", "melissa", "base");

      expect(result.keyFacts).toHaveLength(3); // duplicate, unique1, unique2
      expect(result.keyFacts).toEqual(
        expect.arrayContaining(["duplicate", "unique1", "unique2"]),
      );
    });

    it("merges topics with duplicate detection", async () => {
      const conversations = [
        createMockConversation({
          summary: "Session 1",
          keyFacts: "[]",
          topics: '["duplicate", "unique1"]',
        }),
        createMockConversation({
          summary: "Session 2",
          keyFacts: "[]",
          topics: '["duplicate", "unique2"]',
        }),
      ];
      vi.mocked(prisma.conversation.findMany).mockResolvedValue(conversations);

      const result = await loadPreviousContext("user-1", "melissa", "base");

      expect(result.topics).toHaveLength(3); // duplicate, unique1, unique2
      expect(result.topics).toEqual(
        expect.arrayContaining(["duplicate", "unique1", "unique2"]),
      );
    });

    it("respects both recentConversations and timeWindowDays together", async () => {
      vi.mocked(getTierMemoryLimits).mockReturnValue({
        recentConversations: 2,
        timeWindowDays: 5,
        maxKeyFacts: 10,
        maxTopics: 15,
        semanticEnabled: false,
        crossMaestroEnabled: false,
      });

      vi.mocked(prisma.conversation.findMany).mockResolvedValue([]);

      await loadPreviousContext("user-1", "melissa", "base");

      const call = vi.mocked(prisma.conversation.findMany).mock.calls[0][0];
      expect(call?.take).toBe(2);
      expect((call?.where as Record<string, unknown>)?.updatedAt).toBeDefined();
    });
  });

  describe("loadEnhancedContext - Error Handling", () => {
    it("handles database error and falls back to empty memory", async () => {
      vi.mocked(getTierMemoryLimits).mockReturnValue({
        recentConversations: 5,
        timeWindowDays: null,
        maxKeyFacts: 50,
        maxTopics: 30,
        semanticEnabled: true,
        crossMaestroEnabled: true,
      });

      vi.mocked(prisma.conversation.findMany).mockRejectedValue(
        new Error("Database error"),
      );

      const result = await loadEnhancedContext(
        "user-1",
        "melissa",
        "pro",
        "query",
      );

      // When database fails, loadPreviousContext handles it gracefully
      // loadEnhancedContext continues and calls searchRelevantSummaries
      expect(result).toMatchObject({
        recentSummary: null,
        keyFacts: [],
        topics: [],
        lastSessionDate: null,
      });
      // semanticMemories will be present if semantic search was attempted
      expect(result.semanticMemories).toBeDefined();
    });

    it("handles semantic search error and returns base memory only", async () => {
      vi.mocked(getTierMemoryLimits).mockReturnValue({
        recentConversations: 5,
        timeWindowDays: null,
        maxKeyFacts: 50,
        maxTopics: 30,
        semanticEnabled: true,
        crossMaestroEnabled: true,
      });

      const mockConversation = createMockConversation({
        summary: "Session",
        keyFacts: '["fact1"]',
        topics: '["topic1"]',
      });
      vi.mocked(prisma.conversation.findMany).mockResolvedValue([
        mockConversation,
      ]);

      vi.mocked(searchRelevantSummaries).mockRejectedValue(
        new Error("Semantic search failed"),
      );

      const result = await loadEnhancedContext(
        "user-1",
        "melissa",
        "pro",
        "query",
      );

      // Should return base memory without semantic results
      expect(result.recentSummary).toBe("Session");
      expect(result.keyFacts).toContain("fact1");
      expect(result.semanticMemories).toBeUndefined();
    });

    it("combines base memory structure correctly with semantic results", async () => {
      vi.mocked(getTierMemoryLimits).mockReturnValue({
        recentConversations: 5,
        timeWindowDays: null,
        maxKeyFacts: 50,
        maxTopics: 30,
        semanticEnabled: true,
        crossMaestroEnabled: true,
      });

      const mockConversation = createMockConversation({
        summary: "Base session",
        keyFacts: '["base_fact"]',
        topics: '["base_topic"]',
      });
      vi.mocked(prisma.conversation.findMany).mockResolvedValue([
        mockConversation,
      ]);

      const semanticResults = [
        {
          conversationId: "sem-conv-1",
          content: "Semantic content",
          relevanceScore: 0.9,
          date: new Date(),
          subject: "math",
          tags: ["semantic"],
        },
      ];
      vi.mocked(searchRelevantSummaries).mockResolvedValue(semanticResults);

      const result = await loadEnhancedContext(
        "user-1",
        "melissa",
        "pro",
        "query",
      );

      // Should have both base memory and semantic results
      expect(result.recentSummary).toBe("Base session");
      expect(result.keyFacts).toContain("base_fact");
      expect(result.topics).toContain("base_topic");
      expect(result.semanticMemories).toEqual(semanticResults);
    });
  });

  describe("loadHierarchicalContext", () => {
    beforeEach(() => {
      vi.mocked(prisma.hierarchicalSummary.findMany).mockResolvedValue([]);
    });

    it("returns empty hierarchical context for trial tier", async () => {
      vi.mocked(getTierMemoryLimits).mockReturnValue({
        recentConversations: 0,
        timeWindowDays: 0,
        maxKeyFacts: 0,
        maxTopics: 0,
        semanticEnabled: false,
        crossMaestroEnabled: false,
      });

      const { loadHierarchicalContext } = await import("../memory-loader");
      const result = await loadHierarchicalContext("user-1", {
        recentConversations: 0,
        timeWindowDays: 0,
        maxKeyFacts: 0,
        maxTopics: 0,
        semanticEnabled: false,
        crossMaestroEnabled: false,
      });

      expect(result).toEqual({
        weeklySummary: undefined,
        monthlySummary: undefined,
      });
    });

    it("returns empty hierarchical context for base tier without semanticEnabled", async () => {
      const { loadHierarchicalContext } = await import("../memory-loader");
      const result = await loadHierarchicalContext("user-1", {
        recentConversations: 3,
        timeWindowDays: 15,
        maxKeyFacts: 10,
        maxTopics: 15,
        semanticEnabled: false,
        crossMaestroEnabled: false,
      });

      expect(result).toEqual({
        weeklySummary: undefined,
        monthlySummary: undefined,
      });
    });

    it("loads weekly and monthly summaries for Pro tier", async () => {
      const mockWeeklySummary = {
        id: "summary-1",
        userId: "user-1",
        type: "weekly",
        startDate: new Date("2026-01-20"),
        endDate: new Date("2026-01-26"),
        keyThemes: ["fractions", "geometry"],
        consolidatedLearnings: ["understands basic fractions"],
        frequentTopics: [{ topic: "math", count: 5 }],
        sourceConversationIds: ["conv-1", "conv-2"],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockMonthlySummary = {
        id: "summary-2",
        userId: "user-1",
        type: "monthly",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-01-31"),
        keyThemes: ["math", "science"],
        consolidatedLearnings: ["completed unit 1", "started unit 2"],
        frequentTopics: [
          { topic: "math", count: 15 },
          { topic: "science", count: 8 },
        ],
        sourceConversationIds: ["conv-1", "conv-2", "conv-3"],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.hierarchicalSummary.findMany).mockResolvedValue([
        mockWeeklySummary,
        mockMonthlySummary,
      ]);

      const { loadHierarchicalContext } = await import("../memory-loader");
      const result = await loadHierarchicalContext("user-1", {
        recentConversations: 5,
        timeWindowDays: null,
        maxKeyFacts: 50,
        maxTopics: 30,
        semanticEnabled: true,
        crossMaestroEnabled: true,
      });

      expect(result.weeklySummary).toBeDefined();
      expect(result.monthlySummary).toBeDefined();
      expect(typeof result.weeklySummary).toBe("string");
      expect(typeof result.monthlySummary).toBe("string");
    });

    it("handles missing weekly summary gracefully", async () => {
      const mockMonthlySummary = {
        id: "summary-2",
        userId: "user-1",
        type: "monthly",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-01-31"),
        keyThemes: ["math"],
        consolidatedLearnings: ["completed unit 1"],
        frequentTopics: [{ topic: "math", count: 15 }],
        sourceConversationIds: ["conv-1"],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.hierarchicalSummary.findMany).mockResolvedValue([
        mockMonthlySummary,
      ]);

      const { loadHierarchicalContext } = await import("../memory-loader");
      const result = await loadHierarchicalContext("user-1", {
        recentConversations: 5,
        timeWindowDays: null,
        maxKeyFacts: 50,
        maxTopics: 30,
        semanticEnabled: true,
        crossMaestroEnabled: true,
      });

      expect(result.monthlySummary).toBeDefined();
      expect(result.weeklySummary).toBeUndefined();
    });
  });
});

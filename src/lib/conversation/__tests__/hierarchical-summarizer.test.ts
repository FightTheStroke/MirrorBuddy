import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    conversation: {
      findMany: vi.fn(),
    },
    hierarchicalSummary: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import {
  createWeeklySummary,
  createMonthlySummary,
} from "../hierarchical-summarizer";
import { prisma } from "@/lib/db";

describe("hierarchical-summarizer", () => {
  const userId = "test-user-1";

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock for create - returns a valid summary
    (prisma.hierarchicalSummary.create as any).mockImplementation(
      (args: any) => {
        return Promise.resolve({
          id: `summary-${Date.now()}`,
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      },
    );
  });

  describe("createWeeklySummary", () => {
    it("should aggregate 7 days of conversation summaries", async () => {
      const weekStart = new Date("2025-01-20");
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      // Mock conversations with summaries from 7 days
      const mockConversations = Array.from({ length: 7 }, (_, i) => ({
        id: `conv-${i}`,
        userId,
        summary: `Conversation ${i}: Learned about topic ${i}`,
        topics: JSON.stringify([`Topic ${i}`]),
        keyFacts: JSON.stringify({
          learned: [`Concept ${i}`, `Skill ${i}`],
        }),
        createdAt: new Date(weekStart),
        updatedAt: new Date(weekStart),
      }));

      (prisma.conversation.findMany as any).mockResolvedValueOnce(
        mockConversations,
      );

      const summary = await createWeeklySummary(userId, weekStart);

      expect(summary).toBeDefined();
      expect(summary.type).toBe("weekly");
      expect(summary.sourceConversationIds).toHaveLength(7);
      expect(summary.startDate.getTime()).toBe(weekStart.getTime());
      expect(prisma.hierarchicalSummary.create).toHaveBeenCalledTimes(1);
    });

    it("should extract key themes from summaries", async () => {
      const weekStart = new Date("2025-01-20");

      const mockConversations = [
        {
          id: "conv-1",
          userId,
          summary: "Studied fractions and percentages",
          topics: JSON.stringify(["Mathematics", "Fractions"]),
          keyFacts: JSON.stringify({
            learned: ["Fraction concepts", "Percentage calculations"],
          }),
          createdAt: weekStart,
          updatedAt: weekStart,
        },
        {
          id: "conv-2",
          userId,
          summary: "More work on fractions with real-world examples",
          topics: JSON.stringify(["Mathematics", "Fractions", "Applications"]),
          keyFacts: JSON.stringify({
            learned: ["Real-world fractions", "Practical applications"],
          }),
          createdAt: weekStart,
          updatedAt: weekStart,
        },
      ];

      (prisma.conversation.findMany as any).mockResolvedValueOnce(
        mockConversations,
      );

      const summary = await createWeeklySummary(userId, weekStart);

      expect(summary.keyThemes).toContain("Mathematics");
      expect(summary.frequentTopics.length).toBeGreaterThan(0);
    });

    it("should handle empty conversation data", async () => {
      const weekStart = new Date("2025-01-20");

      (prisma.conversation.findMany as any).mockResolvedValueOnce([]);

      const summary = await createWeeklySummary(userId, weekStart);

      expect(summary).toBeDefined();
      expect(summary.sourceConversationIds).toHaveLength(0);
      expect(summary.consolidatedLearnings).toHaveLength(0);
    });

    it("should track topic frequency correctly", async () => {
      const weekStart = new Date("2025-01-20");

      const mockConversations = [
        {
          id: "conv-1",
          userId,
          summary: "About math",
          topics: JSON.stringify(["Mathematics", "Algebra"]),
          keyFacts: JSON.stringify({ learned: ["Equations"] }),
          createdAt: weekStart,
          updatedAt: weekStart,
        },
        {
          id: "conv-2",
          userId,
          summary: "More math",
          topics: JSON.stringify(["Mathematics", "Geometry"]),
          keyFacts: JSON.stringify({ learned: ["Shapes"] }),
          createdAt: weekStart,
          updatedAt: weekStart,
        },
      ];

      (prisma.conversation.findMany as any).mockResolvedValueOnce(
        mockConversations,
      );

      const summary = await createWeeklySummary(userId, weekStart);

      const mathTopic = summary.frequentTopics.find(
        (t) => t.topic === "Mathematics",
      );
      expect(mathTopic?.count).toBe(2);
    });
  });

  describe("createMonthlySummary", () => {
    it("should aggregate 4 weeks of data into monthly summary", async () => {
      const monthStart = new Date("2025-01-01");

      // Mock weekly summaries
      const mockWeeklySummaries = Array.from({ length: 4 }, (_, i) => ({
        id: `week-${i}`,
        userId,
        type: "weekly" as const,
        startDate: new Date(monthStart),
        endDate: new Date(monthStart),
        keyThemes: [`Theme ${i}`, "Common Theme"],
        consolidatedLearnings: [`Learning ${i}`],
        frequentTopics: [{ topic: "Mathematics", count: 5 }],
        sourceConversationIds: [`conv-${i}`],
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      (prisma.hierarchicalSummary.findMany as any).mockResolvedValueOnce(
        mockWeeklySummaries,
      );

      const summary = await createMonthlySummary(userId, monthStart);

      expect(summary).toBeDefined();
      expect(summary.type).toBe("monthly");
      expect(summary.keyThemes.length).toBeGreaterThan(0);
    });

    it("should deduplicate themes across weeks", async () => {
      const monthStart = new Date("2025-01-01");

      const mockWeeklySummaries = [
        {
          id: "week-1",
          userId,
          type: "weekly" as const,
          keyThemes: ["Mathematics", "Fractions", "Practice"],
          consolidatedLearnings: ["Learned fractions well"],
          frequentTopics: [
            { topic: "Mathematics", count: 10 },
            { topic: "Fractions", count: 8 },
          ],
          sourceConversationIds: ["conv-1"],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "week-2",
          userId,
          type: "weekly" as const,
          keyThemes: ["Mathematics", "Geometry", "Practice"],
          consolidatedLearnings: ["Learned geometry"],
          frequentTopics: [
            { topic: "Mathematics", count: 12 },
            { topic: "Geometry", count: 10 },
          ],
          sourceConversationIds: ["conv-2"],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (prisma.hierarchicalSummary.findMany as any).mockResolvedValueOnce(
        mockWeeklySummaries,
      );

      const summary = await createMonthlySummary(userId, monthStart);

      // Should have unique themes
      const uniqueThemes = new Set(summary.keyThemes);
      expect(uniqueThemes.size).toBe(summary.keyThemes.length);

      // Should have 'Mathematics' (appears in both weeks)
      expect(summary.keyThemes).toContain("Mathematics");
    });

    it("should apply decay factor to older concepts", async () => {
      const monthStart = new Date("2025-01-01");
      const recentDate = new Date(monthStart);
      recentDate.setDate(recentDate.getDate() + 20);
      const oldDate = new Date(monthStart);
      oldDate.setDate(oldDate.getDate() + 2);

      const mockWeeklySummaries = [
        {
          id: "week-1",
          userId,
          type: "weekly" as const,
          startDate: oldDate,
          endDate: oldDate,
          keyThemes: ["Old Topic"],
          consolidatedLearnings: ["Old learning"],
          frequentTopics: [{ topic: "Old Topic", count: 1 }],
          sourceConversationIds: ["conv-1"],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "week-4",
          userId,
          type: "weekly" as const,
          startDate: recentDate,
          endDate: recentDate,
          keyThemes: ["Recent Topic"],
          consolidatedLearnings: ["Recent learning"],
          frequentTopics: [{ topic: "Recent Topic", count: 5 }],
          sourceConversationIds: ["conv-4"],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (prisma.hierarchicalSummary.findMany as any).mockResolvedValueOnce(
        mockWeeklySummaries,
      );

      const summary = await createMonthlySummary(userId, monthStart);

      // Recent topic should appear before old topic due to decay
      const recentIdx = summary.keyThemes.indexOf("Recent Topic");
      const oldIdx = summary.keyThemes.indexOf("Old Topic");
      expect(recentIdx).toBeLessThan(oldIdx);
    });

    it("should handle empty weekly data", async () => {
      const monthStart = new Date("2025-01-01");

      (prisma.hierarchicalSummary.findMany as any).mockResolvedValueOnce([]);

      const summary = await createMonthlySummary(userId, monthStart);

      expect(summary).toBeDefined();
      expect(summary.type).toBe("monthly");
      expect(summary.keyThemes).toHaveLength(0);
      expect(summary.consolidatedLearnings).toHaveLength(0);
    });
  });

  describe("HierarchicalSummary interface", () => {
    it("should have all required fields", async () => {
      const weekStart = new Date("2025-01-20");
      (prisma.conversation.findMany as any).mockResolvedValueOnce([]);

      const summary = await createWeeklySummary(userId, weekStart);

      expect(summary).toHaveProperty("id");
      expect(summary).toHaveProperty("userId");
      expect(summary).toHaveProperty("type");
      expect(summary).toHaveProperty("startDate");
      expect(summary).toHaveProperty("endDate");
      expect(summary).toHaveProperty("keyThemes");
      expect(summary).toHaveProperty("consolidatedLearnings");
      expect(summary).toHaveProperty("frequentTopics");
      expect(summary).toHaveProperty("sourceConversationIds");

      expect(summary.keyThemes).toBeInstanceOf(Array);
      expect(summary.consolidatedLearnings).toBeInstanceOf(Array);
      expect(summary.frequentTopics).toBeInstanceOf(Array);
      expect(summary.sourceConversationIds).toBeInstanceOf(Array);
    });
  });
});

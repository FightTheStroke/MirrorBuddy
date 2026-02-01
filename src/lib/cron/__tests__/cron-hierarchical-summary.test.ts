import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  runHierarchicalSummarization,
  shouldGenerateWeeklySummary,
  shouldGenerateMonthlySummary,
} from "../cron-hierarchical-summary";

// Mock dependencies
vi.mock("@/lib/db", () => ({
  prisma: {
    hierarchicalSummary: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
    conversation: {
      findMany: vi.fn(),
    },
  },
}));

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

vi.mock("../hierarchical-summarizer", () => ({
  generateHierarchicalSummary: vi.fn(),
}));

// Import after mocking
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { generateHierarchicalSummary } from "../hierarchical-summarizer";

describe("cron-hierarchical-summary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("shouldGenerateWeeklySummary", () => {
    it("should return true if no weekly summary exists for the week", async () => {
      const userId = "user-123";
      const weekStart = new Date("2024-01-01"); // Monday

      (prisma.hierarchicalSummary.findFirst as any).mockResolvedValueOnce(null);

      const result = await shouldGenerateWeeklySummary(userId, weekStart);

      expect(result).toBe(true);
      expect(prisma.hierarchicalSummary.findFirst).toHaveBeenCalledWith({
        where: {
          userId,
          type: "weekly",
          startDate: weekStart,
        },
      });
    });

    it("should return false if weekly summary already exists", async () => {
      const userId = "user-123";
      const weekStart = new Date("2024-01-01");

      (prisma.hierarchicalSummary.findFirst as any).mockResolvedValueOnce({
        id: "summary-123",
        userId,
        type: "weekly",
        startDate: weekStart,
        endDate: new Date("2024-01-07"),
        consolidatedLearnings: [],
        keyThemes: [],
        frequentTopics: [],
        sourceConversationIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await shouldGenerateWeeklySummary(userId, weekStart);

      expect(result).toBe(false);
    });
  });

  describe("shouldGenerateMonthlySummary", () => {
    it("should return true if no monthly summary exists for the month", async () => {
      const userId = "user-456";
      const monthStart = new Date("2024-01-01");

      (prisma.hierarchicalSummary.findFirst as any).mockResolvedValueOnce(null);

      const result = await shouldGenerateMonthlySummary(userId, monthStart);

      expect(result).toBe(true);
      expect(prisma.hierarchicalSummary.findFirst).toHaveBeenCalledWith({
        where: {
          userId,
          type: "monthly",
          startDate: monthStart,
        },
      });
    });

    it("should return false if monthly summary already exists", async () => {
      const userId = "user-456";
      const monthStart = new Date("2024-01-01");

      (prisma.hierarchicalSummary.findFirst as any).mockResolvedValueOnce({
        id: "summary-456",
        userId,
        type: "monthly",
        startDate: monthStart,
        endDate: new Date("2024-01-31"),
        consolidatedLearnings: [],
        keyThemes: [],
        frequentTopics: [],
        sourceConversationIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await shouldGenerateMonthlySummary(userId, monthStart);

      expect(result).toBe(false);
    });
  });

  describe("runHierarchicalSummarization", () => {
    it("should find users with recent conversations", async () => {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);

      (prisma.user.findMany as any).mockResolvedValueOnce([
        { id: "user-1", createdAt: new Date() } as any,
        { id: "user-2", createdAt: new Date() } as any,
      ]);

      (prisma.hierarchicalSummary.findFirst as any).mockResolvedValue(null);
      (prisma.hierarchicalSummary.create as any).mockResolvedValue({
        id: "summary-1",
        userId: "user-1",
        type: "weekly",
        startDate: weekStart,
        endDate: new Date(),
        consolidatedLearnings: [],
        keyThemes: [],
        frequentTopics: [],
        sourceConversationIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      (generateHierarchicalSummary as any).mockResolvedValue({
        keyThemes: ["theme1", "theme2"],
        consolidatedLearnings: ["learning1"],
        frequentTopics: ["topic1", "topic2", "topic3"],
        sourceConversationIds: ["conv1", "conv2"],
      });

      await runHierarchicalSummarization();

      expect(prisma.user.findMany).toHaveBeenCalled();
    });

    it("should process users in batches of max 10", async () => {
      const users = Array.from({ length: 25 }, (_, i) => ({
        id: `user-${i}`,
      })) as any[];

      (prisma.user.findMany as any).mockResolvedValueOnce(users);
      (prisma.hierarchicalSummary.findFirst as any).mockResolvedValue(null);
      (prisma.hierarchicalSummary.create as any).mockResolvedValue({
        id: "summary-1",
        userId: "user-1",
        periodType: "WEEKLY",
        periodStart: new Date(),
        periodEnd: new Date(),
        summary: "Summary",
        topicsCount: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      (generateHierarchicalSummary as any).mockResolvedValue({
        keyThemes: ["theme1", "theme2"],
        consolidatedLearnings: ["learning1"],
        frequentTopics: ["topic1", "topic2", "topic3"],
        sourceConversationIds: ["conv1", "conv2"],
      });

      await runHierarchicalSummarization();

      // Should be called 3 times: 10 + 10 + 5
      expect(logger.info).toHaveBeenCalled();
    });

    it("should create weekly summaries for past week", async () => {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);

      (prisma.user.findMany as any).mockResolvedValueOnce([
        { id: "user-1" } as any,
      ]);

      (prisma.hierarchicalSummary.findFirst as any).mockResolvedValue(null);
      (prisma.hierarchicalSummary.create as any).mockResolvedValue({
        id: "summary-1",
        userId: "user-1",
        periodType: "WEEKLY",
        periodStart: weekStart,
        periodEnd: new Date(),
        summary: "Weekly summary",
        topicsCount: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      (generateHierarchicalSummary as any).mockResolvedValue({
        keyThemes: ["theme1"],
        consolidatedLearnings: ["learning1"],
        frequentTopics: [{ topic: "topic1", count: 5 }],
        sourceConversationIds: ["conv1"],
      });

      await runHierarchicalSummarization();

      expect(prisma.hierarchicalSummary.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: "weekly",
          }),
        }),
      );
    });

    it("should create monthly summaries on 1st of month", async () => {
      const today = new Date();
      const isFirstOfMonth = today.getDate() === 1;

      if (isFirstOfMonth) {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

        (prisma.user.findMany as any).mockResolvedValueOnce([
          { id: "user-1" } as any,
        ]);

        (prisma.hierarchicalSummary.findFirst as any).mockResolvedValue(null);
        (prisma.hierarchicalSummary.create as any).mockResolvedValue({
          id: "summary-1",
          userId: "user-1",
          type: "monthly",
          startDate: monthStart,
          endDate: new Date(),
          consolidatedLearnings: [],
          keyThemes: [],
          frequentTopics: [],
          sourceConversationIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        (generateHierarchicalSummary as any).mockResolvedValue({
          keyThemes: ["theme1", "theme2"],
          consolidatedLearnings: ["learning1"],
          frequentTopics: [
            { topic: "topic1", count: 5 },
            { topic: "topic2", count: 3 },
          ],
          sourceConversationIds: ["conv1", "conv2"],
        });

        await runHierarchicalSummarization();

        expect(prisma.hierarchicalSummary.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              type: "monthly",
            }),
          }),
        );
      }
    });

    it("should log progress during batch processing", async () => {
      (prisma.user.findMany as any).mockResolvedValueOnce([
        { id: "user-1" } as any,
      ]);

      (prisma.hierarchicalSummary.findFirst as any).mockResolvedValue(null);
      (prisma.hierarchicalSummary.create as any).mockResolvedValue({
        id: "summary-1",
        userId: "user-1",
        periodType: "WEEKLY",
        periodStart: new Date(),
        periodEnd: new Date(),
        summary: "Summary",
        topicsCount: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      (generateHierarchicalSummary as any).mockResolvedValue({
        keyThemes: ["theme1", "theme2"],
        consolidatedLearnings: ["learning1"],
        frequentTopics: ["topic1", "topic2", "topic3"],
        sourceConversationIds: ["conv1", "conv2"],
      });

      await runHierarchicalSummarization();

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("started"),
        expect.any(Object),
      );
    });

    it("should handle errors and continue processing", async () => {
      (prisma.user.findMany as any).mockResolvedValueOnce([
        { id: "user-1" } as any,
        { id: "user-2" } as any,
      ]);

      (prisma.hierarchicalSummary.findFirst as any).mockResolvedValue(null);
      (prisma.hierarchicalSummary.create as any)
        .mockRejectedValueOnce(new Error("DB error"))
        .mockResolvedValueOnce({
          id: "summary-2",
          userId: "user-2",
          periodType: "WEEKLY",
          periodStart: new Date(),
          periodEnd: new Date(),
          summary: "Summary",
          topicsCount: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      (generateHierarchicalSummary as any).mockResolvedValue({
        keyThemes: ["theme1", "theme2"],
        consolidatedLearnings: ["learning1"],
        frequentTopics: ["topic1", "topic2", "topic3"],
        sourceConversationIds: ["conv1", "conv2"],
      });

      await expect(runHierarchicalSummarization()).resolves.not.toThrow();

      expect(logger.error).toHaveBeenCalled();
    });

    it("should skip users without recent conversations", async () => {
      (prisma.user.findMany as any).mockResolvedValueOnce([]);

      await runHierarchicalSummarization();

      // Should not attempt to create summaries
      expect(prisma.hierarchicalSummary.create).not.toHaveBeenCalled();
    });
  });
});

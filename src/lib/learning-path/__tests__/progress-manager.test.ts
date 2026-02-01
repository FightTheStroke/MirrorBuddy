/**
 * Tests for progress-manager.ts
 * Plan 8 MVP - Wave 2: Learning Path Generation [F-14]
 *
 * @vitest-environment node
 * @module learning-path/__tests__/progress-manager.test
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  startTopic,
  completeTopic,
  getPathProgress,
  resetTopic,
} from "../progress-manager";

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

// Mock prisma - use vi.hoisted to ensure mockPrisma is available during mock hoisting
const { mockPrisma } = vi.hoisted(() => {
  const mock = {
    learningPathTopic: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    learningPath: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  // Make $transaction call the callback with the same mock
  mock.$transaction.mockImplementation(
    async (callback: (tx: typeof mock) => Promise<unknown>) => {
      return callback(mock);
    },
  );
  return { mockPrisma: mock };
});

vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

import { prisma } from "@/lib/db";

describe("progress-manager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // startTopic - [F-14]
  // ============================================================================
  describe("startTopic", () => {
    it("should start an unlocked topic [F-14]", async () => {
      vi.mocked(prisma.learningPathTopic.findUnique).mockResolvedValue({
        id: "topic-1",
        pathId: "path-1",
        order: 1,
        title: "Topic 1",
        description: "Desc",
        keyConcepts: "[]",
        difficulty: "basic",
        status: "unlocked",
        estimatedMinutes: 10,
        relatedMaterials: "[]",
        quizScore: null,
        startedAt: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(prisma.learningPathTopic.update).mockResolvedValue({} as never);

      const result = await startTopic("topic-1");

      expect(result.success).toBe(true);
      expect(prisma.learningPathTopic.update).toHaveBeenCalledWith({
        where: { id: "topic-1" },
        data: expect.objectContaining({
          status: "in_progress",
        }),
      });
    });

    it("should fail for locked topic [F-14]", async () => {
      vi.mocked(prisma.learningPathTopic.findUnique).mockResolvedValue({
        id: "topic-1",
        pathId: "path-1",
        order: 1,
        title: "Topic 1",
        description: "Desc",
        keyConcepts: "[]",
        difficulty: "basic",
        status: "locked",
        estimatedMinutes: 10,
        relatedMaterials: "[]",
        quizScore: null,
        startedAt: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await startTopic("topic-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Topic is locked");
    });

    it("should fail for non-existent topic [F-14]", async () => {
      vi.mocked(prisma.learningPathTopic.findUnique).mockResolvedValue(null);

      const result = await startTopic("nonexistent");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Topic not found");
    });
  });

  // ============================================================================
  // completeTopic - [F-14]
  // ============================================================================
  describe("completeTopic", () => {
    const mockPath = {
      id: "path-1",
      userId: "user-1",
      title: "Test Path",
      description: null,
      subject: "storia",
      sourceStudyKitId: null,
      totalTopics: 3,
      completedTopics: 0,
      progressPercent: 0,
      estimatedMinutes: 30,
      status: "in_progress",
      visualOverview: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
      topics: [
        {
          id: "topic-1",
          pathId: "path-1",
          order: 1,
          title: "Topic 1",
          status: "in_progress",
        },
        {
          id: "topic-2",
          pathId: "path-1",
          order: 2,
          title: "Topic 2",
          status: "locked",
        },
        {
          id: "topic-3",
          pathId: "path-1",
          order: 3,
          title: "Topic 3",
          status: "locked",
        },
      ],
    };

    it("should complete topic and unlock next [F-14]", async () => {
      vi.mocked(prisma.learningPathTopic.findUnique).mockResolvedValue({
        id: "topic-1",
        pathId: "path-1",
        order: 1,
        title: "Topic 1",
        description: "Desc",
        keyConcepts: "[]",
        difficulty: "basic",
        status: "in_progress",
        estimatedMinutes: 10,
        relatedMaterials: "[]",
        quizScore: null,
        startedAt: new Date(),
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        path: mockPath,
      } as never);

      vi.mocked(prisma.learningPathTopic.update).mockResolvedValue({} as never);
      vi.mocked(prisma.learningPath.update).mockResolvedValue({} as never);

      const result = await completeTopic("topic-1", 85);

      expect(result.topicId).toBe("topic-1");
      expect(result.newStatus).toBe("completed");
      expect(result.quizScore).toBe(85);
      expect(result.unlockedNext).toBe(true);
      expect(result.nextTopicId).toBe("topic-2");
      expect(result.pathProgress).toBe(33); // 1/3
      expect(result.pathCompleted).toBe(false);
    });

    it("should mark path complete when all topics done [F-14]", async () => {
      const lastTopicPath = {
        ...mockPath,
        completedTopics: 2,
        topics: [
          { id: "topic-1", pathId: "path-1", order: 1, status: "completed" },
          { id: "topic-2", pathId: "path-1", order: 2, status: "completed" },
          { id: "topic-3", pathId: "path-1", order: 3, status: "in_progress" },
        ],
      };

      vi.mocked(prisma.learningPathTopic.findUnique).mockResolvedValue({
        id: "topic-3",
        pathId: "path-1",
        order: 3,
        title: "Topic 3",
        description: "Desc",
        keyConcepts: "[]",
        difficulty: "advanced",
        status: "in_progress",
        estimatedMinutes: 10,
        relatedMaterials: "[]",
        quizScore: null,
        startedAt: new Date(),
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        path: lastTopicPath,
      } as never);

      vi.mocked(prisma.learningPathTopic.update).mockResolvedValue({} as never);
      vi.mocked(prisma.learningPath.update).mockResolvedValue({} as never);

      const result = await completeTopic("topic-3", 90);

      expect(result.pathProgress).toBe(100);
      expect(result.pathCompleted).toBe(true);
      expect(result.unlockedNext).toBe(false);
    });

    it("should throw for locked topic [F-14]", async () => {
      vi.mocked(prisma.learningPathTopic.findUnique).mockResolvedValue({
        id: "topic-1",
        pathId: "path-1",
        order: 1,
        title: "Topic 1",
        description: "Desc",
        keyConcepts: "[]",
        difficulty: "basic",
        status: "locked",
        estimatedMinutes: 10,
        relatedMaterials: "[]",
        quizScore: null,
        startedAt: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        path: mockPath,
      } as never);

      await expect(completeTopic("topic-1")).rejects.toThrow(
        "Cannot complete a locked topic",
      );
    });
  });

  // ============================================================================
  // getPathProgress - [F-14]
  // ============================================================================
  describe("getPathProgress", () => {
    it("should return path progress [F-14]", async () => {
      vi.mocked(prisma.learningPath.findUnique).mockResolvedValue({
        id: "path-1",
        userId: "user-1",
        title: "Test Path",
        description: null,
        subject: null,
        sourceStudyKitId: null,
        totalTopics: 5,
        completedTopics: 2,
        progressPercent: 40,
        estimatedMinutes: 50,
        status: "in_progress",
        visualOverview: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
        topics: [
          { id: "t1", order: 1, status: "completed" },
          { id: "t2", order: 2, status: "completed" },
          { id: "t3", order: 3, status: "in_progress" },
          { id: "t4", order: 4, status: "locked" },
          { id: "t5", order: 5, status: "locked" },
        ],
      } as never);

      const result = await getPathProgress("path-1");

      expect(result.totalTopics).toBe(5);
      expect(result.completedTopics).toBe(2);
      expect(result.progressPercent).toBe(40);
      expect(result.currentTopic).toBe("t3");
      expect(result.isCompleted).toBe(false);
    });

    it("should throw for non-existent path [F-14]", async () => {
      vi.mocked(prisma.learningPath.findUnique).mockResolvedValue(null);

      await expect(getPathProgress("nonexistent")).rejects.toThrow(
        "Path not found",
      );
    });
  });

  // ============================================================================
  // resetTopic - [F-14]
  // ============================================================================
  describe("resetTopic", () => {
    it("should reset completed topic [F-14]", async () => {
      vi.mocked(prisma.learningPathTopic.findUnique).mockResolvedValue({
        id: "topic-1",
        pathId: "path-1",
        order: 1,
        title: "Topic 1",
        description: "Desc",
        keyConcepts: "[]",
        difficulty: "basic",
        status: "completed",
        estimatedMinutes: 10,
        relatedMaterials: "[]",
        quizScore: 85,
        startedAt: new Date(),
        completedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(prisma.learningPathTopic.update).mockResolvedValue({} as never);

      const result = await resetTopic("topic-1");

      expect(result.success).toBe(true);
      expect(prisma.learningPathTopic.update).toHaveBeenCalledWith({
        where: { id: "topic-1" },
        data: {
          status: "unlocked",
          startedAt: null,
          completedAt: null,
          quizScore: null,
        },
      });
    });

    it("should fail for locked topic [F-14]", async () => {
      vi.mocked(prisma.learningPathTopic.findUnique).mockResolvedValue({
        id: "topic-1",
        pathId: "path-1",
        order: 1,
        title: "Topic 1",
        description: "Desc",
        keyConcepts: "[]",
        difficulty: "basic",
        status: "locked",
        estimatedMinutes: 10,
        relatedMaterials: "[]",
        quizScore: null,
        startedAt: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await resetTopic("topic-1");

      expect(result.success).toBe(false);
    });
  });
});

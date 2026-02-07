/**
 * Tests for path-generator.ts
 * Plan 8 MVP - Wave 2: Learning Path Generation [F-11]
 *
 * @vitest-environment node
 * @module learning-path/__tests__/path-generator.test
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { generateVisualOverview, createLearningPath } from "../path-generator";
import type { IdentifiedTopic, TopicAnalysisResult } from "../topic-analyzer";
import type { TopicWithRelations } from "../material-linker";

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

// Mock AI provider
vi.mock("@/lib/ai/providers", () => ({
  chatCompletion: vi.fn(),
}));

// Mock tier service (ADR 0073)
vi.mock("@/lib/tier/tier-service", () => ({
  tierService: {
    getFeatureAIConfigForUser: vi.fn(() =>
      Promise.resolve({ model: "gpt-4o", temperature: 0.3, maxTokens: 500 }),
    ),
  },
}));

// Mock deployment mapping
vi.mock("@/lib/ai/providers/deployment-mapping", () => ({
  getDeploymentForModel: vi.fn((model: string) => model),
}));

// Mock prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    learningPath: {
      create: vi.fn(),
      update: vi.fn(),
    },
    learningPathTopic: {
      create: vi.fn(),
      createMany: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { chatCompletion } from "@/lib/ai/server";
import { prisma } from "@/lib/db";

const mockChatCompletion = vi.mocked(chatCompletion);

describe("path-generator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // generateVisualOverview - [F-11]
  // ============================================================================
  describe("generateVisualOverview", () => {
    const createTopic = (
      id: string,
      title: string,
      order: number,
      difficulty: "basic" | "intermediate" | "advanced" = "intermediate",
    ): IdentifiedTopic => ({
      id,
      title,
      description: `Description for ${title}`,
      keyConcepts: ["concept1", "concept2"],
      estimatedDifficulty: difficulty,
      order,
      textExcerpt: "Sample text...",
    });

    it("should generate simple overview for 2-3 topics without AI [F-11]", async () => {
      const topics = [
        createTopic("t1", "Argomento Uno", 1),
        createTopic("t2", "Argomento Due", 2),
      ];

      const result = await generateVisualOverview(topics, "Test Path");

      expect(result).toContain("flowchart TD");
      expect(result).toContain('T0["Argomento Uno"]');
      expect(result).toContain('T1["Argomento Due"]');
      expect(result).toContain("T0 --> T1");

      // Should NOT call AI for small topic count
      expect(mockChatCompletion).not.toHaveBeenCalled();
    });

    it("should generate empty diagram for no topics", async () => {
      const result = await generateVisualOverview([], "Empty Path");

      expect(result).toContain("flowchart TD");
      expect(result).toContain("Nessun argomento");
    });

    it("should use AI for 4+ topics [F-11]", async () => {
      const topics = [
        createTopic("t1", "Topic A", 1),
        createTopic("t2", "Topic B", 2),
        createTopic("t3", "Topic C", 3),
        createTopic("t4", "Topic D", 4),
      ];

      mockChatCompletion.mockResolvedValue({
        content:
          'flowchart TD\n    T0["A"] --> T1["B"]\n    T1 --> T2["C"]\n    T2 --> T3["D"]',
        provider: "azure" as const,
        model: "gpt-4o",
      });

      const result = await generateVisualOverview(topics, "Complex Path");

      expect(mockChatCompletion).toHaveBeenCalled();
      expect(result).toContain("flowchart TD");
    });

    it("should fallback to simple on AI error [F-11]", async () => {
      const topics = [
        createTopic("t1", "A", 1),
        createTopic("t2", "B", 2),
        createTopic("t3", "C", 3),
        createTopic("t4", "D", 4),
      ];

      mockChatCompletion.mockRejectedValue(new Error("AI unavailable"));

      const result = await generateVisualOverview(topics, "Test");

      expect(result).toContain("flowchart TD");
      expect(result).toContain('T0["A"]');
    });

    it("should fallback to simple on invalid AI response [F-11]", async () => {
      const topics = [
        createTopic("t1", "A", 1),
        createTopic("t2", "B", 2),
        createTopic("t3", "C", 3),
        createTopic("t4", "D", 4),
      ];

      mockChatCompletion.mockResolvedValue({
        content: "This is not valid Mermaid code",
        provider: "azure" as const,
        model: "gpt-4o",
      });

      const result = await generateVisualOverview(topics, "Test");

      expect(result).toContain("flowchart TD");
      expect(result).toContain('T0["A"]');
    });

    it("should sort topics by order", async () => {
      const topics = [
        createTopic("t3", "Third", 3),
        createTopic("t1", "First", 1),
        createTopic("t2", "Second", 2),
      ];

      const result = await generateVisualOverview(topics, "Test");

      // Verify order: First (T0) -> Second (T1) -> Third (T2)
      expect(result).toMatch(/T0\["First"\]/);
      expect(result).toMatch(/T1\["Second"\]/);
      expect(result).toMatch(/T2\["Third"\]/);
    });
  });

  // ============================================================================
  // createLearningPath
  // ============================================================================
  describe("createLearningPath", () => {
    const mockAnalysis: TopicAnalysisResult = {
      documentTitle: "Storia Romana",
      subject: "storia",
      topics: [
        {
          id: "t1",
          title: "Le Origini",
          description: "Fondazione di Roma",
          keyConcepts: ["Romolo", "Remo"],
          estimatedDifficulty: "basic",
          order: 1,
          textExcerpt: "Roma fu fondata...",
        },
        {
          id: "t2",
          title: "La Repubblica",
          description: "Periodo repubblicano",
          keyConcepts: ["Senato", "Consoli"],
          estimatedDifficulty: "intermediate",
          order: 2,
          textExcerpt: "La repubblica...",
        },
      ],
      suggestedOrder: ["t1", "t2"],
      totalEstimatedMinutes: 30,
    };

    const mockTopicsWithRelations: TopicWithRelations[] =
      mockAnalysis.topics.map((t) => ({
        ...t,
        relatedMaterials: [],
      }));

    it("should create path with topics in database", async () => {
      vi.mocked(prisma.learningPath.create).mockResolvedValue({
        id: "path-123",
        userId: "user-1",
        title: "Storia Romana",
        description: null,
        subject: "storia",
        sourceStudyKitId: null,
        totalTopics: 2,
        completedTopics: 0,
        progressPercent: 0,
        estimatedMinutes: 30,
        status: "ready",
        visualOverview: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
      });

      // Mock createMany (batch insert)
      vi.mocked(prisma.learningPathTopic.createMany).mockResolvedValue({
        count: 2,
      });

      // Mock findMany to return created topics
      vi.mocked(prisma.learningPathTopic.findMany).mockResolvedValue([
        {
          id: "topic-1",
          pathId: "path-123",
          order: 0,
          title: "Repubblica Romana",
          description: "Description for Repubblica Romana",
          keyConcepts: JSON.stringify(["concept1", "concept2"]),
          difficulty: "basic",
          status: "unlocked",
          estimatedMinutes: 10,
          relatedMaterials: JSON.stringify([]),
          quizScore: null,
          startedAt: null,
          completedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "topic-2",
          pathId: "path-123",
          order: 1,
          title: "Impero Romano",
          description: "Description for Impero Romano",
          keyConcepts: JSON.stringify(["concept1", "concept2"]),
          difficulty: "intermediate",
          status: "locked",
          estimatedMinutes: 10,
          relatedMaterials: JSON.stringify([]),
          quizScore: null,
          startedAt: null,
          completedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await createLearningPath(
        "user-1",
        mockAnalysis,
        mockTopicsWithRelations,
      );

      expect(result.id).toBe("path-123");
      expect(result.title).toBe("Storia Romana");
      expect(result.topics).toHaveLength(2);

      // Verify first topic is unlocked
      expect(result.topics[0].status).toBe("unlocked");
      // Second topic should be locked
      expect(result.topics[1].status).toBe("locked");
    });

    it("should include visual overview by default", async () => {
      vi.mocked(prisma.learningPath.create).mockResolvedValue({
        id: "path-456",
        userId: "user-1",
        title: "Test",
        description: null,
        subject: null,
        sourceStudyKitId: null,
        totalTopics: 2,
        completedTopics: 0,
        progressPercent: 0,
        estimatedMinutes: 30,
        status: "ready",
        visualOverview: "flowchart TD...",
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
      });

      vi.mocked(prisma.learningPathTopic.createMany).mockResolvedValue({
        count: 2,
      });
      vi.mocked(prisma.learningPathTopic.findMany).mockResolvedValue([
        {
          id: "topic-1",
          pathId: "path-456",
          order: 0,
          title: "Repubblica Romana",
          description: "Description",
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
        },
        {
          id: "topic-2",
          pathId: "path-456",
          order: 1,
          title: "Impero Romano",
          description: "Description",
          keyConcepts: "[]",
          difficulty: "intermediate",
          status: "locked",
          estimatedMinutes: 10,
          relatedMaterials: "[]",
          quizScore: null,
          startedAt: null,
          completedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await createLearningPath(
        "user-1",
        mockAnalysis,
        mockTopicsWithRelations,
      );

      expect(result.visualOverview).toBeDefined();
    });

    it("should skip visual overview when disabled", async () => {
      vi.mocked(prisma.learningPath.create).mockResolvedValue({
        id: "path-789",
        userId: "user-1",
        title: "Test",
        description: null,
        subject: null,
        sourceStudyKitId: null,
        totalTopics: 2,
        completedTopics: 0,
        progressPercent: 0,
        estimatedMinutes: 30,
        status: "ready",
        visualOverview: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
      });

      vi.mocked(prisma.learningPathTopic.createMany).mockResolvedValue({
        count: 2,
      });
      vi.mocked(prisma.learningPathTopic.findMany).mockResolvedValue([
        {
          id: "topic-1",
          pathId: "path-789",
          order: 0,
          title: "Repubblica Romana",
          description: "Description",
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
        },
        {
          id: "topic-2",
          pathId: "path-789",
          order: 1,
          title: "Impero Romano",
          description: "Description",
          keyConcepts: "[]",
          difficulty: "intermediate",
          status: "locked",
          estimatedMinutes: 10,
          relatedMaterials: "[]",
          quizScore: null,
          startedAt: null,
          completedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await createLearningPath(
        "user-1",
        mockAnalysis,
        mockTopicsWithRelations,
        undefined,
        { includeVisualOverview: false },
      );

      expect(result.visualOverview).toBeUndefined();
    });
  });
});

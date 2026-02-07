/**
 * Tests for topic-material-generator.ts
 * Plan 8 MVP - Wave 2: Learning Path Generation [F-12]
 *
 * @vitest-environment node
 * @module learning-path/__tests__/topic-material-generator.test
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  generateTopicFlashcards,
  generateTopicQuiz,
  generateTopicMindmap,
  generateTopicMaterials,
  type TopicContext,
} from "../topic-material-generator";

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
      Promise.resolve({ model: "gpt-4o", temperature: 0.7, maxTokens: 1500 }),
    ),
  },
}));

// Mock deployment mapping
vi.mock("@/lib/ai/providers/deployment-mapping", () => ({
  getDeploymentForModel: vi.fn((model: string) => model),
}));

import { chatCompletion } from "@/lib/ai";

const mockChatCompletion = vi.mocked(chatCompletion);

describe("topic-material-generator", () => {
  const mockTopic: TopicContext = {
    title: "La Rivoluzione Francese",
    description: "Eventi e cause della Rivoluzione Francese del 1789",
    keyConcepts: [
      "Bastiglia",
      "Luigi XVI",
      "Terzo Stato",
      "Dichiarazione dei Diritti",
    ],
    textExcerpt:
      "La Rivoluzione Francese iniziò nel 1789 con la presa della Bastiglia...",
    difficulty: "intermediate",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // generateTopicFlashcards - [F-12]
  // ============================================================================
  describe("generateTopicFlashcards", () => {
    it("should generate flashcards from AI response [F-12]", async () => {
      mockChatCompletion.mockResolvedValue({
        content: JSON.stringify({
          topic: "La Rivoluzione Francese",
          cards: [
            { front: "Quando iniziò la Rivoluzione?", back: "1789" },
            { front: "Chi era il re di Francia?", back: "Luigi XVI" },
          ],
        }),
        provider: "azure" as const,
        model: "gpt-4o",
      });

      const result = await generateTopicFlashcards(mockTopic, 2);

      expect(result.topic).toBe("La Rivoluzione Francese");
      expect(result.cards).toHaveLength(2);
      expect(result.cards[0].front).toBe("Quando iniziò la Rivoluzione?");
      expect(result.cards[0].back).toBe("1789");
    });

    it("should handle JSON with markdown fences", async () => {
      mockChatCompletion.mockResolvedValue({
        content:
          '```json\n{"topic": "Test", "cards": [{"front": "Q?", "back": "A"}]}\n```',
        provider: "azure" as const,
        model: "gpt-4o",
      });

      const result = await generateTopicFlashcards(mockTopic);

      expect(result.topic).toBe("Test");
      expect(result.cards).toHaveLength(1);
    });

    it("should throw on invalid JSON response", async () => {
      mockChatCompletion.mockResolvedValue({
        content: "Not valid JSON",
        provider: "azure" as const,
        model: "gpt-4o",
      });

      await expect(generateTopicFlashcards(mockTopic)).rejects.toThrow(
        "Failed to parse flashcards JSON",
      );
    });
  });

  // ============================================================================
  // generateTopicQuiz - [F-12]
  // ============================================================================
  describe("generateTopicQuiz", () => {
    it("should generate quiz from AI response [F-12]", async () => {
      mockChatCompletion.mockResolvedValue({
        content: JSON.stringify({
          topic: "La Rivoluzione Francese",
          questions: [
            {
              question: "In che anno iniziò la Rivoluzione?",
              options: ["1788", "1789", "1790", "1791"],
              correctIndex: 1,
              explanation:
                "La Rivoluzione iniziò nel 1789 con la presa della Bastiglia",
            },
          ],
        }),
        provider: "azure" as const,
        model: "gpt-4o",
      });

      const result = await generateTopicQuiz(mockTopic, 1);

      expect(result.topic).toBe("La Rivoluzione Francese");
      expect(result.questions).toHaveLength(1);
      expect(result.questions[0].correctIndex).toBe(1);
      expect(result.questions[0].options).toHaveLength(4);
    });

    it("should throw on invalid JSON response", async () => {
      mockChatCompletion.mockResolvedValue({
        content: "Invalid response",
        provider: "azure" as const,
        model: "gpt-4o",
      });

      await expect(generateTopicQuiz(mockTopic)).rejects.toThrow(
        "Failed to parse quiz JSON",
      );
    });
  });

  // ============================================================================
  // generateTopicMindmap - [F-12]
  // ============================================================================
  describe("generateTopicMindmap", () => {
    it("should generate mindmap from AI response [F-12]", async () => {
      mockChatCompletion.mockResolvedValue({
        content: JSON.stringify({
          title: "La Rivoluzione Francese",
          nodes: [
            { id: "1", label: "Cause" },
            { id: "1a", label: "Crisi economica", parentId: "1" },
            { id: "2", label: "Eventi" },
            { id: "2a", label: "Bastiglia", parentId: "2" },
          ],
        }),
        provider: "azure" as const,
        model: "gpt-4o",
      });

      const result = await generateTopicMindmap(mockTopic);

      expect(result.title).toBe("La Rivoluzione Francese");
      expect(result.nodes).toHaveLength(4);
      expect(result.nodes[1].parentId).toBe("1");
    });

    it("should throw on invalid JSON response", async () => {
      mockChatCompletion.mockResolvedValue({
        content: "Not a mindmap",
        provider: "azure" as const,
        model: "gpt-4o",
      });

      await expect(generateTopicMindmap(mockTopic)).rejects.toThrow(
        "Failed to parse mindmap JSON",
      );
    });
  });

  // ============================================================================
  // generateTopicMaterials - [F-12]
  // ============================================================================
  describe("generateTopicMaterials", () => {
    it("should generate flashcards and quiz in parallel [F-12]", async () => {
      // First call is for flashcards, second is for quiz
      mockChatCompletion
        .mockResolvedValueOnce({
          content: JSON.stringify({
            topic: "Test",
            cards: [{ front: "Q?", back: "A" }],
          }),
          provider: "azure" as const,
          model: "gpt-4o",
        })
        .mockResolvedValueOnce({
          content: JSON.stringify({
            topic: "Test",
            questions: [
              {
                question: "Q?",
                options: ["A", "B", "C", "D"],
                correctIndex: 0,
              },
            ],
          }),
          provider: "azure" as const,
          model: "gpt-4o",
        });

      const result = await generateTopicMaterials(mockTopic);

      expect(result.flashcards.cards).toHaveLength(1);
      expect(result.quiz.questions).toHaveLength(1);
      expect(result.mindmap).toBeUndefined();
    });

    it("should include mindmap when requested [F-12]", async () => {
      mockChatCompletion
        .mockResolvedValueOnce({
          content: JSON.stringify({
            topic: "Test",
            cards: [{ front: "Q?", back: "A" }],
          }),
          provider: "azure" as const,
          model: "gpt-4o",
        })
        .mockResolvedValueOnce({
          content: JSON.stringify({
            topic: "Test",
            questions: [
              {
                question: "Q?",
                options: ["A", "B", "C", "D"],
                correctIndex: 0,
              },
            ],
          }),
          provider: "azure" as const,
          model: "gpt-4o",
        })
        .mockResolvedValueOnce({
          content: JSON.stringify({
            title: "Test",
            nodes: [{ id: "1", label: "Node 1" }],
          }),
          provider: "azure" as const,
          model: "gpt-4o",
        });

      const result = await generateTopicMaterials(mockTopic, {
        includeMindmap: true,
      });

      expect(result.flashcards).toBeDefined();
      expect(result.quiz).toBeDefined();
      expect(result.mindmap).toBeDefined();
      expect(result.mindmap?.nodes).toHaveLength(1);
    });

    it("should respect custom counts [F-12]", async () => {
      mockChatCompletion
        .mockResolvedValueOnce({
          content: JSON.stringify({
            topic: "Test",
            cards: Array(10)
              .fill(null)
              .map((_, i) => ({ front: `Q${i}?`, back: `A${i}` })),
          }),
          provider: "azure" as const,
          model: "gpt-4o",
        })
        .mockResolvedValueOnce({
          content: JSON.stringify({
            topic: "Test",
            questions: Array(5)
              .fill(null)
              .map((_, i) => ({
                question: `Q${i}?`,
                options: ["A", "B", "C", "D"],
                correctIndex: 0,
              })),
          }),
          provider: "azure" as const,
          model: "gpt-4o",
        });

      const result = await generateTopicMaterials(mockTopic, {
        flashcardCount: 10,
        quizQuestionCount: 5,
      });

      expect(result.flashcards.cards).toHaveLength(10);
      expect(result.quiz.questions).toHaveLength(5);
    });
  });
});

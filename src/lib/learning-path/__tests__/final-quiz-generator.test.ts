/**
 * Tests for final-quiz-generator.ts
 * Plan 8 MVP - Wave 2: Learning Path Generation [F-13]
 *
 * @vitest-environment node
 * @module learning-path/__tests__/final-quiz-generator.test
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  generateFinalQuiz,
  evaluateQuizResults,
  type TopicSummary,
} from "../final-quiz-generator";

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
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
      Promise.resolve({ model: "gpt-4o", temperature: 0.7, maxTokens: 2000 }),
    ),
  },
}));

// Mock deployment mapping
vi.mock("@/lib/ai/providers/deployment-mapping", () => ({
  getDeploymentForModel: vi.fn((model: string) => model),
}));

import { chatCompletion } from "@/lib/ai/providers";

const mockChatCompletion = vi.mocked(chatCompletion);

describe("final-quiz-generator", () => {
  const mockTopics: TopicSummary[] = [
    {
      title: "Le Origini di Roma",
      keyConcepts: ["Romolo", "Remo", "Fondazione"],
      difficulty: "basic",
    },
    {
      title: "La Repubblica",
      keyConcepts: ["Senato", "Consoli", "Patrizi"],
      difficulty: "intermediate",
    },
    {
      title: "L'Impero",
      keyConcepts: ["Augusto", "Pax Romana", "Espansione"],
      difficulty: "advanced",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // generateFinalQuiz - [F-13]
  // ============================================================================
  describe("generateFinalQuiz", () => {
    it("should generate quiz covering all topics [F-13]", async () => {
      mockChatCompletion.mockResolvedValue({
        content: JSON.stringify({
          topic: "Storia Romana",
          questions: [
            {
              question: "Chi fondò Roma?",
              options: ["Romolo", "Cesare", "Augusto", "Nerone"],
              correctIndex: 0,
              explanation: "Romolo fondò Roma nel 753 a.C.",
            },
            {
              question: "Chi erano i Patrizi?",
              options: ["Schiavi", "Nobili", "Mercanti", "Soldati"],
              correctIndex: 1,
              explanation: "I Patrizi erano la classe nobiliare romana.",
            },
          ],
        }),
        provider: "azure" as const,
        model: "gpt-4o",
      });

      const result = await generateFinalQuiz("Storia Romana", mockTopics, {
        totalQuestions: 10,
      });

      expect(mockChatCompletion).toHaveBeenCalled();
      expect(result.topic).toBe("Storia Romana");
      expect(result.questions).toHaveLength(2);
      expect(result.questions[0].options).toHaveLength(4);
    });

    it("should return empty quiz for no topics [F-13]", async () => {
      const result = await generateFinalQuiz("Empty Path", []);

      expect(mockChatCompletion).not.toHaveBeenCalled();
      expect(result.questions).toHaveLength(0);
    });

    it("should throw on invalid JSON response [F-13]", async () => {
      mockChatCompletion.mockResolvedValue({
        content: "Not valid JSON",
        provider: "azure" as const,
        model: "gpt-4o",
      });

      await expect(generateFinalQuiz("Test", mockTopics)).rejects.toThrow(
        "Failed to parse final quiz JSON",
      );
    });

    it("should handle JSON with markdown fences [F-13]", async () => {
      mockChatCompletion.mockResolvedValue({
        content:
          '```json\n{"topic": "Test", "questions": [{"question": "Q?", "options": ["A","B","C","D"], "correctIndex": 0}]}\n```',
        provider: "azure" as const,
        model: "gpt-4o",
      });

      const result = await generateFinalQuiz("Test", mockTopics);

      expect(result.questions).toHaveLength(1);
    });
  });

  // ============================================================================
  // evaluateQuizResults - [F-13]
  // ============================================================================
  describe("evaluateQuizResults", () => {
    const mockQuiz = {
      topic: "Test Quiz",
      questions: [
        { question: "Q1?", options: ["A", "B", "C", "D"], correctIndex: 0 },
        { question: "Q2?", options: ["A", "B", "C", "D"], correctIndex: 1 },
        { question: "Q3?", options: ["A", "B", "C", "D"], correctIndex: 2 },
        { question: "Q4?", options: ["A", "B", "C", "D"], correctIndex: 3 },
        { question: "Q5?", options: ["A", "B", "C", "D"], correctIndex: 0 },
      ],
    };

    it("should calculate 100% score for all correct [F-13]", () => {
      const answers = [0, 1, 2, 3, 0];
      const result = evaluateQuizResults(mockQuiz, answers);

      expect(result.score).toBe(100);
      expect(result.passed).toBe(true);
      expect(result.correctCount).toBe(5);
      expect(result.totalCount).toBe(5);
    });

    it("should calculate 0% score for all wrong [F-13]", () => {
      const answers = [1, 2, 3, 0, 1];
      const result = evaluateQuizResults(mockQuiz, answers);

      expect(result.score).toBe(0);
      expect(result.passed).toBe(false);
      expect(result.correctCount).toBe(0);
    });

    it("should pass with 70% or higher [F-13]", () => {
      // 4 out of 5 = 80%
      const answers = [0, 1, 2, 3, 1]; // Last one wrong
      const result = evaluateQuizResults(mockQuiz, answers);

      expect(result.score).toBe(80);
      expect(result.passed).toBe(true);
    });

    it("should fail with less than 70% [F-13]", () => {
      // 3 out of 5 = 60%
      const answers = [0, 1, 2, 0, 1]; // Two wrong
      const result = evaluateQuizResults(mockQuiz, answers);

      expect(result.score).toBe(60);
      expect(result.passed).toBe(false);
    });

    it("should handle empty quiz [F-13]", () => {
      const emptyQuiz = { topic: "Empty", questions: [] };
      const result = evaluateQuizResults(emptyQuiz, []);

      expect(result.score).toBe(100);
      expect(result.passed).toBe(true);
    });
  });
});

/**
 * Tests for Quiz Plugin Handler
 * Coverage improvement for tools/plugins/quiz-plugin.ts
 * Tests handler branches and question validation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ToolCategory, Permission } from "../../plugin/types";

// Mock dependencies
vi.mock("../../handlers/quiz-handler", () => ({
  validateQuestions: vi.fn(() => ({ valid: true })),
}));

import { quizPlugin } from "../quiz-plugin";
import { validateQuestions } from "../../handlers/quiz-handler";
import type { ToolContext } from "@/types/tools";

describe("quiz-plugin handler", () => {
  const mockContext: ToolContext = {
    conversationId: "conv-123",
    userId: "user-456",
    sessionId: "sess-789",
    maestroId: "euclide",
  };

  const validInput = {
    topic: "Mathematics",
    questionCount: 2,
    difficulty: "intermediate" as const,
    questions: [
      {
        question: "What is 2+2?",
        options: ["3", "4", "5", "6"],
        correctIndex: 1,
        explanation: "Basic addition",
      },
      {
        question: "What is 3*3?",
        options: ["6", "9", "12"],
        correctIndex: 1,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateQuestions).mockReturnValue({ valid: true });
  });

  describe("plugin configuration", () => {
    it("has correct id", () => {
      expect(quizPlugin.id).toBe("create_quiz");
    });

    it("has correct name", () => {
      expect(quizPlugin.name).toBe("Quiz");
    });

    it("has correct category", () => {
      expect(quizPlugin.category).toBe(ToolCategory.ASSESSMENT);
    });

    it("has required permissions", () => {
      expect(quizPlugin.permissions).toContain(Permission.WRITE_CONTENT);
      expect(quizPlugin.permissions).toContain(Permission.READ_CONVERSATION);
    });

    it("is voice enabled", () => {
      expect(quizPlugin.voiceEnabled).toBe(true);
    });

    it("has voice triggers", () => {
      expect(quizPlugin.triggers).toContain("quiz");
      expect(quizPlugin.triggers).toContain("verifica");
      expect(quizPlugin.triggers).toContain("test");
    });

    it("has voice prompt with topic placeholder", () => {
      expect(quizPlugin.voicePrompt).toBeDefined();
      if (typeof quizPlugin.voicePrompt === "object") {
        expect(quizPlugin.voicePrompt.template).toContain("{topic}");
      }
    });

    it("has voice feedback with questionCount placeholder", () => {
      expect(quizPlugin.voiceFeedback).toBeDefined();
      if (typeof quizPlugin.voiceFeedback === "object") {
        expect(quizPlugin.voiceFeedback.template).toContain("{questionCount}");
      }
    });
  });

  describe("handler - success cases", () => {
    it("creates quiz with all fields", async () => {
      const result = await quizPlugin.handler(validInput, mockContext);

      expect(result.success).toBe(true);
      expect((result.data as any).topic).toBe("Mathematics");
      expect((result.data as any).difficulty).toBe("intermediate");
      expect((result.data as any).questionCount).toBe(2);
      expect((result.data as any).questions).toHaveLength(2);
      expect((result.data as any).createdAt).toBeDefined();
    });

    it("trims topic and question fields", async () => {
      const result = await quizPlugin.handler(
        {
          ...validInput,
          topic: "  Spaced Topic  ",
          questions: [
            {
              question: "  Question?  ",
              options: ["  A  ", "  B  "],
              correctIndex: 0,
              explanation: "  Explanation  ",
            },
          ],
        },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect((result.data as any).topic).toBe("Spaced Topic");
      expect((result.data as any).questions[0].question).toBe("Question?");
      expect((result.data as any).questions[0].options[0]).toBe("A");
      expect((result.data as any).questions[0].explanation).toBe("Explanation");
    });

    it("handles questions without explanation", async () => {
      const result = await quizPlugin.handler(
        {
          ...validInput,
          questions: [
            { question: "Q1?", options: ["A", "B"], correctIndex: 0 },
          ],
        },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect((result.data as any).questions[0].explanation).toBeUndefined();
    });

    it("uses default difficulty when not provided", async () => {
      const result = await quizPlugin.handler(
        {
          topic: "Test",
          questionCount: 1,
          questions: [{ question: "Q?", options: ["A", "B"], correctIndex: 0 }],
        },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect((result.data as any).difficulty).toBe("intermediate");
    });
  });

  describe("handler - all difficulty levels", () => {
    const difficulties = ["beginner", "intermediate", "advanced"] as const;

    it.each(difficulties)("accepts difficulty: %s", async (difficulty) => {
      const result = await quizPlugin.handler(
        { ...validInput, difficulty },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect((result.data as any).difficulty).toBe(difficulty);
    });
  });

  describe("handler - question validation errors", () => {
    it("returns error when questions structure is invalid", async () => {
      vi.mocked(validateQuestions).mockReturnValueOnce({
        valid: false,
        error: "correctIndex out of bounds",
      });

      const result = await quizPlugin.handler(validInput, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain("correctIndex out of bounds");
    });

    it("returns default error when validation fails without message", async () => {
      vi.mocked(validateQuestions).mockReturnValueOnce({ valid: false });

      const result = await quizPlugin.handler(validInput, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid quiz structure");
    });
  });

  describe("handler - schema validation errors", () => {
    it("rejects missing topic", async () => {
      const result = await quizPlugin.handler(
        {
          questionCount: 1,
          questions: [{ question: "Q?", options: ["A", "B"], correctIndex: 0 }],
        },
        mockContext,
      );

      expect(result.success).toBe(false);
    });

    it("rejects empty topic", async () => {
      const result = await quizPlugin.handler(
        {
          topic: "",
          questionCount: 1,
          questions: [{ question: "Q?", options: ["A", "B"], correctIndex: 0 }],
        },
        mockContext,
      );

      expect(result.success).toBe(false);
    });

    it("rejects topic over 500 characters", async () => {
      const result = await quizPlugin.handler(
        { ...validInput, topic: "a".repeat(501) },
        mockContext,
      );

      expect(result.success).toBe(false);
    });

    it("rejects questionCount less than 1", async () => {
      const result = await quizPlugin.handler(
        { ...validInput, questionCount: 0 },
        mockContext,
      );

      expect(result.success).toBe(false);
    });

    it("rejects questionCount over 50", async () => {
      const result = await quizPlugin.handler(
        { ...validInput, questionCount: 51 },
        mockContext,
      );

      expect(result.success).toBe(false);
    });

    it("rejects invalid difficulty", async () => {
      const result = await quizPlugin.handler(
        { ...validInput, difficulty: "expert" },
        mockContext,
      );

      expect(result.success).toBe(false);
    });

    it("rejects empty questions array", async () => {
      const result = await quizPlugin.handler(
        { ...validInput, questions: [] },
        mockContext,
      );

      expect(result.success).toBe(false);
    });

    it("rejects question with less than 2 options", async () => {
      const result = await quizPlugin.handler(
        {
          ...validInput,
          questions: [{ question: "Q?", options: ["A"], correctIndex: 0 }],
        },
        mockContext,
      );

      expect(result.success).toBe(false);
    });

    it("rejects question with empty question text", async () => {
      const result = await quizPlugin.handler(
        {
          ...validInput,
          questions: [{ question: "", options: ["A", "B"], correctIndex: 0 }],
        },
        mockContext,
      );

      expect(result.success).toBe(false);
    });

    it("rejects negative correctIndex", async () => {
      const result = await quizPlugin.handler(
        {
          ...validInput,
          questions: [
            { question: "Q?", options: ["A", "B"], correctIndex: -1 },
          ],
        },
        mockContext,
      );

      expect(result.success).toBe(false);
    });
  });

  describe("handler - error handling", () => {
    it("handles non-Error exception", async () => {
      vi.mocked(validateQuestions).mockImplementationOnce(() => {
        throw "string error";
      });

      const result = await quizPlugin.handler(validInput, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Quiz creation failed");
    });

    it("handles Error exception", async () => {
      vi.mocked(validateQuestions).mockImplementationOnce(() => {
        throw new Error("Question validation crashed");
      });

      const result = await quizPlugin.handler(validInput, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Question validation crashed");
    });
  });
});

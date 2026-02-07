import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock chatCompletion before importing benchmarks
vi.mock("@/lib/ai/providers", () => ({
  chatCompletion: vi.fn(),
}));

import { scoreTutorBench } from "../benchmarks";
import { chatCompletion } from "@/lib/ai";

const mockChatCompletion = vi.mocked(chatCompletion);

describe("benchmarks - TutorBench scoring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const sampleTurns = [
    {
      studentMessage: "Non capisco le frazioni",
      maestroResponse:
        "Iniziamo con un esempio semplice. Passo 1: prendi una pizza...",
    },
    {
      studentMessage: "Ok, e poi?",
      maestroResponse: "Passo 2: dividila in 4 parti uguali. Ogni parte è 1/4.",
    },
  ];

  it("should return scores for all 4 dimensions", async () => {
    mockChatCompletion.mockResolvedValueOnce({
      content: JSON.stringify({
        scaffolding: {
          score: 85,
          evidence: "Good step breakdown",
          level: "proficient",
        },
        hinting: { score: 60, evidence: "Some hints", level: "competent" },
        adaptation: {
          score: 70,
          evidence: "Adjusted language",
          level: "proficient",
        },
        misconceptionHandling: {
          score: 50,
          evidence: "Basic correction",
          level: "competent",
        },
      }),
      provider: "azure" as const,
      model: "gpt-4o",
    });

    const scores = await scoreTutorBench(sampleTurns);

    expect(scores.scaffolding).toBe(85);
    expect(scores.hinting).toBe(60);
    expect(scores.adaptation).toBe(70);
    expect(scores.misconceptionHandling).toBe(50);
    expect(scores.details).toHaveLength(4);
  });

  it("should calculate weighted overall score", async () => {
    mockChatCompletion.mockResolvedValueOnce({
      content: JSON.stringify({
        scaffolding: { score: 80, evidence: "e", level: "proficient" },
        hinting: { score: 60, evidence: "e", level: "competent" },
        adaptation: { score: 80, evidence: "e", level: "proficient" },
        misconceptionHandling: { score: 60, evidence: "e", level: "competent" },
      }),
      provider: "azure" as const,
      model: "gpt-4o",
    });

    const scores = await scoreTutorBench(sampleTurns);

    // Weighted: scaffolding*0.3 + hinting*0.2 + adaptation*0.3 + misconception*0.2
    // = 80*0.3 + 60*0.2 + 80*0.3 + 60*0.2 = 24 + 12 + 24 + 12 = 72
    expect(scores.overall).toBe(72);
  });

  it("should clamp scores to 0-100 range", async () => {
    mockChatCompletion.mockResolvedValueOnce({
      content: JSON.stringify({
        scaffolding: { score: 150, evidence: "e", level: "expert" },
        hinting: { score: -20, evidence: "e", level: "inadequate" },
        adaptation: { score: 50, evidence: "e", level: "competent" },
        misconceptionHandling: { score: 200, evidence: "e", level: "expert" },
      }),
      provider: "azure" as const,
      model: "gpt-4o",
    });

    const scores = await scoreTutorBench(sampleTurns);

    expect(scores.scaffolding).toBe(100);
    expect(scores.hinting).toBe(0);
    expect(scores.misconceptionHandling).toBe(100);
  });

  it("should handle JSON in markdown code blocks", async () => {
    mockChatCompletion.mockResolvedValueOnce({
      content:
        "```json\n" +
        JSON.stringify({
          scaffolding: { score: 70, evidence: "e", level: "proficient" },
          hinting: { score: 70, evidence: "e", level: "proficient" },
          adaptation: { score: 70, evidence: "e", level: "proficient" },
          misconceptionHandling: {
            score: 70,
            evidence: "e",
            level: "proficient",
          },
        }) +
        "\n```",
      provider: "azure" as const,
      model: "gpt-4o",
    });

    const scores = await scoreTutorBench(sampleTurns);
    expect(scores.scaffolding).toBe(70);
  });

  it("should return zero scores on parse failure", async () => {
    mockChatCompletion.mockResolvedValueOnce({
      content: "I cannot evaluate this conversation.",
      provider: "azure" as const,
      model: "gpt-4o",
    });

    const scores = await scoreTutorBench(sampleTurns);

    expect(scores.scaffolding).toBe(0);
    expect(scores.overall).toBe(0);
    expect(scores.details[0].evidence).toContain("Failed to parse");
  });

  it("should validate rubric levels", async () => {
    mockChatCompletion.mockResolvedValueOnce({
      content: JSON.stringify({
        scaffolding: { score: 80, evidence: "e", level: "expert" },
        hinting: { score: 60, evidence: "e", level: "invalid_level" },
        adaptation: { score: 70, evidence: "e", level: "proficient" },
        misconceptionHandling: { score: 50, evidence: "e", level: "competent" },
      }),
      provider: "azure" as const,
      model: "gpt-4o",
    });

    const scores = await scoreTutorBench(sampleTurns);

    expect(scores.details[0].rubricLevel).toBe("expert");
    expect(scores.details[1].rubricLevel).toBe("unknown"); // invalid level
    expect(scores.details[2].rubricLevel).toBe("proficient");
  });

  it("should pass student context when provided", async () => {
    mockChatCompletion.mockResolvedValueOnce({
      content: JSON.stringify({
        scaffolding: { score: 70, evidence: "e", level: "proficient" },
        hinting: { score: 70, evidence: "e", level: "proficient" },
        adaptation: { score: 70, evidence: "e", level: "proficient" },
        misconceptionHandling: {
          score: 70,
          evidence: "e",
          level: "proficient",
        },
      }),
      provider: "azure" as const,
      model: "gpt-4o",
    });

    await scoreTutorBench(sampleTurns, "12yo with dyslexia");

    const callArgs = mockChatCompletion.mock.calls[0];
    const userMessage = callArgs[0][0].content;
    expect(userMessage).toContain("12yo with dyslexia");
  });
});

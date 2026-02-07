import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@/lib/db", () => ({
  prisma: {
    researchExperiment: {
      update: vi.fn().mockResolvedValue({}),
    },
    researchResult: {
      create: vi.fn().mockResolvedValue({ id: "result-1" }),
    },
  },
}));

vi.mock("@/lib/ai/providers", () => ({
  chatCompletion: vi.fn(),
}));

import { runSimulation, type SimulationConfig } from "../simulation-engine";
import { SYNTHETIC_PROFILES } from "../synthetic-students";
import { chatCompletion } from "@/lib/ai/server";
import { prisma } from "@/lib/db";

const mockChatCompletion = vi.mocked(chatCompletion);
const mockExperimentUpdate = vi.mocked(prisma.researchExperiment.update);
const mockResultCreate = vi.mocked(prisma.researchResult.create);

describe("simulation-engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseConfig: SimulationConfig = {
    experimentId: "exp-001",
    profile: SYNTHETIC_PROFILES[0], // Marco-Dyslexic-12
    maestroSystemPrompt: "You are a math tutor. Be patient and clear.",
    maestroId: "test-maestro",
    topic: "fractions",
    turns: 2,
    difficulty: "medium",
  };

  it("should run a complete simulation with N turns", async () => {
    // Student message + Maestro response per turn
    mockChatCompletion
      .mockResolvedValueOnce({
        content: "Non capisco le frazioni, mi aiuti?",
        provider: "azure" as const,
        model: "gpt-4o",
        usage: { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 },
      })
      .mockResolvedValueOnce({
        content: "Certo! Passo 1: immagina una pizza...",
        provider: "azure" as const,
        model: "gpt-4o",
        usage: { prompt_tokens: 200, completion_tokens: 50, total_tokens: 250 },
      })
      .mockResolvedValueOnce({
        content: "Ok, e poi cosa succede?",
        provider: "azure" as const,
        model: "gpt-4o",
        usage: { prompt_tokens: 150, completion_tokens: 15, total_tokens: 165 },
      })
      .mockResolvedValueOnce({
        content: "Passo 2: dividi la pizza in 4 parti uguali.",
        provider: "azure" as const,
        model: "gpt-4o",
        usage: { prompt_tokens: 250, completion_tokens: 30, total_tokens: 280 },
      });

    const result = await runSimulation(baseConfig);

    expect(result.status).toBe("completed");
    expect(result.turnsCompleted).toBe(2);
    expect(result.totalTokens).toBeGreaterThan(0);
    expect(result.avgResponseTimeMs).toBeGreaterThanOrEqual(0);
  });

  it("should mark experiment as running then completed", async () => {
    mockChatCompletion.mockResolvedValue({
      content: "Test response",
      provider: "azure" as const,
      model: "gpt-4o",
      usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
    });

    await runSimulation(baseConfig);

    // First call: mark as running
    expect(mockExperimentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "exp-001" },
        data: expect.objectContaining({ status: "running" }),
      }),
    );

    // Last call: mark as completed
    const lastCall = mockExperimentUpdate.mock.calls.at(-1);
    expect(lastCall?.[0]).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({ status: "completed" }),
      }),
    );
  });

  it("should store one ResearchResult per turn", async () => {
    mockChatCompletion.mockResolvedValue({
      content: "Test response",
      provider: "azure" as const,
      model: "gpt-4o",
      usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
    });

    await runSimulation(baseConfig);

    // 2 turns = 2 result records
    expect(mockResultCreate).toHaveBeenCalledTimes(2);

    const firstCall = mockResultCreate.mock.calls[0][0];
    expect(firstCall.data).toEqual(
      expect.objectContaining({
        experimentId: "exp-001",
        turn: 1,
      }),
    );
  });

  it("should handle errors and mark experiment as failed", async () => {
    mockChatCompletion
      .mockResolvedValueOnce({
        content: "Student question",
        provider: "azure" as const,
        model: "gpt-4o",
      })
      .mockRejectedValueOnce(new Error("API limit exceeded"));

    const result = await runSimulation(baseConfig);

    expect(result.status).toBe("failed");
    expect(result.error).toContain("API limit exceeded");

    const lastUpdate = mockExperimentUpdate.mock.calls.at(-1);
    expect(lastUpdate?.[0].data).toEqual(
      expect.objectContaining({
        status: "failed",
        errorLog: "API limit exceeded",
      }),
    );
  });
});

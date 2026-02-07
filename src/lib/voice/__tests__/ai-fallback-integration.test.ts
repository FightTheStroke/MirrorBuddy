import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { extractToolParameters } from "../voice-parameter-extractor";
import * as aiProviders from "@/lib/ai";

// Mock the AI provider
vi.mock("@/lib/ai/providers", () => ({
  chatCompletion: vi.fn(),
}));

describe("AI fallback integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("triggers AI fallback when regex confidence < 0.5", async () => {
    const mockChatCompletion = vi.mocked(aiProviders.chatCompletion);
    mockChatCompletion.mockResolvedValueOnce({
      content: JSON.stringify({
        topic: "matematica avanzata",
        questionCount: 7,
      }),
      provider: "azure",
      model: "gpt-4o-mini",
      usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
    });

    // Vague transcript should trigger low regex confidence
    const result = await extractToolParameters(
      "quiz",
      "voglio fare un test", // No topic, no count
      undefined,
      { enableAIFallback: true, aiFallbackThreshold: 0.5 },
    );

    // AI should have been called
    expect(mockChatCompletion).toHaveBeenCalledTimes(1);

    // Should use AI result with higher confidence
    expect(result.parameters.topic).toBe("matematica avanzata");
    expect(result.parameters.questionCount).toBe(7);
    expect(result.confidence).toBeGreaterThanOrEqual(0.6);
  });

  it("does NOT trigger AI fallback when regex confidence >= 0.5", async () => {
    const mockChatCompletion = vi.mocked(aiProviders.chatCompletion);

    // Clear transcript with explicit topic should have high confidence
    const result = await extractToolParameters(
      "quiz",
      "crea un quiz di 5 domande sulla fotosintesi",
      undefined,
      { enableAIFallback: true, aiFallbackThreshold: 0.5 },
    );

    // AI should NOT have been called
    expect(mockChatCompletion).not.toHaveBeenCalled();

    // Should use regex result
    expect(result.parameters.topic).toBe("fotosintesi");
    expect(result.parameters.questionCount).toBe(5);
    expect(result.confidence).toBeGreaterThan(0.7);
  });

  it("does NOT trigger AI fallback when disabled via options", async () => {
    const mockChatCompletion = vi.mocked(aiProviders.chatCompletion);

    // Even with low confidence, AI should not be called
    const result = await extractToolParameters(
      "quiz",
      "voglio fare un test", // Low confidence
      undefined,
      { enableAIFallback: false },
    );

    // AI should NOT have been called
    expect(mockChatCompletion).not.toHaveBeenCalled();

    // Should use regex result even with low confidence
    expect(result.confidence).toBeLessThan(0.5);
  });

  it("chooses better result between regex and AI", async () => {
    const mockChatCompletion = vi.mocked(aiProviders.chatCompletion);
    mockChatCompletion.mockResolvedValueOnce({
      content: JSON.stringify({
        topic: "storia antica", // Better than generic fallback
        questionCount: 8,
      }),
      provider: "azure",
      model: "gpt-4o-mini",
      usage: { prompt_tokens: 80, completion_tokens: 30, total_tokens: 110 },
    });

    // Vague transcript - both regex and AI will have low confidence
    const result = await extractToolParameters(
      "quiz",
      "facciamo un quiz",
      undefined,
      { enableAIFallback: true },
    );

    // AI was called (low regex confidence)
    expect(mockChatCompletion).toHaveBeenCalled();

    // Should use whichever has higher confidence
    expect(result.confidence).toBeGreaterThanOrEqual(0.3);
  });

  it("falls back to regex result when AI fails", async () => {
    const mockChatCompletion = vi.mocked(aiProviders.chatCompletion);
    mockChatCompletion.mockRejectedValueOnce(
      new Error("Azure OpenAI error (500): Service unavailable"),
    );

    const result = await extractToolParameters(
      "quiz",
      "vorrei fare un test", // Vague transcript triggers AI fallback
      undefined,
      { enableAIFallback: true },
    );

    // AI was called but failed
    expect(mockChatCompletion).toHaveBeenCalled();

    // Should fall back to regex result (with low confidence)
    expect(result.confidence).toBeLessThan(0.5); // Low but still usable
  });

  it("allows custom AI fallback threshold", async () => {
    const mockChatCompletion = vi.mocked(aiProviders.chatCompletion);
    mockChatCompletion.mockResolvedValueOnce({
      content: JSON.stringify({
        topic: "guerra fredda",
        questionCount: 10,
        difficulty: 3,
      }),
      provider: "azure",
      model: "gpt-4o-mini",
      usage: { prompt_tokens: 120, completion_tokens: 60, total_tokens: 180 },
    });

    // Use high threshold (0.9) so even high confidence triggers AI
    const result = await extractToolParameters(
      "quiz",
      "quiz con 10 domande", // Has count but no topic - medium confidence (~0.6)
      undefined,
      { enableAIFallback: true, aiFallbackThreshold: 0.9 },
    );

    // AI should have been called due to high threshold
    expect(mockChatCompletion).toHaveBeenCalled();

    // Should use AI result
    expect(result.parameters.topic).toBe("guerra fredda");
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it("AI provides better extraction for complex phrasing", async () => {
    const mockChatCompletion = vi.mocked(aiProviders.chatCompletion);
    mockChatCompletion.mockResolvedValueOnce({
      content: JSON.stringify({
        topic: "seconda guerra mondiale",
        questionCount: 10,
        difficulty: 4,
      }),
      provider: "azure",
      model: "gpt-4o-mini",
      usage: { prompt_tokens: 150, completion_tokens: 70, total_tokens: 220 },
    });

    const result = await extractToolParameters(
      "quiz",
      "vorrei un test", // Very vague - regex will have very low confidence
      undefined,
      { enableAIFallback: true },
    );

    // AI should be called and provide better extraction
    expect(mockChatCompletion).toHaveBeenCalled();
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    expect(result.parameters.topic).toBe("seconda guerra mondiale");
  });
});

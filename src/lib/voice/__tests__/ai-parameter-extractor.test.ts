import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { extractParametersWithAI } from "../ai-parameter-extractor";
import { TOOL_SCHEMAS } from "../tool-parameter-schemas";
import * as aiProviders from "@/lib/ai/providers";

// Mock the AI provider
vi.mock("@/lib/ai/providers", () => ({
  chatCompletion: vi.fn(),
}));

describe("ai-parameter-extractor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("extractParametersWithAI", () => {
    it("extracts quiz parameters from complex Italian transcript", async () => {
      // Mock AI response with structured JSON
      vi.mocked(aiProviders.chatCompletion).mockResolvedValueOnce({
        content: JSON.stringify({
          topic: "rivoluzione francese",
          questionCount: 8,
          difficulty: 3,
        }),
        provider: "azure",
        model: "gpt-4o-mini",
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      });

      const result = await extractParametersWithAI(
        "quiz",
        "vorrei fare un test sulla rivoluzione francese con otto domande di livello medio",
        TOOL_SCHEMAS.quiz,
      );

      expect(result.toolName).toBe("quiz");
      expect(result.parameters.topic).toBe("rivoluzione francese");
      expect(result.parameters.questionCount).toBe(8);
      expect(result.parameters.difficulty).toBe(3);
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it("extracts flashcard parameters with AI understanding of synonyms", async () => {
      vi.mocked(aiProviders.chatCompletion).mockResolvedValueOnce({
        content: JSON.stringify({
          topic: "verbi irregolari inglesi",
          count: 12,
        }),
        provider: "azure",
        model: "gpt-4o-mini",
        usage: { prompt_tokens: 80, completion_tokens: 30, total_tokens: 110 },
      });

      const result = await extractParametersWithAI(
        "flashcard",
        "preparami una dozzina di carte per studiare i verbi irregolari in inglese",
        TOOL_SCHEMAS.flashcard,
      );

      expect(result.parameters.count).toBe(12); // AI understood "dozzina" = 12
      expect(result.parameters.topic).toBe("verbi irregolari inglesi");
    });

    it("extracts formula parameters with full descriptions", async () => {
      vi.mocked(aiProviders.chatCompletion).mockResolvedValueOnce({
        content: JSON.stringify({
          description: "forza di gravità universale",
        }),
        provider: "azure",
        model: "gpt-4o-mini",
        usage: { prompt_tokens: 60, completion_tokens: 20, total_tokens: 80 },
      });

      const result = await extractParametersWithAI(
        "formula",
        "mostrami la formula della forza di gravità universale",
        TOOL_SCHEMAS.formula,
      );

      expect(result.parameters.description).toBe("forza di gravità universale");
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it("extracts chart parameters with type understanding", async () => {
      vi.mocked(aiProviders.chatCompletion).mockResolvedValueOnce({
        content: JSON.stringify({
          chartType: "pie",
          title: "composizione atmosfera terrestre",
        }),
        provider: "azure",
        model: "gpt-4o-mini",
        usage: { prompt_tokens: 90, completion_tokens: 40, total_tokens: 130 },
      });

      const result = await extractParametersWithAI(
        "chart",
        "fammi un grafico a torta che mostri la composizione dell'atmosfera terrestre",
        TOOL_SCHEMAS.chart,
      );

      expect(result.parameters.chartType).toBe("pie");
      expect(result.parameters.title).toBe("composizione atmosfera terrestre");
    });

    it("handles AI errors gracefully and returns low confidence", async () => {
      vi.mocked(aiProviders.chatCompletion).mockRejectedValueOnce(
        new Error("Azure OpenAI error (500): Service unavailable"),
      );

      const result = await extractParametersWithAI(
        "quiz",
        "quiz sulla storia",
        TOOL_SCHEMAS.quiz,
      );

      expect(result.toolName).toBe("quiz");
      expect(result.parameters).toEqual({});
      expect(result.confidence).toBe(0);
      expect(result.error).toBeDefined();
      expect(result.error).toContain("AI extraction failed");
    });

    it("handles invalid JSON from AI response", async () => {
      vi.mocked(aiProviders.chatCompletion).mockResolvedValueOnce({
        content: "This is not JSON",
        provider: "azure",
        model: "gpt-4o-mini",
        usage: { prompt_tokens: 50, completion_tokens: 10, total_tokens: 60 },
      });

      const result = await extractParametersWithAI(
        "mindmap",
        "mappa mentale sul sistema solare",
        TOOL_SCHEMAS.mindmap,
      );

      expect(result.parameters).toEqual({});
      expect(result.confidence).toBeLessThan(0.5);
      expect(result.error).toBeDefined();
    });

    it("uses tool schema extraction hints in AI prompt", async () => {
      const mockChatCompletion = vi.mocked(aiProviders.chatCompletion);
      mockChatCompletion.mockResolvedValueOnce({
        content: JSON.stringify({ topic: "test", questionCount: 5 }),
        provider: "azure",
        model: "gpt-4o-mini",
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      });

      await extractParametersWithAI(
        "quiz",
        "quiz sulla matematica",
        TOOL_SCHEMAS.quiz,
      );

      // Verify the prompt includes schema information
      const callArgs = mockChatCompletion.mock.calls[0];
      const systemPrompt = callArgs[1];

      expect(systemPrompt).toContain("quiz");
      expect(systemPrompt).toContain("topic");
      expect(systemPrompt).toContain("questionCount");
      expect(systemPrompt).toContain(TOOL_SCHEMAS.quiz.extractionHint);
    });

    it("returns high confidence (0.8) when AI successfully extracts all required parameters", async () => {
      vi.mocked(aiProviders.chatCompletion).mockResolvedValueOnce({
        content: JSON.stringify({
          topic: "fotosintesi",
          questionCount: 10,
          difficulty: 4,
        }),
        provider: "azure",
        model: "gpt-4o-mini",
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      });

      const result = await extractParametersWithAI(
        "quiz",
        "quiz difficile sulla fotosintesi con 10 domande",
        TOOL_SCHEMAS.quiz,
      );

      // All 3 quiz parameters extracted (topic, questionCount, difficulty)
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it("returns good confidence when AI extracts all required parameters", async () => {
      vi.mocked(aiProviders.chatCompletion).mockResolvedValueOnce({
        content: JSON.stringify({
          topic: "matematica",
          questionCount: 5,
        }),
        provider: "azure",
        model: "gpt-4o-mini",
        usage: { prompt_tokens: 80, completion_tokens: 30, total_tokens: 110 },
      });

      const result = await extractParametersWithAI(
        "quiz",
        "quiz sulla matematica",
        TOOL_SCHEMAS.quiz,
      );

      // 2/3 parameters (missing optional difficulty)
      // Formula: 0.7 base + (2/3 * 0.2) = 0.833
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
      expect(result.confidence).toBeLessThan(0.9);
    });
  });
});

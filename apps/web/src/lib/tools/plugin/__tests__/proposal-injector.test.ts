/**
 * Tests for ProposalInjector
 * Verifies maestro tool proposal generation and context-based relevance
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProposalInjector, createProposalInjector } from "../proposal-injector";
import type { ToolContext } from "../proposal-injector";

// Mock getMaestroById
vi.mock("@/data/maestri", () => ({
  getMaestroById: vi.fn(),
}));

// Mock TOOL_CONFIG and normalizeCharacterToolName
vi.mock("@/lib/tools/constants", () => {
  const config: Record<string, { label: string; category: string }> = {
    quiz: { label: "Quiz", category: "assessment" },
    flashcard: { label: "Flashcard", category: "create" },
    mindmap: { label: "Mappa Mentale", category: "create" },
    diagram: { label: "Diagramma", category: "create" },
    summary: { label: "Riassunto", category: "create" },
    timeline: { label: "Timeline", category: "create" },
    formula: { label: "Formula", category: "educational" },
    chart: { label: "Grafico", category: "educational" },
    search: { label: "Ricerca", category: "search" },
  };
  return {
    TOOL_CONFIG: config,
    normalizeCharacterToolName: (name: string) => {
      const lower = name.toLowerCase();
      if (config[lower]) return lower;
      const aliases: Record<string, string> = {
        flashcards: "flashcard",
        websearch: "search",
        htmlinteractive: "demo",
      };
      return aliases[lower] || undefined;
    },
  };
});

import { getMaestroById } from "@/data/maestri";

describe("ProposalInjector", () => {
  let injector: ProposalInjector;
  const mockGetMaestroById = getMaestroById as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    injector = new ProposalInjector();
  });

  describe("getAvailableProposals", () => {
    it("should return empty array when maestro not found", () => {
      mockGetMaestroById.mockReturnValue(null);

      const result = injector.getAvailableProposals("nonexistent", {});

      expect(result).toEqual([]);
    });

    it("should return empty array when maestro has no tools", () => {
      mockGetMaestroById.mockReturnValue({ id: "test", tools: [] });

      const result = injector.getAvailableProposals("test", {});

      expect(result).toEqual([]);
    });

    it("should return empty array when maestro.tools is undefined", () => {
      mockGetMaestroById.mockReturnValue({ id: "test" });

      const result = injector.getAvailableProposals("test", {});

      expect(result).toEqual([]);
    });

    it("should return proposals for valid maestro with tools", () => {
      mockGetMaestroById.mockReturnValue({
        id: "euclide",
        tools: ["quiz", "flashcard"],
      });

      const result = injector.getAvailableProposals("euclide", {});

      expect(result.length).toBe(2);
      expect(result[0].toolId).toBeDefined();
      expect(result[0].toolName).toBeDefined();
      expect(result[0].proposal).toBeDefined();
      expect(result[0].relevance).toBeGreaterThan(0);
    });

    it("should skip tools not in TOOL_CONFIG", () => {
      mockGetMaestroById.mockReturnValue({
        id: "test",
        tools: ["quiz", "unknown_tool"],
      });

      const result = injector.getAvailableProposals("test", {});

      expect(result.length).toBe(1);
      expect(result[0].toolId).toBe("quiz");
    });

    it("should sort proposals by relevance (highest first)", () => {
      mockGetMaestroById.mockReturnValue({
        id: "test",
        tools: ["quiz", "flashcard", "mindmap"],
      });

      const context: ToolContext = { sessionPhase: "practice" };
      const result = injector.getAvailableProposals("test", context);

      // Quiz should be first in practice phase (relevance 0.9)
      expect(result[0].toolId).toBe("quiz");
      expect(result[0].relevance).toBe(0.9);
    });
  });

  describe("injectProposalInstruction", () => {
    it("should return empty string when no proposals available", () => {
      mockGetMaestroById.mockReturnValue(null);

      const result = injector.injectProposalInstruction("nonexistent", {});

      expect(result).toBe("");
    });

    it("should generate instruction text for available tools", () => {
      mockGetMaestroById.mockReturnValue({
        id: "euclide",
        tools: ["quiz", "flashcard"],
      });

      const result = injector.injectProposalInstruction("euclide", {
        topic: "algebra",
      });

      expect(result).toContain("## Available Tools");
      expect(result).toContain("Quiz");
      expect(result).toContain("Flashcard");
      expect(result).toContain("algebra");
    });

    it("should group tools by category", () => {
      mockGetMaestroById.mockReturnValue({
        id: "test",
        tools: ["quiz", "flashcard", "mindmap"],
      });

      const result = injector.injectProposalInstruction("test", {});

      // Should have category headers
      expect(result).toContain("###");
    });
  });

  describe("calculateRelevance (via getAvailableProposals)", () => {
    beforeEach(() => {
      mockGetMaestroById.mockReturnValue({
        id: "test",
        tools: ["quiz", "flashcard", "mindmap", "diagram"],
      });
    });

    it("should boost quiz relevance in practice phase", () => {
      const context: ToolContext = { sessionPhase: "practice" };
      const result = injector.getAvailableProposals("test", context);

      const quiz = result.find((p) => p.toolId === "quiz");
      expect(quiz?.relevance).toBe(0.9);
    });

    it("should boost flashcard relevance in practice phase", () => {
      const context: ToolContext = { sessionPhase: "practice" };
      const result = injector.getAvailableProposals("test", context);

      const flashcard = result.find((p) => p.toolId === "flashcard");
      expect(flashcard?.relevance).toBe(0.85);
    });

    it("should boost mindmap relevance in exploration phase", () => {
      const context: ToolContext = { sessionPhase: "exploration" };
      const result = injector.getAvailableProposals("test", context);

      const mindmap = result.find((p) => p.toolId === "mindmap");
      expect(mindmap?.relevance).toBe(0.8);
    });

    it("should boost quiz relevance in assessment phase", () => {
      const context: ToolContext = { sessionPhase: "assessment" };
      const result = injector.getAvailableProposals("test", context);

      const quiz = result.find((p) => p.toolId === "quiz");
      expect(quiz?.relevance).toBe(0.9);
    });

    it("should boost relevance for keyword matches", () => {
      const context: ToolContext = { keywords: ["quiz"] };
      const result = injector.getAvailableProposals("test", context);

      const quiz = result.find((p) => p.toolId === "quiz");
      expect(quiz?.relevance).toBeGreaterThanOrEqual(0.75);
    });

    it("should boost diagram and mindmap for advanced complexity", () => {
      const context: ToolContext = { complexity: "advanced" };
      const result = injector.getAvailableProposals("test", context);

      const diagram = result.find((p) => p.toolId === "diagram");
      const mindmap = result.find((p) => p.toolId === "mindmap");
      expect(diagram?.relevance).toBeGreaterThanOrEqual(0.75);
      expect(mindmap?.relevance).toBeGreaterThanOrEqual(0.75);
    });
  });

  describe("generateProposal (via getAvailableProposals)", () => {
    beforeEach(() => {
      mockGetMaestroById.mockReturnValue({
        id: "test",
        tools: [
          "quiz",
          "flashcard",
          "mindmap",
          "summary",
          "diagram",
          "timeline",
          "formula",
          "chart",
          "search",
        ],
      });
    });

    it("should generate quiz proposal with topic", () => {
      const context: ToolContext = { topic: "frazioni" };
      const result = injector.getAvailableProposals("test", context);

      const quiz = result.find((p) => p.toolId === "quiz");
      expect(quiz?.proposal).toContain("frazioni");
      expect(quiz?.proposal).toContain("domande");
    });

    it("should generate flashcard proposal with topic", () => {
      const context: ToolContext = { topic: "equazioni" };
      const result = injector.getAvailableProposals("test", context);

      const flashcard = result.find((p) => p.toolId === "flashcard");
      expect(flashcard?.proposal).toContain("equazioni");
      expect(flashcard?.proposal).toContain("flashcard");
    });

    it("should generate mindmap proposal with subject", () => {
      const context: ToolContext = { subject: "matematica" };
      const result = injector.getAvailableProposals("test", context);

      const mindmap = result.find((p) => p.toolId === "mindmap");
      expect(mindmap?.proposal).toContain("matematica");
    });

    it("should generate summary proposal with topic", () => {
      const context: ToolContext = { topic: "geometria" };
      const result = injector.getAvailableProposals("test", context);

      const summary = result.find((p) => p.toolId === "summary");
      expect(summary?.proposal).toContain("geometria");
      expect(summary?.proposal).toContain("riassunto");
    });

    it("should generate diagram proposal with topic", () => {
      const context: ToolContext = { topic: "funzioni" };
      const result = injector.getAvailableProposals("test", context);

      const diagram = result.find((p) => p.toolId === "diagram");
      expect(diagram?.proposal).toContain("funzioni");
      expect(diagram?.proposal).toContain("diagramma");
    });

    it("should generate timeline proposal", () => {
      const result = injector.getAvailableProposals("test", {});

      const timeline = result.find((p) => p.toolId === "timeline");
      expect(timeline?.proposal).toContain("sequenza temporale");
    });

    it("should generate formula proposal with topic", () => {
      const context: ToolContext = { topic: "derivate" };
      const result = injector.getAvailableProposals("test", context);

      const formula = result.find((p) => p.toolId === "formula");
      expect(formula?.proposal).toContain("derivate");
      expect(formula?.proposal).toContain("formule");
    });

    it("should generate chart proposal", () => {
      const result = injector.getAvailableProposals("test", {});

      const chart = result.find((p) => p.toolId === "chart");
      expect(chart?.proposal).toContain("grafici");
    });

    it("should generate search proposal with topic", () => {
      const context: ToolContext = { topic: "integrali" };
      const result = injector.getAvailableProposals("test", context);

      const search = result.find((p) => p.toolId === "search");
      expect(search?.proposal).toContain("integrali");
      expect(search?.proposal).toContain("ricerche");
    });

    it("should use default topic when not provided", () => {
      const result = injector.getAvailableProposals("test", {});

      const quiz = result.find((p) => p.toolId === "quiz");
      expect(quiz?.proposal).toContain("il concetto");
    });

    it("should use default subject when not provided", () => {
      const result = injector.getAvailableProposals("test", {});

      const mindmap = result.find((p) => p.toolId === "mindmap");
      expect(mindmap?.proposal).toContain("l'argomento");
    });
  });

  describe("createProposalInjector factory", () => {
    it("should create ProposalInjector instance", () => {
      const instance = createProposalInjector();

      expect(instance).toBeInstanceOf(ProposalInjector);
    });
  });
});

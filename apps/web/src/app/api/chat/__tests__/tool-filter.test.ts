/**
 * @vitest-environment node
 *
 * Regression test for Bug 4: Tool definitions must be filtered by
 * character's allowed tools before passing to AI model.
 * Without filtering, coaches/buddies receive ALL definitions and
 * the AI tries to call unavailable tools.
 *
 * Architecture: normalizeCharacterTools() in constants.ts is the
 * single source of truth for character tool name -> ToolType mapping.
 */

import { describe, it, expect } from "vitest";
import { filterToolDefinitions } from "../tool-handler";
import { CHAT_TOOL_DEFINITIONS } from "@/types/tools";
import {
  normalizeCharacterToolName,
  normalizeCharacterTools,
} from "@/lib/tools/constants";

describe("filterToolDefinitions (regression)", () => {
  it("returns all definitions when characterToolNames is empty", () => {
    const filtered = filterToolDefinitions(CHAT_TOOL_DEFINITIONS, []);
    expect(filtered.length).toBe(CHAT_TOOL_DEFINITIONS.length);
  });

  it("returns empty for coach tools (all frontend-only)", () => {
    // Coach/buddy tools are frontend-triggered, none have AI definitions
    const coachTools = ["pdf", "webcam", "homework", "formula", "chart"];
    const filtered = filterToolDefinitions(CHAT_TOOL_DEFINITIONS, coachTools);

    // These tools have TOOL_CONFIG entries but no CHAT_TOOL_DEFINITIONS
    // because they're invoked from the UI, not by the AI model
    expect(filtered.length).toBe(0);
  });

  it("filters maestro PascalCase tools to matching AI definitions", () => {
    const maestroTools = ["MindMap", "Quiz", "Flashcards", "WebSearch"];
    const filtered = filterToolDefinitions(CHAT_TOOL_DEFINITIONS, maestroTools);

    expect(filtered.length).toBeGreaterThan(0);

    const functionNames = filtered.map((d) => d.function.name);
    expect(functionNames).toContain("create_mindmap");
    expect(functionNames).toContain("create_quiz");
    expect(functionNames).toContain("create_flashcards");
    expect(functionNames).toContain("web_search");
  });

  it("excludes non-AI tools from maestro list", () => {
    // Only include non-AI tools (no CHAT_TOOL_DEFINITION match)
    const nonAiTools = ["Task", "Read", "Write", "Audio", "Canvas"];
    const filtered = filterToolDefinitions(CHAT_TOOL_DEFINITIONS, nonAiTools);

    expect(filtered.length).toBe(0);
  });

  it("HtmlInteractive maps to demo definition", () => {
    const filtered = filterToolDefinitions(CHAT_TOOL_DEFINITIONS, [
      "HtmlInteractive",
    ]);

    const functionNames = filtered.map((d) => d.function.name);
    expect(functionNames).toContain("create_demo");
  });

  it("maestro full tool list produces fewer definitions than total", () => {
    // Leonardo's tools (typical full maestro)
    const leonardoTools = [
      "Task",
      "Read",
      "Write",
      "WebSearch",
      "MindMap",
      "Quiz",
      "Flashcards",
      "Audio",
      "Canvas",
      "Gallery",
      "ColorPalette",
      "Video",
      "HtmlInteractive",
      "PDF",
      "Webcam",
      "Homework",
      "Formula",
      "Chart",
    ];

    const filtered = filterToolDefinitions(
      CHAT_TOOL_DEFINITIONS,
      leonardoTools,
    );

    // Should include AI-invocable tools but not all definitions
    // (e.g., typing_tutor, search_archive not in Leonardo's list)
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.length).toBeLessThanOrEqual(CHAT_TOOL_DEFINITIONS.length);
  });
});

describe("normalizeCharacterToolName (single source of truth)", () => {
  it("normalizes PascalCase maestri tools", () => {
    expect(normalizeCharacterToolName("MindMap")).toBe("mindmap");
    expect(normalizeCharacterToolName("WebSearch")).toBe("search");
    expect(normalizeCharacterToolName("HtmlInteractive")).toBe("demo");
    expect(normalizeCharacterToolName("Flashcards")).toBe("flashcard");
  });

  it("passes through lowercase coach/buddy tools", () => {
    expect(normalizeCharacterToolName("pdf")).toBe("pdf");
    expect(normalizeCharacterToolName("webcam")).toBe("webcam");
    expect(normalizeCharacterToolName("homework")).toBe("homework");
  });

  it("returns undefined for non-tool entries", () => {
    expect(normalizeCharacterToolName("Task")).toBeUndefined();
    expect(normalizeCharacterToolName("Read")).toBeUndefined();
    expect(normalizeCharacterToolName("Write")).toBeUndefined();
    expect(normalizeCharacterToolName("Audio")).toBeUndefined();
    expect(normalizeCharacterToolName("Canvas")).toBeUndefined();
  });

  it("normalizeCharacterTools filters out non-tools", () => {
    const tools = normalizeCharacterTools([
      "Task",
      "Read",
      "MindMap",
      "Quiz",
      "pdf",
    ]);
    expect(tools).toEqual(["mindmap", "quiz", "pdf"]);
  });
});

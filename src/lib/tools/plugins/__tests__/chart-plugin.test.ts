/**
 * Tests for Chart Plugin
 * Coverage improvement for tools/plugins/chart-plugin.ts
 * Tests plugin configuration, schema validation, and handler branches
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { ToolCategory, Permission } from "../../plugin/types";

// Mock dependencies
vi.mock("../../handlers/chart-handler", () => ({
  validateChartType: vi.fn(() => ({ valid: true })),
  validateChartData: vi.fn(() => ({ valid: true })),
  generateChartConfig: vi.fn(() => ({
    type: "bar",
    data: { labels: [], datasets: [] },
    options: {},
  })),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  },
}));

import { chartPlugin } from "../chart-plugin";
import {
  validateChartType,
  validateChartData,
} from "../../handlers/chart-handler";
import type { ToolContext } from "@/types/tools";

describe("chart-plugin", () => {
  const mockContext: ToolContext = {
    conversationId: "conv-123",
    userId: "user-456",
    sessionId: "sess-789",
    maestroId: "euclide",
  };

  const validChartInput = {
    title: "Test Chart",
    chartType: "bar" as const,
    labels: ["A", "B", "C"],
    datasets: [{ label: "Dataset 1", data: [10, 20, 30] }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("plugin configuration", () => {
    it("has correct id", () => {
      expect(chartPlugin.id).toBe("create_chart");
    });

    it("has correct name", () => {
      expect(chartPlugin.name).toBe("Grafico");
    });

    it("has correct category", () => {
      expect(chartPlugin.category).toBe(ToolCategory.CREATION);
    });

    it("has required permissions", () => {
      expect(chartPlugin.permissions).toContain(Permission.WRITE_CONTENT);
      expect(chartPlugin.permissions).toContain(Permission.VOICE_OUTPUT);
    });

    it("has voice triggers in Italian and English", () => {
      expect(chartPlugin.triggers).toContain("grafico");
      expect(chartPlugin.triggers).toContain("chart");
      expect(chartPlugin.triggers).toContain("graph");
      expect(chartPlugin.triggers).toContain("crea grafico");
      expect(chartPlugin.triggers).toContain("create chart");
    });

    it("is voice enabled", () => {
      expect(chartPlugin.voiceEnabled).toBe(true);
    });

    it("has no prerequisites", () => {
      expect(chartPlugin.prerequisites).toEqual([]);
    });

    it("has handler function", () => {
      expect(typeof chartPlugin.handler).toBe("function");
    });

    it("has voice prompt with topic placeholder", () => {
      expect(chartPlugin.voicePrompt).toBeDefined();
      if (typeof chartPlugin.voicePrompt === "object") {
        expect(chartPlugin.voicePrompt.template).toContain("{topic}");
        expect(chartPlugin.voicePrompt.fallback).toBeDefined();
      }
    });

    it("has voice feedback with datasetCount placeholder", () => {
      expect(chartPlugin.voiceFeedback).toBeDefined();
      if (typeof chartPlugin.voiceFeedback === "object") {
        expect(chartPlugin.voiceFeedback.template).toContain("{datasetCount}");
        expect(chartPlugin.voiceFeedback.fallback).toBeDefined();
      }
    });
  });

  describe("handler - success cases", () => {
    it("creates chart successfully with required fields", async () => {
      const result = await chartPlugin.handler(validChartInput, mockContext);

      expect(result.success).toBe(true);
      expect((result.data as any).title).toBe("Test Chart");
      expect((result.data as any).chartType).toBe("bar");
      expect((result.data as any).config).toBeDefined();
    });

    it("includes optional description when provided", async () => {
      const result = await chartPlugin.handler(
        { ...validChartInput, description: "Test description" },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect((result.data as any).description).toBe("Test description");
    });

    it("includes optional dataSource when provided", async () => {
      const result = await chartPlugin.handler(
        { ...validChartInput, dataSource: "ISTAT 2024" },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect((result.data as any).dataSource).toBe("ISTAT 2024");
    });

    it("trims title and optional fields", async () => {
      const result = await chartPlugin.handler(
        {
          ...validChartInput,
          title: "  Spaced Title  ",
          description: "  desc  ",
          dataSource: "  source  ",
        },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect((result.data as any).title).toBe("Spaced Title");
      expect((result.data as any).description).toBe("desc");
      expect((result.data as any).dataSource).toBe("source");
    });

    it("supports all valid chart types", async () => {
      const chartTypes = [
        "line",
        "bar",
        "pie",
        "doughnut",
        "scatter",
        "radar",
        "polarArea",
      ];

      for (const chartType of chartTypes) {
        const result = await chartPlugin.handler(
          { ...validChartInput, chartType },
          mockContext,
        );
        expect(result.success).toBe(true);
      }
    });
  });

  describe("handler - validation errors", () => {
    it("rejects invalid chart type from validator", async () => {
      vi.mocked(validateChartType).mockReturnValueOnce({
        valid: false,
        error: "Invalid chart type specified",
      });

      const result = await chartPlugin.handler(validChartInput, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid chart type");
    });

    it("rejects invalid chart data from validator", async () => {
      vi.mocked(validateChartData).mockReturnValueOnce({
        valid: false,
        error: "Mismatch between labels and data",
      });

      const result = await chartPlugin.handler(validChartInput, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Mismatch");
    });

    it("rejects missing title", async () => {
      const result = await chartPlugin.handler(
        { ...validChartInput, title: undefined },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("rejects title over 200 characters", async () => {
      const result = await chartPlugin.handler(
        { ...validChartInput, title: "a".repeat(201) },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("rejects empty labels array", async () => {
      const result = await chartPlugin.handler(
        { ...validChartInput, labels: [] },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("rejects empty datasets array", async () => {
      const result = await chartPlugin.handler(
        { ...validChartInput, datasets: [] },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("rejects dataset with empty data", async () => {
      const result = await chartPlugin.handler(
        { ...validChartInput, datasets: [{ label: "Test", data: [] }] },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("handler - error handling", () => {
    it("handles validator returning error without message", async () => {
      vi.mocked(validateChartType).mockReturnValueOnce({ valid: false });

      const result = await chartPlugin.handler(validChartInput, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid chart type");
    });

    it("handles data validator returning error without message", async () => {
      vi.mocked(validateChartData).mockReturnValueOnce({ valid: false });

      const result = await chartPlugin.handler(validChartInput, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid chart data");
    });

    it("handles generateChartConfig throwing an error", async () => {
      const { generateChartConfig } =
        await import("../../handlers/chart-handler");
      vi.mocked(generateChartConfig).mockImplementationOnce(() => {
        throw new Error("Config generation failed");
      });

      const result = await chartPlugin.handler(validChartInput, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Config generation failed");
    });

    it("handles non-Error exception", async () => {
      const { generateChartConfig } =
        await import("../../handlers/chart-handler");
      vi.mocked(generateChartConfig).mockImplementationOnce(() => {
        throw "string error";
      });

      const result = await chartPlugin.handler(validChartInput, mockContext);

      expect(result.success).toBe(false);
    });
  });

  describe("schema validation", () => {
    const VALID_CHART_TYPES = [
      "line",
      "bar",
      "pie",
      "doughnut",
      "scatter",
      "radar",
      "polarArea",
    ] as const;

    const ChartInputSchema = z.object({
      title: z.string().min(1).max(200),
      chartType: z.enum(VALID_CHART_TYPES),
      labels: z.array(z.string()).min(1),
      datasets: z
        .array(
          z.object({
            label: z.string().min(1),
            data: z.array(z.number()).min(1),
            backgroundColor: z
              .union([z.string(), z.array(z.string())])
              .optional(),
            borderColor: z.union([z.string(), z.array(z.string())]).optional(),
          }),
        )
        .min(1),
      description: z.string().optional(),
      dataSource: z.string().optional(),
    });

    it("accepts valid chart input", () => {
      const result = ChartInputSchema.safeParse(validChartInput);
      expect(result.success).toBe(true);
    });

    it("accepts dataset with backgroundColor", () => {
      const result = ChartInputSchema.safeParse({
        ...validChartInput,
        datasets: [{ label: "Test", data: [1], backgroundColor: "#ff0000" }],
      });
      expect(result.success).toBe(true);
    });

    it("accepts dataset with backgroundColor array", () => {
      const result = ChartInputSchema.safeParse({
        ...validChartInput,
        datasets: [
          { label: "Test", data: [1], backgroundColor: ["#ff0000", "#00ff00"] },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid chart type", () => {
      const result = ChartInputSchema.safeParse({
        ...validChartInput,
        chartType: "bubble",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("voice triggers", () => {
    it("has at least 9 triggers", () => {
      expect(chartPlugin.triggers.length).toBeGreaterThanOrEqual(9);
    });

    it("includes Italian triggers", () => {
      const italianTriggers = [
        "grafico",
        "crea grafico",
        "visualizza dati",
        "istogramma",
        "dati",
        "statistiche",
      ];
      italianTriggers.forEach((trigger) => {
        expect(chartPlugin.triggers).toContain(trigger);
      });
    });

    it("includes English triggers", () => {
      const englishTriggers = ["chart", "graph", "create chart"];
      englishTriggers.forEach((trigger) => {
        expect(chartPlugin.triggers).toContain(trigger);
      });
    });
  });
});

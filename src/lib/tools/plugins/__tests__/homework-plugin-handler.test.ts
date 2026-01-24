/**
 * Tests for Homework Plugin Handler
 * Coverage improvement for tools/plugins/homework-plugin.ts
 * Tests all branches: text, PDF, image input paths
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ToolCategory, Permission } from "../../plugin/types";

// Mock dependencies
vi.mock("../../handlers/homework-handler", () => ({
  analyzeHomework: vi.fn(() =>
    Promise.resolve({
      exerciseType: "algebra",
      problemStatement: "Solve for x",
      givenData: ["x + 5 = 10"],
      topic: "equations",
      difficulty: "easy",
      hints: ["Subtract 5 from both sides"],
    }),
  ),
  extractTextFromImage: vi.fn(() => Promise.resolve("Image text extracted")),
}));

vi.mock("../../handlers/study-kit-handler", () => ({
  extractTextFromPDF: vi.fn(() =>
    Promise.resolve({ text: "PDF text extracted" }),
  ),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  },
}));

import { homeworkPlugin } from "../homework-plugin";
import {
  analyzeHomework,
  extractTextFromImage,
} from "../../handlers/homework-handler";
import { extractTextFromPDF } from "../../handlers/study-kit-handler";
import type { ToolContext } from "@/types/tools";

describe("homework-plugin handler", () => {
  const mockContext: ToolContext = {
    conversationId: "conv-123",
    userId: "user-456",
    sessionId: "sess-789",
    maestroId: "euclide",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(analyzeHomework).mockResolvedValue({
      exerciseType: "algebra",
      problemStatement: "Solve for x",
      givenData: ["x + 5 = 10"],
      topic: "equations",
      difficulty: "easy",
      hints: ["Subtract 5 from both sides"],
    });
    vi.mocked(extractTextFromPDF).mockResolvedValue({
      text: "PDF text extracted",
      pageCount: 1,
    });
    vi.mocked(extractTextFromImage).mockResolvedValue("Image text extracted");
  });

  describe("plugin configuration", () => {
    it("has correct id", () => {
      expect(homeworkPlugin.id).toBe("homework_help");
    });

    it("has correct name", () => {
      expect(homeworkPlugin.name).toBe("Aiuto Compiti");
    });

    it("has correct category", () => {
      expect(homeworkPlugin.category).toBe(ToolCategory.EDUCATIONAL);
    });

    it("has required permissions", () => {
      expect(homeworkPlugin.permissions).toContain(Permission.FILE_ACCESS);
      expect(homeworkPlugin.permissions).toContain(
        Permission.READ_CONVERSATION,
      );
      expect(homeworkPlugin.permissions).toContain(Permission.WRITE_CONTENT);
      expect(homeworkPlugin.permissions).toContain(Permission.VOICE_OUTPUT);
    });

    it("is voice enabled", () => {
      expect(homeworkPlugin.voiceEnabled).toBe(true);
    });

    it("has voice triggers in Italian and English", () => {
      expect(homeworkPlugin.triggers).toContain("aiuto compiti");
      expect(homeworkPlugin.triggers).toContain("homework");
      expect(homeworkPlugin.triggers).toContain("esercizio");
      expect(homeworkPlugin.triggers).toContain("compiti");
    });

    it("has voice prompt", () => {
      expect(homeworkPlugin.voicePrompt).toBeDefined();
      if (typeof homeworkPlugin.voicePrompt === "object") {
        expect(homeworkPlugin.voicePrompt.template).toContain("compiti");
      }
    });

    it("has voice feedback", () => {
      expect(homeworkPlugin.voiceFeedback).toBeDefined();
      if (typeof homeworkPlugin.voiceFeedback === "object") {
        expect(homeworkPlugin.voiceFeedback.template).toContain("esercizio");
      }
    });
  });

  describe("handler - text input", () => {
    it("processes text input successfully", async () => {
      const result = await homeworkPlugin.handler(
        { text: "Solve x + 5 = 10" },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect((result.data as any).sourceType).toBe("text");
      expect((result.data as any).exerciseType).toBe("algebra");
      expect(analyzeHomework).toHaveBeenCalledWith("Solve x + 5 = 10", "text");
    });

    it("returns homework data structure", async () => {
      const result = await homeworkPlugin.handler(
        { text: "Find the area of a circle with radius 5" },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect((result.data as any).type).toBe("homework");
      expect((result.data as any).problemStatement).toBe("Solve for x");
      expect((result.data as any).hints).toEqual([
        "Subtract 5 from both sides",
      ]);
    });
  });

  describe("handler - PDF input", () => {
    it("processes PDF with base64 string fileData", async () => {
      const base64Data = Buffer.from("test pdf content").toString("base64");
      const result = await homeworkPlugin.handler(
        { fileType: "pdf", fileData: base64Data },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect((result.data as any).sourceType).toBe("pdf");
      expect(extractTextFromPDF).toHaveBeenCalled();
      expect(analyzeHomework).toHaveBeenCalledWith("PDF text extracted", "pdf");
    });

    it("processes PDF with ArrayBuffer fileData", async () => {
      const arrayBuffer = new ArrayBuffer(10);
      const result = await homeworkPlugin.handler(
        { fileType: "pdf", fileData: arrayBuffer },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect((result.data as any).sourceType).toBe("pdf");
      expect(extractTextFromPDF).toHaveBeenCalled();
    });
  });

  describe("handler - image input", () => {
    it("processes image with data URL string", async () => {
      const dataUrl = "data:image/png;base64,iVBORw0KGgo=";
      const result = await homeworkPlugin.handler(
        { fileType: "image", fileData: dataUrl },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect((result.data as any).sourceType).toBe("image");
      expect(extractTextFromImage).toHaveBeenCalledWith(dataUrl);
      expect(analyzeHomework).toHaveBeenCalledWith(
        "Image text extracted",
        "image",
      );
    });

    it("processes image with ArrayBuffer fileData", async () => {
      const arrayBuffer = new ArrayBuffer(10);
      const result = await homeworkPlugin.handler(
        { fileType: "image", fileData: arrayBuffer },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect((result.data as any).sourceType).toBe("image");
      expect(extractTextFromImage).toHaveBeenCalled();
    });
  });

  describe("handler - validation errors", () => {
    it("rejects missing input", async () => {
      const result = await homeworkPlugin.handler({}, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Devi fornire");
    });

    it("rejects fileType without fileData", async () => {
      const result = await homeworkPlugin.handler(
        { fileType: "pdf" },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Devi fornire");
    });

    it("rejects fileData without fileType", async () => {
      const result = await homeworkPlugin.handler(
        { fileData: "some data" },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Devi fornire");
    });
  });

  describe("handler - empty text errors", () => {
    it("rejects empty text input", async () => {
      const result = await homeworkPlugin.handler({ text: "" }, mockContext);

      expect(result.success).toBe(false);
    });

    it("rejects whitespace-only text", async () => {
      const result = await homeworkPlugin.handler({ text: "   " }, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Nessun testo trovato");
    });

    it("rejects empty PDF extraction", async () => {
      vi.mocked(extractTextFromPDF).mockResolvedValueOnce({
        text: "",
        pageCount: 0,
      });

      const result = await homeworkPlugin.handler(
        { fileType: "pdf", fileData: "data" },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Nessun testo trovato");
    });

    it("rejects empty image extraction", async () => {
      vi.mocked(extractTextFromImage).mockResolvedValueOnce("");

      const result = await homeworkPlugin.handler(
        { fileType: "image", fileData: "data" },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Nessun testo trovato");
    });

    it("rejects whitespace image extraction", async () => {
      vi.mocked(extractTextFromImage).mockResolvedValueOnce("   ");

      const result = await homeworkPlugin.handler(
        { fileType: "image", fileData: "data" },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Nessun testo trovato");
    });
  });

  describe("handler - error handling", () => {
    it("handles PDF extraction error", async () => {
      vi.mocked(extractTextFromPDF).mockRejectedValueOnce(
        new Error("PDF parsing failed"),
      );

      const result = await homeworkPlugin.handler(
        { fileType: "pdf", fileData: "data" },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("PDF parsing failed");
    });

    it("handles image extraction error", async () => {
      vi.mocked(extractTextFromImage).mockRejectedValueOnce(
        new Error("OCR failed"),
      );

      const result = await homeworkPlugin.handler(
        { fileType: "image", fileData: "data" },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("OCR failed");
    });

    it("handles analysis error", async () => {
      vi.mocked(analyzeHomework).mockRejectedValueOnce(
        new Error("Analysis service unavailable"),
      );

      const result = await homeworkPlugin.handler(
        { text: "Some homework" },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Analysis service unavailable");
    });

    it("handles non-Error exception", async () => {
      vi.mocked(analyzeHomework).mockRejectedValueOnce("string error");

      const result = await homeworkPlugin.handler(
        { text: "Some homework" },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unknown error");
    });
  });
});

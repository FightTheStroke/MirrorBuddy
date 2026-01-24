/**
 * Tests for PDF Plugin
 * Coverage improvement for tools/plugins/pdf-plugin.ts
 * Tests plugin configuration, schema validation, and handler branches
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { ToolCategory, Permission } from "../../plugin/types";

// Mock dependencies
vi.mock("../../handlers/study-kit-extraction", () => ({
  extractTextFromPDF: vi.fn(() =>
    Promise.resolve({
      text: "Extracted PDF text content",
      pageCount: 5,
    }),
  ),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

import { pdfPlugin } from "../pdf-plugin";
import { extractTextFromPDF } from "../../handlers/study-kit-extraction";
import type { ToolContext } from "@/types/tools";

describe("pdf-plugin", () => {
  const mockContext: ToolContext = {
    conversationId: "conv-123",
    userId: "user-456",
    sessionId: "sess-789",
    maestroId: "euclide",
    studentAge: 14,
    studentName: "Marco",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("plugin configuration", () => {
    it("has correct id", () => {
      expect(pdfPlugin.id).toBe("upload_pdf");
    });

    it("has correct name", () => {
      expect(pdfPlugin.name).toBe("Carica PDF");
    });

    it("has correct category", () => {
      expect(pdfPlugin.category).toBe(ToolCategory.CREATION);
    });

    it("has required permissions", () => {
      expect(pdfPlugin.permissions).toContain(Permission.FILE_ACCESS);
      expect(pdfPlugin.permissions).toContain(Permission.READ_CONVERSATION);
      expect(pdfPlugin.permissions).toContain(Permission.WRITE_CONTENT);
    });

    it("has voice triggers in Italian and English", () => {
      expect(pdfPlugin.triggers).toContain("carica pdf");
      expect(pdfPlugin.triggers).toContain("upload pdf");
      expect(pdfPlugin.triggers).toContain("pdf");
      expect(pdfPlugin.triggers).toContain("documento");
      expect(pdfPlugin.triggers).toContain("load pdf");
    });

    it("is voice enabled", () => {
      expect(pdfPlugin.voiceEnabled).toBe(true);
    });

    it("has no prerequisites", () => {
      expect(pdfPlugin.prerequisites).toEqual([]);
    });

    it("has handler function", () => {
      expect(typeof pdfPlugin.handler).toBe("function");
    });

    it("has voice prompt with topic placeholder", () => {
      expect(pdfPlugin.voicePrompt).toBeDefined();
      if (typeof pdfPlugin.voicePrompt === "object") {
        expect(pdfPlugin.voicePrompt.template).toContain("{topic}");
        expect(pdfPlugin.voicePrompt.fallback).toBeDefined();
      }
    });

    it("has voice feedback with pageCount placeholder", () => {
      expect(pdfPlugin.voiceFeedback).toBeDefined();
      if (typeof pdfPlugin.voiceFeedback === "object") {
        expect(pdfPlugin.voiceFeedback.template).toContain("{pageCount}");
        expect(pdfPlugin.voiceFeedback.fallback).toBeDefined();
      }
    });
  });

  describe("handler - success cases", () => {
    it("processes valid PDF buffer successfully", async () => {
      const pdfContent = Buffer.from("%PDF-1.4 valid pdf content");
      const result = await pdfPlugin.handler(
        { buffer: pdfContent, fileName: "test.pdf", fileSize: 1024 },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect(result.data.text).toBe("Extracted PDF text content");
      expect(result.data.metadata.pageCount).toBe(5);
      expect(result.data.metadata.fileName).toBe("test.pdf");
      expect(result.data.metadata.fileSize).toBe(1024);
    });

    it("handles Uint8Array buffer", async () => {
      const pdfContent = new Uint8Array(
        Buffer.from("%PDF-1.4 valid pdf content"),
      );
      const result = await pdfPlugin.handler(
        { buffer: pdfContent },
        mockContext,
      );

      expect(result.success).toBe(true);
    });

    it("uses default fileName when not provided", async () => {
      const pdfContent = Buffer.from("%PDF-1.4 valid pdf content");
      const result = await pdfPlugin.handler(
        { buffer: pdfContent },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect(result.data.metadata.fileName).toBe("document.pdf");
    });

    it("calculates fileSize from buffer when not provided", async () => {
      const pdfContent = Buffer.from("%PDF-1.4 valid pdf content");
      const result = await pdfPlugin.handler(
        { buffer: pdfContent },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect(result.data.metadata.fileSize).toBe(pdfContent.length);
    });
  });

  describe("handler - validation errors", () => {
    it("rejects empty buffer", async () => {
      const result = await pdfPlugin.handler(
        { buffer: Buffer.from("") },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("PDF buffer is empty");
    });

    it("rejects invalid PDF header", async () => {
      const result = await pdfPlugin.handler(
        { buffer: Buffer.from("NOT A PDF FILE") },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid PDF file");
    });

    it("rejects missing buffer with ZodError", async () => {
      const result = await pdfPlugin.handler({}, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Validation error");
    });
  });

  describe("handler - extraction errors", () => {
    it("handles empty extracted text", async () => {
      vi.mocked(extractTextFromPDF).mockResolvedValueOnce({
        text: "",
        pageCount: 0,
      });

      const pdfContent = Buffer.from("%PDF-1.4 valid pdf content");
      const result = await pdfPlugin.handler(
        { buffer: pdfContent },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("No text could be extracted");
    });

    it("handles whitespace-only extracted text", async () => {
      vi.mocked(extractTextFromPDF).mockResolvedValueOnce({
        text: "   \n\t  ",
        pageCount: 1,
      });

      const pdfContent = Buffer.from("%PDF-1.4 valid pdf content");
      const result = await pdfPlugin.handler(
        { buffer: pdfContent },
        mockContext,
      );

      expect(result.success).toBe(false);
    });

    it("handles extraction throwing an error", async () => {
      vi.mocked(extractTextFromPDF).mockRejectedValueOnce(
        new Error("PDF parsing failed"),
      );

      const pdfContent = Buffer.from("%PDF-1.4 valid pdf content");
      const result = await pdfPlugin.handler(
        { buffer: pdfContent },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("PDF parsing failed");
    });

    it("handles non-Error exception", async () => {
      vi.mocked(extractTextFromPDF).mockRejectedValueOnce("string error");

      const pdfContent = Buffer.from("%PDF-1.4 valid pdf content");
      const result = await pdfPlugin.handler(
        { buffer: pdfContent },
        mockContext,
      );

      expect(result.success).toBe(false);
    });
  });

  describe("schema validation", () => {
    const PDFInputSchema = z.object({
      buffer: z.instanceof(Buffer).or(z.instanceof(Uint8Array)),
      fileName: z.string().optional(),
      fileSize: z.number().optional(),
    });

    it("accepts Buffer", () => {
      const result = PDFInputSchema.safeParse({
        buffer: Buffer.from("test"),
      });
      expect(result.success).toBe(true);
    });

    it("accepts Uint8Array", () => {
      const result = PDFInputSchema.safeParse({
        buffer: new Uint8Array([1, 2, 3]),
      });
      expect(result.success).toBe(true);
    });

    it("accepts optional metadata", () => {
      const result = PDFInputSchema.safeParse({
        buffer: Buffer.from("test"),
        fileName: "doc.pdf",
        fileSize: 1000,
      });
      expect(result.success).toBe(true);
    });

    it("rejects string buffer", () => {
      const result = PDFInputSchema.safeParse({
        buffer: "not a buffer",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("voice triggers", () => {
    it("has at least 8 triggers", () => {
      expect(pdfPlugin.triggers.length).toBeGreaterThanOrEqual(8);
    });

    it("includes Italian triggers", () => {
      const italianTriggers = [
        "carica pdf",
        "apri documento",
        "analizza pdf",
        "leggi pdf",
      ];
      italianTriggers.forEach((trigger) => {
        expect(pdfPlugin.triggers).toContain(trigger);
      });
    });

    it("includes English triggers", () => {
      const englishTriggers = ["upload pdf", "load pdf", "pdf"];
      englishTriggers.forEach((trigger) => {
        expect(pdfPlugin.triggers).toContain(trigger);
      });
    });
  });
});

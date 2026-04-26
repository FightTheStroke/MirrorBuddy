/**
 * Study Kit Extraction Tests
 *
 * Tests for PDF text extraction functionality.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { extractTextFromPDF } from "../study-kit-extraction";

// Mock pdf-parse with class-based mock
let mockGetText = vi.fn();
let mockGetInfo = vi.fn();
let mockDestroy = vi.fn();

vi.mock("pdf-parse", () => ({
  PDFParse: class MockPDFParse {
    getText() {
      return mockGetText();
    }
    getInfo() {
      return mockGetInfo();
    }
    destroy() {
      return mockDestroy();
    }
  },
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

describe("Study Kit Extraction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetText = vi.fn();
    mockGetInfo = vi.fn();
    mockDestroy = vi.fn();
  });

  describe("extractTextFromPDF", () => {
    it("should extract text and page count from PDF", async () => {
      mockGetText.mockResolvedValue({ text: "Hello World" });
      mockGetInfo.mockResolvedValue({ total: 5 });
      mockDestroy.mockResolvedValue(undefined);

      const result = await extractTextFromPDF(Buffer.from("PDF content"));

      expect(result.text).toBe("Hello World");
      expect(result.pageCount).toBe(5);
    });

    it("should throw error for empty buffer", async () => {
      await expect(extractTextFromPDF(Buffer.from(""))).rejects.toThrow(
        "Empty or invalid PDF buffer",
      );
    });

    it("should call destroy in finally block", async () => {
      mockGetText.mockResolvedValue({ text: "Text" });
      mockGetInfo.mockResolvedValue({ total: 1 });
      mockDestroy.mockResolvedValue(undefined);

      await extractTextFromPDF(Buffer.from("PDF"));

      expect(mockDestroy).toHaveBeenCalled();
    });

    it("should handle getText failure", async () => {
      mockGetText.mockRejectedValue(new Error("Text extraction failed"));

      await expect(extractTextFromPDF(Buffer.from("PDF"))).rejects.toThrow(
        "Failed to parse PDF: Text extraction failed",
      );
    });

    it("should handle getInfo failure", async () => {
      mockGetText.mockResolvedValue({ text: "Text" });
      mockGetInfo.mockRejectedValue(new Error("Info extraction failed"));

      await expect(extractTextFromPDF(Buffer.from("PDF"))).rejects.toThrow(
        "Failed to parse PDF: Info extraction failed",
      );
    });

    it("should handle destroy failure gracefully", async () => {
      mockGetText.mockResolvedValue({ text: "Text" });
      mockGetInfo.mockResolvedValue({ total: 2 });
      mockDestroy.mockRejectedValue(new Error("Destroy failed"));

      const result = await extractTextFromPDF(Buffer.from("PDF"));

      expect(result.text).toBe("Text");
      expect(result.pageCount).toBe(2);
    });

    it("should convert non-Error exceptions to string", async () => {
      mockGetText.mockRejectedValue("String error");

      await expect(extractTextFromPDF(Buffer.from("PDF"))).rejects.toThrow(
        "Failed to parse PDF: String error",
      );
    });

    it("should handle null buffer", async () => {
      // @ts-expect-error Testing invalid input
      await expect(extractTextFromPDF(null)).rejects.toThrow(
        "Empty or invalid PDF buffer",
      );
    });
  });
});

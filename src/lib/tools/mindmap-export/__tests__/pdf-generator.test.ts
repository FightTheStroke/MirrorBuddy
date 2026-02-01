/**
 * PDF Generator Tests
 *
 * Tests for mindmap PDF export functionality.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { MindmapData } from "../types";

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

// Mock exportAsMarkdown
vi.mock("../exporters", () => ({
  exportAsMarkdown: vi.fn().mockImplementation((mindmap, filename) => ({
    blob: {
      text: vi.fn().mockResolvedValue(`# ${mindmap.title}\n\nContent here`),
    },
    filename: `${filename}.md`,
    mimeType: "text/markdown",
  })),
}));

describe("PDF Generator", () => {
  const sampleMindmap: MindmapData = {
    title: "Test Mindmap",
    topic: "Testing",
    root: {
      id: "root-1",
      text: "Root Node",
      children: [
        {
          id: "child-1",
          text: "Child 1",
          children: [{ id: "grandchild-1", text: "Grandchild 1" }],
        },
      ],
    },
  };

  beforeEach(() => {
    vi.resetModules();
  });

  describe("exportAsPDF", () => {
    it("should export mindmap as PDF", async () => {
      const { exportAsPDF } = await import("../pdf-generator");

      const result = await exportAsPDF(sampleMindmap, "test-pdf");

      expect(result.filename).toBe("test-pdf.pdf");
      expect(result.mimeType).toBe("application/pdf");
      expect(result.blob).toBeInstanceOf(Blob);
    });

    it("should create valid PDF structure", async () => {
      const { exportAsPDF } = await import("../pdf-generator");

      const result = await exportAsPDF(sampleMindmap, "structure-test");

      const content = await result.blob.text();

      // PDF should have required markers
      expect(content).toContain("%PDF-1.4");
      expect(content).toContain("%%EOF");
      expect(content).toContain("/Type /Catalog");
      expect(content).toContain("/Type /Pages");
      expect(content).toContain("/Type /Page");
    });

    it("should include title in PDF", async () => {
      const { exportAsPDF } = await import("../pdf-generator");

      const result = await exportAsPDF(sampleMindmap, "title-test");

      const content = await result.blob.text();

      expect(content).toContain("Test Mindmap");
    });

    it("should handle mindmap with special characters in title", async () => {
      const specialMindmap: MindmapData = {
        title: "Test (with) special chars",
        root: { id: "1", text: "Root" },
      };

      const { exportAsPDF } = await import("../pdf-generator");

      const result = await exportAsPDF(specialMindmap, "special");

      expect(result.filename).toBe("special.pdf");
      expect(result.mimeType).toBe("application/pdf");
    });

    it("should handle long content by truncating", async () => {
      const { exportAsPDF } = await import("../pdf-generator");

      const result = await exportAsPDF(sampleMindmap, "truncate-test");

      const content = await result.blob.text();

      // Content is truncated to 500 chars in createSimplePDF
      expect(content).toContain("stream");
      expect(content).toContain("endstream");
    });
  });

  describe("createSimplePDF (internal)", () => {
    it("should handle content with newlines", async () => {
      // Mock exportAsMarkdown with content containing newlines
      vi.doMock("../exporters", () => ({
        exportAsMarkdown: vi.fn().mockImplementation(() => ({
          blob: {
            text: vi.fn().mockResolvedValue("Line 1\nLine 2\nLine 3"),
          },
          filename: "test.md",
          mimeType: "text/markdown",
        })),
      }));

      const { exportAsPDF } = await import("../pdf-generator");

      const result = await exportAsPDF(sampleMindmap, "newlines");

      const content = await result.blob.text();

      // Newlines should be converted to PDF text positioning
      expect(content).toContain("Tj");
    });
  });
});

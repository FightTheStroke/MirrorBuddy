/**
 * Summary Export Utilities Tests
 *
 * Tests for HTML generation and escaping helpers.
 */

import { describe, it, expect, vi } from "vitest";
import {
  escapeHtml,
  generateSummaryHtml,
  exportSummaryToPdf,
} from "../summary-export-utils";
import type { SummaryData } from "@/types/tools";

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

describe("Summary Export Utils", () => {
  describe("escapeHtml", () => {
    it("should escape ampersands", () => {
      const result = escapeHtml("Tom & Jerry");
      expect(result).toBe("Tom &amp; Jerry");
    });

    it("should escape less than signs", () => {
      const result = escapeHtml("a < b");
      expect(result).toBe("a &lt; b");
    });

    it("should escape greater than signs", () => {
      const result = escapeHtml("a > b");
      expect(result).toBe("a &gt; b");
    });

    it("should escape double quotes", () => {
      const result = escapeHtml('He said "hello"');
      expect(result).toBe("He said &quot;hello&quot;");
    });

    it("should escape single quotes", () => {
      const result = escapeHtml("It's fine");
      expect(result).toBe("It&#039;s fine");
    });

    it("should escape HTML tags", () => {
      const result = escapeHtml('<script>alert("xss")</script>');
      expect(result).toContain("&lt;script&gt;");
      expect(result).not.toContain("<script>");
    });

    it("should handle empty string", () => {
      const result = escapeHtml("");
      expect(result).toBe("");
    });

    it("should handle text without special characters", () => {
      const result = escapeHtml("Hello World");
      expect(result).toBe("Hello World");
    });
  });

  describe("generateSummaryHtml", () => {
    const baseSummary: SummaryData = {
      topic: "Test Topic",
      sections: [
        {
          title: "Section 1",
          content: "Section content",
          keyPoints: ["Point 1", "Point 2"],
        },
      ],
      length: "medium",
    };

    it("should generate valid HTML document", () => {
      const html = generateSummaryHtml(baseSummary);

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain('<html lang="it">');
      expect(html).toContain("<title>Test Topic</title>");
    });

    it("should include topic as heading", () => {
      const html = generateSummaryHtml(baseSummary);

      expect(html).toContain("<h1>Test Topic</h1>");
    });

    it("should include section content", () => {
      const html = generateSummaryHtml(baseSummary);

      expect(html).toContain("Section 1");
      expect(html).toContain("Section content");
      expect(html).toContain("Point 1");
      expect(html).toContain("Point 2");
    });

    it("should escape special characters in topic", () => {
      const summary: SummaryData = {
        ...baseSummary,
        topic: 'Test <script>alert("xss")</script>',
      };

      const html = generateSummaryHtml(summary);

      expect(html).not.toContain("<script>");
      expect(html).toContain("&lt;script&gt;");
    });

    it('should display "Breve" for short length', () => {
      const summary: SummaryData = { ...baseSummary, length: "short" };

      const html = generateSummaryHtml(summary);

      expect(html).toContain("Riassunto Breve");
    });

    it('should display "Medio" for medium length', () => {
      const html = generateSummaryHtml(baseSummary);

      expect(html).toContain("Riassunto Medio");
    });

    it('should display "Lungo" for long length', () => {
      const summary: SummaryData = { ...baseSummary, length: "long" };

      const html = generateSummaryHtml(summary);

      expect(html).toContain("Riassunto Lungo");
    });

    it("should not display length label for unknown length", () => {
      const summary: SummaryData = {
        ...baseSummary,
        length: "unknown" as SummaryData["length"],
      };

      const html = generateSummaryHtml(summary);

      expect(html).not.toContain("Riassunto Breve");
      expect(html).not.toContain("Riassunto Medio");
      expect(html).not.toContain("Riassunto Lungo");
    });

    it("should handle sections without content", () => {
      const summary: SummaryData = {
        ...baseSummary,
        sections: [{ title: "Title Only", content: "", keyPoints: [] }],
      };

      const html = generateSummaryHtml(summary);

      expect(html).toContain("Title Only");
    });

    it("should handle sections without keyPoints", () => {
      const summary: SummaryData = {
        ...baseSummary,
        sections: [{ title: "Title", content: "Content only" }],
      };

      const html = generateSummaryHtml(summary);

      expect(html).toContain("Content only");
      expect(html).not.toContain("<ul>");
    });

    it("should include footer with MirrorBuddy attribution", () => {
      const html = generateSummaryHtml(baseSummary);

      expect(html).toContain("Generato con MirrorBuddy");
      expect(html).toContain('class="footer"');
    });

    it("should include styles", () => {
      const html = generateSummaryHtml(baseSummary);

      expect(html).toContain("<style>");
      expect(html).toContain("font-family:");
      expect(html).toContain(".section");
    });
  });

  describe("exportSummaryToPdf", () => {
    const mockSummary: SummaryData = {
      topic: "Export Test",
      sections: [{ title: "S1", content: "C1", keyPoints: [] }],
      length: "short",
    };

    it("should throw error when window.open fails", async () => {
      // Mock window.open to return null
      const originalOpen = global.window?.open;
      global.window = {
        ...global.window,
        open: vi.fn().mockReturnValue(null),
      } as unknown as Window & typeof globalThis;

      await expect(exportSummaryToPdf(mockSummary)).rejects.toThrow(
        "Impossibile aprire la finestra di stampa",
      );

      if (originalOpen) {
        global.window.open = originalOpen;
      }
    });

    it("should write HTML to print window", async () => {
      const mockWrite = vi.fn();
      const mockClose = vi.fn();
      const mockPrintWindow = {
        document: {
          write: mockWrite,
          close: mockClose,
        },
        onload: null as (() => void) | null,
        focus: vi.fn(),
        print: vi.fn(),
      };

      global.window = {
        ...global.window,
        open: vi.fn().mockReturnValue(mockPrintWindow),
      } as unknown as Window & typeof globalThis;

      await exportSummaryToPdf(mockSummary);

      expect(mockWrite).toHaveBeenCalled();
      expect(mockClose).toHaveBeenCalled();
    });
  });
});

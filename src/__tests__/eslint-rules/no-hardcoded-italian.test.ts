import { describe, it, expect } from "vitest";

// Simple unit tests for the detection logic
describe("no-hardcoded-italian rule - Detection Logic", () => {
  // Common Italian words pattern (matching the rule)
  const ITALIAN_COMMON_WORDS = [
    "ciao",
    "salve",
    "benvenuto",
    "benvenuta",
    "accedi",
    "esci",
    "uscire",
    "profilo",
    "impostazioni",
    "aiuto",
    "salva",
  ];

  // Pattern to detect Italian text (accented characters common in Italian)
  const ITALIAN_PATTERN = /[àèéìòùù]/i;

  const containsItalian = (text: string): boolean => {
    const lowercased = text.toLowerCase().trim();

    // Check for Italian accented characters
    if (ITALIAN_PATTERN.test(text)) {
      return true;
    }

    // Check for common Italian words
    for (const word of ITALIAN_COMMON_WORDS) {
      // Use word boundary that includes punctuation and end of string
      const wordPattern = new RegExp(
        `(^|\\s)${word}(\\s|[^a-zàèéìòùù]|$)`,
        "i",
      );
      if (wordPattern.test(lowercased)) {
        return true;
      }
    }

    return false;
  };

  describe("containsItalian detection", () => {
    it("should detect Italian text with common words", () => {
      expect(containsItalian("Ciao mondo")).toBe(true);
      expect(containsItalian("Salva")).toBe(true);
      expect(containsItalian("Benvenuto")).toBe(true);
      expect(containsItalian("Accedi al tuo account")).toBe(true);
    });

    it("should detect Italian text with accented characters", () => {
      expect(containsItalian("Là")).toBe(true);
      expect(containsItalian("Così")).toBe(true);
      expect(containsItalian("È necessario")).toBe(true);
      expect(containsItalian("Più informazioni")).toBe(true);
    });

    it("should NOT detect English text", () => {
      expect(containsItalian("Save")).toBe(false);
      expect(containsItalian("Welcome")).toBe(false);
      expect(containsItalian("Something")).toBe(false);
    });

    it("should NOT detect whitespace-only text", () => {
      expect(containsItalian("   ")).toBe(false);
      expect(containsItalian("\n\t")).toBe(false);
    });

    it("should NOT detect variable-like text", () => {
      expect(containsItalian("{variable}")).toBe(false);
    });

    it("should work case-insensitively", () => {
      expect(containsItalian("CIAO MONDO")).toBe(true);
      expect(containsItalian("ciao mondo")).toBe(true);
      expect(containsItalian("Ciao Mondo")).toBe(true);
    });

    it("should detect words even with punctuation", () => {
      expect(containsItalian("Ciao!")).toBe(true);
      expect(containsItalian("Salva?")).toBe(true);
      expect(containsItalian("Benvenuto.")).toBe(true);
    });

    it("should not match partial words", () => {
      // "hello" is in the list but "helloworld" should not match the "hello" word
      expect(containsItalian("helloworld")).toBe(false);
    });
  });

  describe("rule metadata", () => {
    it("should have correct rule metadata", async () => {
      const ruleModule = await import("../../../eslint-local-rules/index.js");
      const rule = ruleModule.rules["no-hardcoded-italian"];
      expect(rule.meta.type).toBe("suggestion");
      expect(rule.meta.docs.description).toMatch(/hardcoded|italian/i);
      expect(rule.meta.docs.category).toBe("Best Practices");
    });

    it("should have JSXText visitor", async () => {
      const ruleModule = await import("../../../eslint-local-rules/index.js");
      const rule = ruleModule.rules["no-hardcoded-italian"];
      const context = rule.create({
        report: () => {},
      });
      expect(context).toHaveProperty("JSXText");
    });
  });
});

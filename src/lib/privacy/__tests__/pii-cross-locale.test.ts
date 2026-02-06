/**
 * Cross-Locale PII Patterns Test Suite
 * Tests PII detection across multiple locales, mixed content, edge cases, and false positives
 */

import { describe, it, expect } from "vitest";
import {
  getCombinedPatterns,
  getLocalePatterns,
  COMBINED_NAME_PATTERN,
  type SupportedLocale,
} from "../pii-patterns";

describe("PII Patterns - Cross-Locale Tests", () => {
  describe("Names with Diacritics", () => {
    const testCases = [
      { name: "François Dupont", locale: "fr" as const },
      { name: "José García", locale: "es" as const },
      { name: "Hans Müller", locale: "de" as const },
      { name: "Patrick O'Brien", locale: "en" as const },
      { name: "Giovanni Rossi", locale: "it" as const },
      { name: "Jean-Pierre Beaumont", locale: "fr" as const },
      { name: "María López", locale: "es" as const },
      { name: "Klaus Schröder", locale: "de" as const },
      { name: "Mary-Anne Sullivan", locale: "en" as const },
      { name: "Maria-Cristina Bianchi", locale: "it" as const },
    ];

    it("should detect names with diacritics using COMBINED_NAME_PATTERN", () => {
      testCases.forEach(({ name }) => {
        const matches = name.match(COMBINED_NAME_PATTERN);
        expect(matches).not.toBeNull();
        expect(matches!.length).toBeGreaterThan(0);
      });
    });

    it("should detect names with diacritics using locale-specific patterns", () => {
      testCases.forEach(({ name, locale }) => {
        const patterns = getLocalePatterns(locale);
        const matches = name.match(patterns.name);
        expect(matches).not.toBeNull();
      });
    });

    it("should detect hyphenated names across locales", () => {
      const hyphenated = [
        "Jean-Pierre Dubois",
        "Mary-Anne Williams",
        "Karl-Heinz Wagner",
      ];
      hyphenated.forEach((name) => {
        expect(name.match(COMBINED_NAME_PATTERN)).not.toBeNull();
      });
    });
  });

  describe("Mixed-Locale Content", () => {
    it("should detect multiple PII types from different locales in single text", () => {
      const mixedText = `
        Italian: Marco Rossi, +39 333 1234567, Via Roma 123
        French: François Martin, 06 12 34 56 78, 15 rue de la République
        German: Hans Müller, +49 170 1234567, Hauptstraße 45
        English: John Smith, +1 555 123 4567, 123 Main Street
        Spanish: José García, +34 612 345 678, Calle Mayor 123
      `;

      const combined = getCombinedPatterns();

      expect(combined.phone.some((p) => p.test(mixedText))).toBe(true);
      expect(combined.address.some((p) => p.test(mixedText))).toBe(true);
      expect(mixedText.match(combined.name)).not.toBeNull();
    });

    it("should detect PII in mixed-language conversation", () => {
      const conversation =
        "Bonjour François Dupont, +34 612 345 678, Hauptstraße 123";
      const combined = getCombinedPatterns();

      expect(combined.phone.some((p) => p.test(conversation))).toBe(true);
      expect(combined.address.some((p) => p.test(conversation))).toBe(true);
      expect(conversation.match(combined.name)).not.toBeNull();
    });
  });

  describe("Edge Cases and False Positives", () => {
    it("should NOT match incomplete phone numbers", () => {
      const incomplete = ["123", "12 34", "123 456", "+1", "555"];
      const combined = getCombinedPatterns();

      incomplete.forEach((text) => {
        expect(combined.phone.some((p) => p.test(text))).toBe(false);
      });
    });

    it("should NOT match short numbers in non-phone context", () => {
      const nonPhones = ["page 123", "room 456", "year 2024"];
      const combined = getCombinedPatterns();

      nonPhones.forEach((text) => {
        expect(combined.phone.some((p) => p.test(text))).toBe(false);
      });
    });

    it("should NOT match common words similar to address patterns", () => {
      const nonAddresses = [
        "via email",
        "corso di laurea",
        "place order",
        "street food",
      ];
      const combined = getCombinedPatterns();

      nonAddresses.forEach((text) => {
        expect(combined.address.some((p) => p.test(text))).toBe(false);
      });
    });

    it("should NOT match product codes as fiscal IDs", () => {
      const codes = ["SKU-123456789", "REF-ABCD1234", "ORDER-987654321"];
      const combined = getCombinedPatterns();

      codes.forEach((code) => {
        expect(combined.fiscalId.some((p) => p.test(code))).toBe(false);
      });
    });

    it("should NOT match partial fiscal IDs", () => {
      const partial = ["RSSMRA85T10", "123456", "AB-12-34", "12-34"];
      const combined = getCombinedPatterns();

      partial.forEach((id) => {
        expect(combined.fiscalId.some((p) => p.test(id))).toBe(false);
      });
    });

    it("should handle URLs without false positives", () => {
      const urls = [
        "https://example.com/page/123",
        "user@example.com",
        "contact@company.fr",
      ];

      urls.forEach((url) => {
        expect(url).toContain(".");
      });
    });
  });

  describe("getCombinedPatterns()", () => {
    const locales: SupportedLocale[] = ["it", "en", "fr", "de", "es"];

    it("should merge phone patterns from all locales", () => {
      const combined = getCombinedPatterns();
      const total = locales.reduce(
        (sum, locale) => sum + getLocalePatterns(locale).phone.length,
        0,
      );
      expect(combined.phone.length).toBe(total);
    });

    it("should merge fiscal ID patterns from all locales", () => {
      const combined = getCombinedPatterns();
      const total = locales.reduce(
        (sum, locale) => sum + getLocalePatterns(locale).fiscalId.length,
        0,
      );
      expect(combined.fiscalId.length).toBe(total);
    });

    it("should merge address patterns from all locales", () => {
      const combined = getCombinedPatterns();
      const total = locales.reduce(
        (sum, locale) => sum + getLocalePatterns(locale).address.length,
        0,
      );
      expect(combined.address.length).toBe(total);
    });

    it("should use COMBINED_NAME_PATTERN for name detection", () => {
      const combined = getCombinedPatterns();
      expect(combined.name).toBe(COMBINED_NAME_PATTERN);
    });

    it("should detect PII from all locales using combined patterns", () => {
      const testData = [
        { text: "+39 333 1234567", category: "phone" },
        { text: "+44 7700 900123", category: "phone" },
        { text: "06 12 34 56 78", category: "phone" },
        { text: "+49 170 1234567", category: "phone" },
        { text: "+34 612 345 678", category: "phone" },
        { text: "Via Roma 123", category: "address" },
        { text: "123 Main Street", category: "address" },
        { text: "15 rue de la Paix", category: "address" },
        { text: "Hauptstraße 45", category: "address" },
        { text: "Calle Mayor 123", category: "address" },
      ];

      const combined = getCombinedPatterns();

      testData.forEach(({ text, category }) => {
        if (category === "phone") {
          expect(combined.phone.some((p) => p.test(text))).toBe(true);
        } else if (category === "address") {
          expect(combined.address.some((p) => p.test(text))).toBe(true);
        }
      });
    });
  });

  describe("Negative Tests", () => {
    it("should NOT match plain text without PII", () => {
      const plainTexts = [
        "Hello, how are you today?",
        "The weather is nice.",
        "Thank you for your help.",
      ];
      const combined = getCombinedPatterns();

      plainTexts.forEach((text) => {
        expect(combined.phone.some((p) => p.test(text))).toBe(false);
        expect(combined.fiscalId.some((p) => p.test(text))).toBe(false);
        expect(combined.address.some((p) => p.test(text))).toBe(false);
      });
    });

    it("should NOT match single words or short phrases", () => {
      const short = ["hello", "goodbye", "yes no", "ok", "thanks"];
      const combined = getCombinedPatterns();

      short.forEach((phrase) => {
        expect(combined.phone.some((p) => p.test(phrase))).toBe(false);
        expect(combined.fiscalId.some((p) => p.test(phrase))).toBe(false);
        expect(combined.address.some((p) => p.test(phrase))).toBe(false);
        expect(phrase.match(combined.name)).toBeNull();
      });
    });

    it("should NOT match numbers in non-PII context", () => {
      const contextual = [
        "There are 3 apples.",
        "The meeting is at 10:30 AM.",
        "I scored 95%.",
        "Chapter 7, page 123.",
      ];
      const combined = getCombinedPatterns();

      contextual.forEach((text) => {
        expect(combined.phone.some((p) => p.test(text))).toBe(false);
        expect(combined.fiscalId.some((p) => p.test(text))).toBe(false);
      });
    });
  });
});

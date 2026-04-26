/**
 * PII Patterns Test Suite
 * Tests for multi-locale PII pattern registry structure and functions
 * Locale-specific tests are in separate files (pii-patterns-{locale}.test.ts)
 */

import { describe, it, expect } from "vitest";
import {
  PIIPatternCategory,
  LocalePIIPatterns,
  getLocalePatterns,
  getCombinedPatterns,
  PII_LOCALE_REGISTRY,
  COMBINED_NAME_PATTERN,
} from "../pii-patterns";

describe("PII Patterns - Structure", () => {
  it("should export PIIPatternCategory type definition", () => {
    const category: PIIPatternCategory = {
      phone: [],
      fiscalId: [],
      address: [],
      name: /test/,
    };
    expect(category).toBeDefined();
  });

  it("should export LocalePIIPatterns type definition", () => {
    const patterns: LocalePIIPatterns = {
      it: { phone: [], fiscalId: [], address: [], name: /test/ },
      en: { phone: [], fiscalId: [], address: [], name: /test/ },
      fr: { phone: [], fiscalId: [], address: [], name: /test/ },
      de: { phone: [], fiscalId: [], address: [], name: /test/ },
      es: { phone: [], fiscalId: [], address: [], name: /test/ },
    };
    expect(patterns).toBeDefined();
  });

  it("should export PII_LOCALE_REGISTRY with all five locales", () => {
    expect(PII_LOCALE_REGISTRY).toBeDefined();
    expect(PII_LOCALE_REGISTRY.it).toBeDefined();
    expect(PII_LOCALE_REGISTRY.en).toBeDefined();
    expect(PII_LOCALE_REGISTRY.fr).toBeDefined();
    expect(PII_LOCALE_REGISTRY.de).toBeDefined();
    expect(PII_LOCALE_REGISTRY.es).toBeDefined();
  });

  it("should have placeholder arrays for each locale category", () => {
    const locales = ["it", "en", "fr", "de", "es"] as const;
    locales.forEach((locale) => {
      expect(Array.isArray(PII_LOCALE_REGISTRY[locale].phone)).toBe(true);
      expect(Array.isArray(PII_LOCALE_REGISTRY[locale].fiscalId)).toBe(true);
      expect(Array.isArray(PII_LOCALE_REGISTRY[locale].address)).toBe(true);
      expect(PII_LOCALE_REGISTRY[locale].name).toBeInstanceOf(RegExp);
    });
  });
});

describe("PII Patterns - Combined Name Pattern", () => {
  it("should export COMBINED_NAME_PATTERN using Unicode property escapes", () => {
    expect(COMBINED_NAME_PATTERN).toBeInstanceOf(RegExp);
    expect(COMBINED_NAME_PATTERN.source).toContain("\\p{Lu}");
    expect(COMBINED_NAME_PATTERN.source).toContain("\\p{Ll}");
    expect(COMBINED_NAME_PATTERN.unicode).toBe(true);
  });

  it("should match simple capitalized names", () => {
    const pattern = new RegExp(COMBINED_NAME_PATTERN.source, "gu");
    expect("Mario Rossi".match(pattern)).toBeTruthy();
    expect("John Smith".match(pattern)).toBeTruthy();
    expect("Jean Dupont".match(pattern)).toBeTruthy();
  });

  it("should match names with diacritics", () => {
    const pattern = new RegExp(COMBINED_NAME_PATTERN.source, "gu");
    expect("François Müller".match(pattern)).toBeTruthy();
    expect("José García".match(pattern)).toBeTruthy();
    expect("André Côté".match(pattern)).toBeTruthy();
  });

  it("should match hyphenated names", () => {
    const pattern = new RegExp(COMBINED_NAME_PATTERN.source, "gu");
    expect("Jean-Pierre Dubois".match(pattern)).toBeTruthy();
    expect("Mary-Anne Smith".match(pattern)).toBeTruthy();
    expect("Karl-Heinz Schmidt".match(pattern)).toBeTruthy();
  });

  it("should NOT match single words or lowercase text", () => {
    const pattern = new RegExp(COMBINED_NAME_PATTERN.source, "gu");
    expect("hello".match(pattern)).toBeNull();
    expect("lowercase text".match(pattern)).toBeNull();
  });

  it("should match multiple names in text", () => {
    const pattern = new RegExp(COMBINED_NAME_PATTERN.source, "gu");
    const text = "Mario Rossi met François Müller and José García";
    const matches = text.match(pattern);
    expect(matches).toBeTruthy();
    expect(matches!.length).toBeGreaterThanOrEqual(3);
  });
});

describe("PII Patterns - Functions", () => {
  it("should provide getLocalePatterns function", () => {
    expect(typeof getLocalePatterns).toBe("function");
  });

  it("should return patterns for valid locale", () => {
    const patterns = getLocalePatterns("it");
    expect(patterns).toBeDefined();
    expect(patterns.phone).toBeDefined();
    expect(patterns.fiscalId).toBeDefined();
    expect(patterns.address).toBeDefined();
    expect(patterns.name).toBeInstanceOf(RegExp);
  });

  it("should return patterns for all supported locales", () => {
    const locales = ["it", "en", "fr", "de", "es"] as const;
    locales.forEach((locale) => {
      const patterns = getLocalePatterns(locale);
      expect(patterns).toBeDefined();
    });
  });

  it("should provide getCombinedPatterns function", () => {
    expect(typeof getCombinedPatterns).toBe("function");
  });

  it("should return combined patterns from all locales", () => {
    const combined = getCombinedPatterns();
    expect(combined).toBeDefined();
    expect(Array.isArray(combined.phone)).toBe(true);
    expect(Array.isArray(combined.fiscalId)).toBe(true);
    expect(Array.isArray(combined.address)).toBe(true);
    expect(combined.name).toBeInstanceOf(RegExp);
  });

  it("should combine patterns from multiple locales", () => {
    const combined = getCombinedPatterns();
    // Even if individual arrays are empty, combined should have arrays
    expect(combined.phone).toBeDefined();
    expect(combined.fiscalId).toBeDefined();
    expect(combined.address).toBeDefined();
  });
});

describe("PII Patterns - Edge Cases", () => {
  it("should handle empty pattern arrays gracefully", () => {
    const patterns = getLocalePatterns("it");
    expect(patterns.phone).toBeDefined();
    expect(Array.isArray(patterns.phone)).toBe(true);
  });

  it("should return the same COMBINED_NAME_PATTERN across calls", () => {
    const patterns1 = getLocalePatterns("it");
    const patterns2 = getLocalePatterns("en");
    expect(patterns1.name).toEqual(patterns2.name);
  });
});

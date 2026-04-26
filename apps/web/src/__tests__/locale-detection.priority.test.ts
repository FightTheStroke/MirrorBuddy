import { describe, it, expect } from "vitest";
import { detectLocaleFromRequest } from "@/lib/i18n/locale-detection";

describe("detectLocaleFromRequest", () => {
  it("should prioritize cookie over Accept-Language header", () => {
    const locale = detectLocaleFromRequest({
      cookieHeader: "NEXT_LOCALE=fr",
      acceptLanguageHeader: "en",
    });
    expect(locale).toBe("fr");
  });

  it("should use Accept-Language if cookie not set", () => {
    const locale = detectLocaleFromRequest({
      cookieHeader: null,
      acceptLanguageHeader: "de",
    });
    expect(locale).toBe("de");
  });

  it("should fallback to default locale if neither set", () => {
    const locale = detectLocaleFromRequest({
      cookieHeader: null,
      acceptLanguageHeader: null,
    });
    expect(locale).toBe("it");
  });

  it("should handle invalid cookie value", () => {
    const locale = detectLocaleFromRequest({
      cookieHeader: "NEXT_LOCALE=ja", // invalid locale
      acceptLanguageHeader: "en",
    });
    expect(locale).toBe("en"); // fallback to Accept-Language
  });

  it("should handle empty strings", () => {
    const locale = detectLocaleFromRequest({
      cookieHeader: "",
      acceptLanguageHeader: "",
    });
    expect(locale).toBe("it"); // fallback to default
  });

  it("should extract and validate locale from complex Accept-Language header", () => {
    const locale = detectLocaleFromRequest({
      cookieHeader: null,
      acceptLanguageHeader: "fr;q=0.9,en;q=0.8,it;q=0.7",
    });
    expect(locale).toBe("fr");
  });

  it("should handle multiple headers gracefully", () => {
    // Cookie overrides everything
    const result1 = detectLocaleFromRequest({
      cookieHeader: "NEXT_LOCALE=es",
      acceptLanguageHeader: "it,en;q=0.9",
    });
    expect(result1).toBe("es");

    // Accept-Language fallback when cookie is invalid
    const result2 = detectLocaleFromRequest({
      cookieHeader: "NEXT_LOCALE=invalid",
      acceptLanguageHeader: "en",
    });
    expect(result2).toBe("en");
  });
});

describe("Integration tests - Priority chain", () => {
  it("should follow priority: Cookie > Accept-Language > Default", () => {
    // Case 1: Cookie available
    let result = detectLocaleFromRequest({
      cookieHeader: "NEXT_LOCALE=de",
      acceptLanguageHeader: "it",
    });
    expect(result).toBe("de"); // Cookie wins

    // Case 2: Cookie invalid, Accept-Language fallback
    result = detectLocaleFromRequest({
      cookieHeader: "NEXT_LOCALE=invalid",
      acceptLanguageHeader: "en",
    });
    expect(result).toBe("en"); // Accept-Language wins

    // Case 3: Both invalid/missing, use default
    result = detectLocaleFromRequest({
      cookieHeader: "NEXT_LOCALE=ja",
      acceptLanguageHeader: "invalid",
    });
    expect(result).toBe("it"); // Default wins
  });

  it("should handle real-world Accept-Language header from browsers", () => {
    // Chrome on Italian locale
    const chromeIT = detectLocaleFromRequest({
      cookieHeader: null,
      acceptLanguageHeader: "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
    });
    expect(chromeIT).toBe("it");

    // Firefox on English locale
    const firefoxEN = detectLocaleFromRequest({
      cookieHeader: null,
      acceptLanguageHeader: "en-US,en;q=0.5",
    });
    expect(firefoxEN).toBe("en");

    // Safari on French locale
    const safarieFR = detectLocaleFromRequest({
      cookieHeader: null,
      acceptLanguageHeader: "fr-CH,fr;q=0.9,en;q=0.8,de;q=0.7",
    });
    expect(safarieFR).toBe("fr");
  });

  it("should handle edge case: wildcard in Accept-Language", () => {
    const result = detectLocaleFromRequest({
      cookieHeader: null,
      acceptLanguageHeader: "ja;q=0.5,*;q=0.1", // Unknown language with wildcard
    });
    // Should find a default supported locale
    expect(["it", "en", "fr", "de", "es"]).toContain(result);
  });
});

describe("Error handling and edge cases", () => {
  it("should handle undefined inputs gracefully", () => {
    const result = detectLocaleFromRequest({
      cookieHeader: undefined as unknown as string,
      acceptLanguageHeader: undefined as unknown as string,
    });
    expect(result).toBe("it");
  });

  it("should handle very long Accept-Language headers", () => {
    const longHeader = Array(100)
      .fill(null)
      .map((_, i) => {
        const locales = ["it", "en", "fr", "de", "es"];
        return `${locales[i % 5]};q=${(1 - i / 100).toFixed(2)}`;
      })
      .join(",");

    const result = detectLocaleFromRequest({
      cookieHeader: null,
      acceptLanguageHeader: longHeader,
    });
    expect(["it", "en", "fr", "de", "es"]).toContain(result);
  });

  it("should be consistent across multiple calls", () => {
    const input = {
      cookieHeader: "NEXT_LOCALE=en",
      acceptLanguageHeader: "it",
    };

    const result1 = detectLocaleFromRequest(input);
    const result2 = detectLocaleFromRequest(input);
    const result3 = detectLocaleFromRequest(input);

    expect(result1).toBe(result2);
    expect(result2).toBe(result3);
  });
});

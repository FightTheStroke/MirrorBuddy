import { describe, it, expect } from "vitest";
import {
  parseAcceptLanguageHeader,
  isValidLocale,
} from "@/lib/i18n/locale-detection";

describe("parseAcceptLanguageHeader", () => {
  it("should parse single language code", () => {
    const locale = parseAcceptLanguageHeader("en");
    expect(locale).toBe("en");
  });

  it("should parse language code with region", () => {
    const locale = parseAcceptLanguageHeader("en-US");
    expect(locale).toBe("en");
  });

  it("should parse weighted Accept-Language header", () => {
    // Italian is preferred (q=1.0, implicit), then English (q=0.9)
    const locale = parseAcceptLanguageHeader("it,en;q=0.9");
    expect(locale).toBe("it");
  });

  it("should respect quality weights in Accept-Language", () => {
    // English is preferred (q=0.9) over French (q=0.8)
    const locale = parseAcceptLanguageHeader("fr;q=0.8,en;q=0.9");
    expect(locale).toBe("en");
  });

  it("should handle multiple languages with different qualities", () => {
    const locale = parseAcceptLanguageHeader(
      "it;q=1.0,en;q=0.9,fr;q=0.8,de;q=0.7,es;q=0.6",
    );
    expect(locale).toBe("it");
  });

  it("should handle language variants and prefer main language", () => {
    const locale = parseAcceptLanguageHeader("en-GB,en;q=0.9,it;q=0.8");
    expect(locale).toBe("en");
  });

  it("should return supported locale from Accept-Language", () => {
    // If browser sends en-US, should resolve to 'en' (supported)
    const locale = parseAcceptLanguageHeader("en-US,en;q=0.9");
    expect(locale).toBe("en");
  });

  it("should fallback to default locale if no supported language found", () => {
    const locale = parseAcceptLanguageHeader("ja,ko;q=0.9,zh;q=0.8");
    expect(locale).toBe("it"); // default locale
  });

  it("should handle malformed Accept-Language headers gracefully", () => {
    const locale = parseAcceptLanguageHeader(";;;invalid;;;");
    expect(locale).toBe("it"); // fallback to default
  });

  it("should handle empty string", () => {
    const locale = parseAcceptLanguageHeader("");
    expect(locale).toBe("it"); // fallback to default
  });

  it("should be case-insensitive for language codes", () => {
    const locale = parseAcceptLanguageHeader("EN-us,FR;q=0.5");
    expect(locale).toBe("en");
  });

  it("should handle wildcard (*) in Accept-Language", () => {
    const locale = parseAcceptLanguageHeader("en;q=0.9,*;q=0.1");
    expect(locale).toBe("en");
  });
});

describe("isValidLocale", () => {
  it("should return true for valid locales", () => {
    expect(isValidLocale("it")).toBe(true);
    expect(isValidLocale("en")).toBe(true);
    expect(isValidLocale("fr")).toBe(true);
    expect(isValidLocale("de")).toBe(true);
    expect(isValidLocale("es")).toBe(true);
  });

  it("should return false for invalid locales", () => {
    expect(isValidLocale("ja")).toBe(false);
    expect(isValidLocale("ko")).toBe(false);
    expect(isValidLocale("invalid")).toBe(false);
  });

  it("should return false for empty string", () => {
    expect(isValidLocale("")).toBe(false);
  });

  it("should be case-sensitive", () => {
    expect(isValidLocale("EN")).toBe(false);
    expect(isValidLocale("It")).toBe(false);
  });
});

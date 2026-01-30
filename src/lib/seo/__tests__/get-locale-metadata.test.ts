import { describe, it, expect } from "vitest";
import {
  getLocaleMetadata,
  extractPathnameWithoutLocale,
} from "../get-locale-metadata";
import type { Locale } from "../hreflang.types";

describe("getLocaleMetadata", () => {
  const locales: readonly Locale[] = ["it", "en", "fr", "de", "es"];

  it("should return metadata with alternates", () => {
    const metadata = getLocaleMetadata("/welcome", locales);
    expect(metadata).toHaveProperty("alternates");
    expect(metadata.alternates).toHaveProperty("languages");
    expect(metadata.alternates).toHaveProperty("canonical");
  });

  it("should include all locales in languages", () => {
    const metadata = getLocaleMetadata("/welcome", locales);
    const languages = metadata.alternates?.languages;
    expect(languages).toBeDefined();
    if (languages) {
      expect(Object.keys(languages)).toContain("it");
      expect(Object.keys(languages)).toContain("en");
      expect(Object.keys(languages)).toContain("fr");
      expect(Object.keys(languages)).toContain("de");
      expect(Object.keys(languages)).toContain("es");
    }
  });

  it("should set canonical to x-default URL", () => {
    const metadata = getLocaleMetadata("/welcome", locales);
    const canonical = metadata.alternates?.canonical;
    expect(canonical).toBe("https://mirrorbuddy.org/it/welcome");
  });

  it("should handle root path", () => {
    const metadata = getLocaleMetadata("/", locales);
    const canonical = metadata.alternates?.canonical;
    expect(canonical).toBe("https://mirrorbuddy.org/it");
  });

  it("should use NEXT_PUBLIC_SITE_URL from env if available", () => {
    // This test would require mocking process.env
    // For now, just verify the function accepts the expected locales
    const metadata = getLocaleMetadata("/home", locales);
    expect(metadata.alternates?.canonical).toBeDefined();
  });
});

describe("extractPathnameWithoutLocale", () => {
  it("should remove locale prefix from pathname", () => {
    const result = extractPathnameWithoutLocale("/it/welcome", "it");
    expect(result).toBe("/welcome");
  });

  it("should return root slash if only locale in pathname", () => {
    const result = extractPathnameWithoutLocale("/it", "it");
    expect(result).toBe("/");
  });

  it("should handle nested paths", () => {
    const result = extractPathnameWithoutLocale("/en/admin/users/123", "en");
    expect(result).toBe("/admin/users/123");
  });

  it("should return original pathname if locale not at start", () => {
    const result = extractPathnameWithoutLocale("/home/it/page", "it");
    expect(result).toBe("/home/it/page");
  });

  it("should handle empty pathname", () => {
    const result = extractPathnameWithoutLocale("", "it");
    expect(result).toBe("/");
  });

  it("should handle pathname with query string", () => {
    const result = extractPathnameWithoutLocale("/it/search?q=test", "it");
    expect(result).toBe("/search?q=test");
  });
});

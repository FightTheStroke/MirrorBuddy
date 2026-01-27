/**
 * Tests for canonical URL generation
 * Ensures each localized page has correct canonical URLs pointing to its own locale version
 */

import { describe, it, expect } from "vitest";
import { generateCanonicalUrl, getCanonicalMetadata } from "../canonical-urls";
import type { Locale } from "@/i18n/config";

describe("canonical-urls", () => {
  // Test base URL from environment
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mirrorbuddy.edu";

  describe("generateCanonicalUrl", () => {
    it("generates canonical URL for root path with locale", () => {
      const url = generateCanonicalUrl("it", "/");
      expect(url).toBe(`${baseUrl}/it`);
    });

    it("generates canonical URL for nested path with locale", () => {
      const url = generateCanonicalUrl("en", "/maestri/galileo");
      expect(url).toBe(`${baseUrl}/en/maestri/galileo`);
    });

    it("generates canonical URL with query parameters preserved", () => {
      const url = generateCanonicalUrl("es", "/search?q=mathematics");
      expect(url).toBe(`${baseUrl}/es/search?q=mathematics`);
    });

    it("handles dynamic routes correctly", () => {
      const url = generateCanonicalUrl("fr", "/flashcards/123");
      expect(url).toBe(`${baseUrl}/fr/flashcards/123`);
    });

    it("generates different URLs for different locales", () => {
      const paths: Locale[] = ["it", "en", "es", "fr", "de"];
      const urls = paths.map((locale) =>
        generateCanonicalUrl(locale, "/maestri"),
      );

      // All URLs should be unique
      expect(new Set(urls).size).toBe(5);

      // Italian version
      expect(urls[0]).toBe(`${baseUrl}/it/maestri`);

      // English version
      expect(urls[1]).toBe(`${baseUrl}/en/maestri`);
    });

    it("handles paths with trailing slashes", () => {
      const url = generateCanonicalUrl("it", "/maestri/");
      expect(url).toBe(`${baseUrl}/it/maestri/`);
    });

    it("does not double-encode paths", () => {
      const url = generateCanonicalUrl("it", "/search?q=test%20query");
      expect(url).toContain("test%20query");
    });
  });

  describe("getCanonicalMetadata", () => {
    it("returns canonical metadata object for given locale and path", () => {
      const metadata = getCanonicalMetadata("it", "/maestri");
      expect(metadata).toHaveProperty("canonical");
      expect(metadata.canonical).toBe(`${baseUrl}/it/maestri`);
    });

    it("includes canonical link in metadata", () => {
      const metadata = getCanonicalMetadata("en", "/");
      expect(metadata).toBeDefined();
      expect(metadata.canonical).toBe(`${baseUrl}/en`);
    });

    it("returns different canonical URLs for different locales", () => {
      const metadataIT = getCanonicalMetadata("it", "/flashcards");
      const metadataEN = getCanonicalMetadata("en", "/flashcards");
      const metadataES = getCanonicalMetadata("es", "/flashcards");

      expect(metadataIT.canonical).toBe(`${baseUrl}/it/flashcards`);
      expect(metadataEN.canonical).toBe(`${baseUrl}/en/flashcards`);
      expect(metadataES.canonical).toBe(`${baseUrl}/es/flashcards`);

      // All should be different
      const canonicals = [
        metadataIT.canonical,
        metadataEN.canonical,
        metadataES.canonical,
      ];
      expect(new Set(canonicals).size).toBe(3);
    });

    it("handles dynamic routes in canonical metadata", () => {
      const metadata = getCanonicalMetadata("it", "/quiz/123/question/456");
      expect(metadata.canonical).toBe(`${baseUrl}/it/quiz/123/question/456`);
    });

    it("preserves query parameters in canonical metadata", () => {
      const metadata = getCanonicalMetadata("it", "/search?q=calculus");
      expect(metadata.canonical).toContain("search?q=calculus");
    });
  });

  describe("integration scenarios", () => {
    it("same path returns same canonical URL across function calls", () => {
      const url1 = generateCanonicalUrl("it", "/maestri/galileo");
      const url2 = generateCanonicalUrl("it", "/maestri/galileo");
      expect(url1).toBe(url2);
    });

    it("canonical URL is absolute with domain", () => {
      const url = generateCanonicalUrl("it", "/maestri");
      expect(url).toMatch(/^https?:\/\//);
    });

    it("each locale gets its own canonical (no cross-locale canonicals)", () => {
      const itUrl = generateCanonicalUrl("it", "/maestri");
      const enUrl = generateCanonicalUrl("en", "/maestri");

      // Should point to respective locales, not default
      expect(itUrl).toContain("/it/");
      expect(enUrl).toContain("/en/");

      // Italian canonical should not point to English version
      expect(itUrl).not.toEqual(enUrl);
    });
  });

  describe("SEO compliance", () => {
    it("canonical URL does not include hash fragments", () => {
      const url = generateCanonicalUrl("it", "/maestri#section");
      expect(url).not.toContain("#");
    });

    it("returns fully qualified URLs suitable for meta tags", () => {
      const url = generateCanonicalUrl("it", "/maestri");
      // Should be suitable for use in <link rel="canonical" href="..." />
      expect(url).toMatch(/^https?:\/\/[^/]+\/it\/maestri$/);
    });
  });
});

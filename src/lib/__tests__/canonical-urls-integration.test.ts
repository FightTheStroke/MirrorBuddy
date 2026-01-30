/**
 * Integration tests for canonical URLs in metadata
 * Tests the full flow from page generation to metadata output
 */

import { describe, it, expect } from "vitest";
import { generateCanonicalUrl } from "../canonical-urls";
import {
  mergeCanonicalMetadata,
  createLocalizedMetadata,
} from "../metadata-helpers";
import type { Locale } from "@/i18n/config";
import type { Metadata } from "next";

describe("canonical-urls integration", () => {
  describe("metadata integration", () => {
    it("merges canonical into existing metadata", () => {
      const baseMetadata: Metadata = {
        title: "Test Page",
        description: "Test Description",
      };

      const result = mergeCanonicalMetadata(baseMetadata, "it", "/test");

      expect(result.title).toBe("Test Page");
      expect(result.description).toBe("Test Description");
      expect(result.alternates?.canonical).toContain("/it/test");
    });

    it("creates complete localized metadata", () => {
      const metadata = createLocalizedMetadata("en", "/maestri", {
        title: "Meet the Maestri",
        description: "Discover our AI tutors",
      });

      expect(metadata).toHaveProperty("title", "Meet the Maestri");
      expect(metadata).toHaveProperty("description", "Discover our AI tutors");
      expect(metadata.alternates?.canonical).toContain("/en/maestri");
    });

    it("canonical link is properly formatted for HTML meta tag", () => {
      const canonicalUrl = generateCanonicalUrl("it", "/privacy");

      // Should be suitable for use in <link rel="canonical" href="..." />
      expect(canonicalUrl).toMatch(/^https?:\/\//);
      expect(canonicalUrl).not.toContain("<");
      expect(canonicalUrl).not.toContain(">");
      expect(canonicalUrl).not.toContain('"');
    });
  });

  describe("locale separation", () => {
    const locales: Locale[] = ["it", "en", "es", "fr", "de"];
    const testPath = "/maestri";

    it("each locale gets unique canonical URL", () => {
      const canonicals = locales.map((locale) =>
        generateCanonicalUrl(locale, testPath),
      );

      // All should be unique
      expect(new Set(canonicals).size).toBe(locales.length);
    });

    it("locales do not cross-reference in canonicals", () => {
      const itCanonical = generateCanonicalUrl("it", testPath);
      const enCanonical = generateCanonicalUrl("en", testPath);
      const esCanonical = generateCanonicalUrl("es", testPath);

      // Italian page should not point to English canonical
      expect(itCanonical).toContain("/it/");
      expect(itCanonical).not.toContain("/en/");

      // English page should not point to Spanish canonical
      expect(enCanonical).toContain("/en/");
      expect(enCanonical).not.toContain("/es/");

      // Spanish page should not point to Italian canonical
      expect(esCanonical).toContain("/es/");
      expect(esCanonical).not.toContain("/it/");
    });
  });

  describe("SEO compliance", () => {
    it("canonical URLs are absolute", () => {
      const canonicals = [
        generateCanonicalUrl("it", "/"),
        generateCanonicalUrl("en", "/maestri"),
        generateCanonicalUrl("es", "/quiz/123"),
      ];

      canonicals.forEach((canonical) => {
        expect(canonical).toMatch(/^https?:\/\/[^/]+\//);
      });
    });

    it("canonical URLs include locale in path", () => {
      const paths = ["/", "/maestri", "/privacy", "/terms"];

      paths.forEach((path) => {
        const canonical = generateCanonicalUrl("it", path);
        expect(canonical).toContain("/it");
      });
    });

    it("fragment identifiers are stripped from canonical URLs", () => {
      const urlWithFragment = generateCanonicalUrl("it", "/maestri#section");
      expect(urlWithFragment).not.toContain("#");
      expect(urlWithFragment).toBe(generateCanonicalUrl("it", "/maestri"));
    });

    it("query parameters are preserved in canonical URLs", () => {
      const canonicalWithParams = generateCanonicalUrl(
        "it",
        "/search?q=test&page=1",
      );
      expect(canonicalWithParams).toContain("?q=test");
      expect(canonicalWithParams).toContain("page=1");
    });
  });

  describe("dynamic route handling", () => {
    it("handles dynamic route parameters correctly", () => {
      const dynamicRoutes = [
        "/maestri/123",
        "/quiz/abc-def/question/1",
        "/flashcards/user-xyz",
        "/homework/assignment-2024",
      ];

      dynamicRoutes.forEach((route) => {
        const canonical = generateCanonicalUrl("it", route);
        expect(canonical).toContain(route);
        expect(canonical).toMatch(/^https?:\/\//);
      });
    });

    it("different dynamic IDs produce different canonical URLs", () => {
      const url1 = generateCanonicalUrl("it", "/maestri/123");
      const url2 = generateCanonicalUrl("it", "/maestri/456");

      expect(url1).not.toEqual(url2);
      expect(url1).toContain("123");
      expect(url2).toContain("456");
    });
  });

  describe("metadata structure", () => {
    it("canonical metadata follows Next.js alternates structure", () => {
      const metadata = createLocalizedMetadata("it", "/test");

      expect(metadata).toHaveProperty("alternates");
      expect(metadata.alternates).toHaveProperty("canonical");
      expect(typeof metadata.alternates?.canonical).toBe("string");
    });

    it("preserves additional metadata when merging canonical", () => {
      const baseMetadata: Metadata = {
        title: "Test",
        description: "Test Description",
        keywords: ["a", "b", "c"],
        robots: "index, follow",
        openGraph: {
          title: "OG Title",
          description: "OG Description",
          type: "website",
        },
      };

      const result = mergeCanonicalMetadata(baseMetadata, "it", "/test");

      expect(result.title).toBe("Test");
      expect(result.description).toBe("Test Description");
      expect(result.keywords).toEqual(["a", "b", "c"]);
      expect(result.robots).toBe("index, follow");
      expect(result.openGraph).toBeDefined();
      expect(result.alternates?.canonical).toBeDefined();
    });
  });

  describe("environment configuration", () => {
    it("uses environment NEXT_PUBLIC_SITE_URL when set", () => {
      const originalEnv = process.env.NEXT_PUBLIC_SITE_URL;

      try {
        // Simulate environment variable
        const testBaseUrl = "https://test.example.com";
        process.env.NEXT_PUBLIC_SITE_URL = testBaseUrl;

        const canonical = generateCanonicalUrl("it", "/maestri");
        expect(canonical).toContain(testBaseUrl);
      } finally {
        // Restore original environment
        process.env.NEXT_PUBLIC_SITE_URL = originalEnv;
      }
    });

    it("falls back to default domain when env var not set", () => {
      const originalEnv = process.env.NEXT_PUBLIC_SITE_URL;

      try {
        delete process.env.NEXT_PUBLIC_SITE_URL;

        const canonical = generateCanonicalUrl("it", "/maestri");
        expect(canonical).toContain("mirrorbuddy.org");
      } finally {
        process.env.NEXT_PUBLIC_SITE_URL = originalEnv;
      }
    });
  });
});

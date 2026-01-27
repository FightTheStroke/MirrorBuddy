/**
 * Integration tests for hreflang tags on specific pages
 * Tests F-74: All pages have proper hreflang tags for SEO
 */

import { describe, it, expect } from "vitest";
import { generateHreflangTags } from "../hreflang";
import type { Locale } from "../hreflang.types";

describe("F-74: Hreflang tags on specific pages", () => {
  const baseUrl = "https://mirrorbuddy.edu";
  const locales: readonly Locale[] = ["it", "en", "fr", "de", "es"];

  describe("Welcome page", () => {
    it("should generate hreflang tags for welcome page across all locales", () => {
      const tags = generateHreflangTags(baseUrl, "/welcome", locales);

      expect(tags).toHaveLength(6); // 5 locales + x-default

      // Verify all locales are present
      const hreflangs = tags.map((tag) => tag.hreflang).sort();
      expect(hreflangs).toEqual(["de", "en", "es", "fr", "it", "x-default"]);
    });

    it("should include self-referencing Italian welcome", () => {
      const tags = generateHreflangTags(baseUrl, "/welcome", locales);
      const itTag = tags.find((tag) => tag.hreflang === "it");

      expect(itTag).toBeDefined();
      expect(itTag?.href).toBe("https://mirrorbuddy.edu/it/welcome");
    });

    it("should include English welcome variant", () => {
      const tags = generateHreflangTags(baseUrl, "/welcome", locales);
      const enTag = tags.find((tag) => tag.hreflang === "en");

      expect(enTag).toBeDefined();
      expect(enTag?.href).toBe("https://mirrorbuddy.edu/en/welcome");
    });
  });

  describe("Home page", () => {
    it("should generate hreflang tags for home page", () => {
      const tags = generateHreflangTags(baseUrl, "/", locales);

      expect(tags).toHaveLength(6);
      expect(tags.every((tag) => tag.rel === "alternate")).toBe(true);
    });

    it("should point to root paths for all locales", () => {
      const tags = generateHreflangTags(baseUrl, "/", locales);

      tags.forEach((tag) => {
        if (tag.hreflang !== "x-default") {
          expect(tag.href).toMatch(/\/[a-z]{2}$/);
        }
      });
    });

    it("should have x-default pointing to default locale", () => {
      const tags = generateHreflangTags(baseUrl, "/", locales);
      const xDefault = tags.find((tag) => tag.hreflang === "x-default");

      expect(xDefault?.href).toBe("https://mirrorbuddy.edu/it");
    });
  });

  describe("Tools page", () => {
    const toolPages = [
      "/mindmap",
      "/quiz",
      "/flashcards",
      "/pdf",
      "/homework",
      "/summary",
      "/formula",
      "/chart",
      "/webcam",
    ];

    toolPages.forEach((page) => {
      it(`should generate hreflang tags for ${page}`, () => {
        const tags = generateHreflangTags(baseUrl, page, locales);

        expect(tags).toHaveLength(6);
        expect(tags.every((tag) => tag.rel === "alternate")).toBe(true);
      });

      it(`should have valid URLs for all locales on ${page}`, () => {
        const tags = generateHreflangTags(baseUrl, page, locales);

        tags.forEach((tag) => {
          expect(tag.href).toMatch(/^https:\/\/mirrorbuddy\.edu/);
          if (tag.hreflang !== "x-default") {
            expect(tag.href).toContain(`/${tag.hreflang}${page}`);
          }
        });
      });
    });
  });

  describe("Acceptance criteria verification", () => {
    it("AC1: Add hreflang link tags to page head for all 5 locales", () => {
      const tags = generateHreflangTags(baseUrl, "/welcome", locales);
      const locale_tags = tags.filter((tag) => tag.hreflang !== "x-default");

      expect(locale_tags).toHaveLength(5);
      expect(locale_tags.map((t) => t.hreflang).sort()).toEqual([
        "de",
        "en",
        "es",
        "fr",
        "it",
      ]);
    });

    it("AC2: Include x-default for fallback", () => {
      const tags = generateHreflangTags(baseUrl, "/welcome", locales);
      const xDefault = tags.find((tag) => tag.hreflang === "x-default");

      expect(xDefault).toBeDefined();
      expect(xDefault?.href).toBe("https://mirrorbuddy.edu/it/welcome");
    });

    it('AC4: Tags should be <link rel="alternate" hreflang="..." href="..." />', () => {
      const tags = generateHreflangTags(baseUrl, "/welcome", locales);

      tags.forEach((tag) => {
        expect(tag.rel).toBe("alternate");
        expect(tag.hreflang).toBeTruthy();
        expect(tag.href).toMatch(/^https:\/\//);
      });
    });

    it("AC5: Self-referencing hreflang (current page also listed)", () => {
      const welcomeTags = generateHreflangTags(baseUrl, "/welcome", locales);
      const itWelcomeTag = welcomeTags.find((tag) => tag.hreflang === "it");

      expect(itWelcomeTag?.href).toBe("https://mirrorbuddy.edu/it/welcome");
    });

    it("AC6: Test on multiple pages (welcome, home, tools)", () => {
      const pages = ["/welcome", "/", "/quiz", "/mindmap", "/flashcards"];

      pages.forEach((page) => {
        const tags = generateHreflangTags(baseUrl, page, locales);

        // All pages should have tags for all locales
        expect(tags.length).toBeGreaterThanOrEqual(6);
        expect(tags.every((tag) => tag.rel === "alternate")).toBe(true);
        expect(tags.some((tag) => tag.hreflang === "x-default")).toBe(true);
      });
    });
  });
});

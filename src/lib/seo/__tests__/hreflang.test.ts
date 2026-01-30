import { describe, it, expect } from "vitest";
import { generateHreflangTags, buildAlternateUrls } from "../hreflang";
import type { HreflangTag } from "../hreflang.types";

describe("hreflang tags", () => {
  const baseUrl = "https://mirrorbuddy.org";
  const locales = ["it", "en", "fr", "de", "es"];

  describe("buildAlternateUrls", () => {
    it("should build URL for default locale with locale prefix", () => {
      const urls = buildAlternateUrls(baseUrl, "/welcome", locales);
      expect(urls).toHaveProperty("it");
      expect(urls["it"]).toBe("https://mirrorbuddy.org/it/welcome");
    });

    it("should build URLs for all locales", () => {
      const urls = buildAlternateUrls(baseUrl, "/welcome", locales);
      expect(urls.it).toBe("https://mirrorbuddy.org/it/welcome");
      expect(urls.en).toBe("https://mirrorbuddy.org/en/welcome");
      expect(urls.fr).toBe("https://mirrorbuddy.org/fr/welcome");
      expect(urls.de).toBe("https://mirrorbuddy.org/de/welcome");
      expect(urls.es).toBe("https://mirrorbuddy.org/es/welcome");
    });

    it("should include x-default URL", () => {
      const urls = buildAlternateUrls(baseUrl, "/welcome", locales);
      expect(urls).toHaveProperty("x-default");
      expect(urls["x-default"]).toBe("https://mirrorbuddy.org/it/welcome");
    });

    it("should handle root path", () => {
      const urls = buildAlternateUrls(baseUrl, "/", locales);
      expect(urls.it).toBe("https://mirrorbuddy.org/it");
      expect(urls["x-default"]).toBe("https://mirrorbuddy.org/it");
    });

    it("should handle paths with query parameters", () => {
      const urls = buildAlternateUrls(baseUrl, "/search?q=test", locales);
      expect(urls.it).toBe("https://mirrorbuddy.org/it/search?q=test");
      expect(urls.en).toBe("https://mirrorbuddy.org/en/search?q=test");
    });

    it("should handle trailing slashes correctly", () => {
      const urls1 = buildAlternateUrls(baseUrl, "/welcome/", locales);
      const urls2 = buildAlternateUrls(baseUrl, "/welcome", locales);
      // Both should normalize to the same URL (no trailing slash)
      expect(urls1.it).toBe(urls2.it);
      expect(urls1.it).toBe("https://mirrorbuddy.org/it/welcome");
    });
  });

  describe("generateHreflangTags", () => {
    it("should generate link tags for all locales", () => {
      const tags = generateHreflangTags(baseUrl, "/welcome", locales);
      expect(tags).toHaveLength(6); // 5 locales + x-default
    });

    it("should include self-referencing hreflang", () => {
      const tags = generateHreflangTags(baseUrl, "/welcome", locales);
      const itTag = tags.find((tag) => tag.hreflang === "it");
      expect(itTag).toBeDefined();
      expect(itTag?.href).toBe("https://mirrorbuddy.org/it/welcome");
    });

    it("should include x-default tag", () => {
      const tags = generateHreflangTags(baseUrl, "/welcome", locales);
      const xDefault = tags.find((tag) => tag.hreflang === "x-default");
      expect(xDefault).toBeDefined();
      expect(xDefault?.href).toBe("https://mirrorbuddy.org/it/welcome");
    });

    it("should have correct tag structure", () => {
      const tags = generateHreflangTags(baseUrl, "/welcome", locales);
      tags.forEach((tag) => {
        expect(tag).toHaveProperty("rel", "alternate");
        expect(tag).toHaveProperty("hreflang");
        expect(tag).toHaveProperty("href");
        expect(tag.href).toMatch(/^https:\/\//);
      });
    });

    it("should return empty array if baseUrl is empty", () => {
      const tags = generateHreflangTags("", "/welcome", locales);
      expect(tags).toEqual([]);
    });

    it("should handle each page path separately", () => {
      const homePageTags = generateHreflangTags(baseUrl, "/", locales);
      const welcomePageTags = generateHreflangTags(
        baseUrl,
        "/welcome",
        locales,
      );

      const homeItTag = homePageTags.find((tag) => tag.hreflang === "it");
      const welcomeItTag = welcomePageTags.find((tag) => tag.hreflang === "it");

      expect(homeItTag?.href).not.toBe(welcomeItTag?.href);
      expect(homeItTag?.href).toBe("https://mirrorbuddy.org/it");
      expect(welcomeItTag?.href).toBe("https://mirrorbuddy.org/it/welcome");
    });

    it("should preserve locale names in hreflang attribute", () => {
      const tags = generateHreflangTags(baseUrl, "/home", locales);
      const hreflangs = tags.map((tag) => tag.hreflang).sort();
      expect(hreflangs).toEqual(["de", "en", "es", "fr", "it", "x-default"]);
    });
  });

  describe("HreflangMetadata type", () => {
    it("should validate HreflangTag structure", () => {
      const tag: HreflangTag = {
        rel: "alternate",
        hreflang: "it",
        href: "https://mirrorbuddy.org/it/welcome",
      };
      expect(tag.rel).toBe("alternate");
      expect(tag.hreflang).toBe("it");
      expect(tag.href).toMatch(/^https:\/\//);
    });

    it("should support x-default in hreflang", () => {
      const tag: HreflangTag = {
        rel: "alternate",
        hreflang: "x-default",
        href: "https://mirrorbuddy.org/it/welcome",
      };
      expect(tag.hreflang).toBe("x-default");
    });
  });
});

/**
 * Metadata Tests
 *
 * Tests for locale-specific page metadata (title, description, keywords)
 * F-75: Pages have localized metadata for search engines
 *
 * Tests verify that:
 * 1. Metadata namespace exists in all locale files
 * 2. Each locale has required metadata fields
 * 3. Title follows format: "{PageTitle} | MirrorBuddy"
 * 4. Description is 150-160 characters
 * 5. Keywords are defined
 */

import { describe, it, expect, beforeAll } from "vitest";
import fs from "fs";
import path from "path";

interface PageMetadata {
  title: string;
  description: string;
  keywords: string[];
}

interface LocaleMessages {
  [key: string]: unknown;
  metadata?: Record<string, PageMetadata>;
}

const LOCALES = ["it", "en", "fr", "de", "es"] as const;
type Locale = (typeof LOCALES)[number];

const REQUIRED_PAGES = [
  "home",
  "settings",
  "aiTransparency",
  "privacy",
  "terms",
] as const;

// Load all locale messages
const loadLocaleMessages = (locale: Locale): LocaleMessages => {
  const filePath = path.resolve(__dirname, `../../../messages/${locale}.json`);
  const content = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(content);
};

describe("Page Metadata (F-75)", () => {
  let messages: Record<Locale, LocaleMessages>;

  beforeAll(() => {
    messages = {} as Record<Locale, LocaleMessages>;
    LOCALES.forEach((locale) => {
      messages[locale] = loadLocaleMessages(locale);
    });
  });

  describe("Metadata Namespace Presence", () => {
    it("should have metadata namespace in all locales", () => {
      LOCALES.forEach((locale) => {
        expect(messages[locale]).toHaveProperty("metadata");
        expect(typeof messages[locale].metadata).toBe("object");
      });
    });

    it("should have metadata as a non-empty object", () => {
      LOCALES.forEach((locale) => {
        expect(
          Object.keys(messages[locale].metadata || {}).length,
        ).toBeGreaterThan(0);
      });
    });
  });

  describe("Required Pages Metadata", () => {
    REQUIRED_PAGES.forEach((page) => {
      describe(`${page} page`, () => {
        it(`should exist in metadata for all locales`, () => {
          LOCALES.forEach((locale) => {
            const metadata = messages[locale].metadata;
            expect(metadata).toHaveProperty(page);
          });
        });

        it(`should have required fields in all locales`, () => {
          LOCALES.forEach((locale) => {
            const pageMetadata = (messages[locale].metadata || {})[page];
            expect(pageMetadata).toHaveProperty("title");
            expect(pageMetadata).toHaveProperty("description");
            expect(pageMetadata).toHaveProperty("keywords");
          });
        });

        it(`should have non-empty fields in all locales`, () => {
          LOCALES.forEach((locale) => {
            const pageMetadata = (messages[locale].metadata || {})[page];
            expect(pageMetadata.title).toBeTruthy();
            expect(pageMetadata.title.length).toBeGreaterThan(0);
            expect(pageMetadata.description).toBeTruthy();
            expect(pageMetadata.description.length).toBeGreaterThan(0);
            expect(Array.isArray(pageMetadata.keywords)).toBe(true);
            expect(pageMetadata.keywords.length).toBeGreaterThan(0);
          });
        });
      });
    });
  });

  describe("Title Format", () => {
    REQUIRED_PAGES.forEach((page) => {
      it(`${page} title should follow format "{PageTitle} | MirrorBuddy"`, () => {
        LOCALES.forEach((locale) => {
          const title = (messages[locale].metadata || {})[page]?.title;
          expect(title).toMatch(/\| MirrorBuddy$/);
        });
      });

      it(`${page} title should not have trailing/leading spaces`, () => {
        LOCALES.forEach((locale) => {
          const title = (messages[locale].metadata || {})[page]?.title;
          expect(title).toBe(title?.trim());
        });
      });
    });
  });

  describe("Description Length", () => {
    REQUIRED_PAGES.forEach((page) => {
      it(`${page} description should be 150-160 characters`, () => {
        LOCALES.forEach((locale) => {
          const description = (messages[locale].metadata || {})[page]
            ?.description;
          const length = description?.length || 0;
          expect(length).toBeGreaterThanOrEqual(150);
          expect(length).toBeLessThanOrEqual(160);
        });
      });
    });
  });

  describe("Keywords", () => {
    REQUIRED_PAGES.forEach((page) => {
      it(`${page} keywords should be an array of strings`, () => {
        LOCALES.forEach((locale) => {
          const keywords = (messages[locale].metadata || {})[page]?.keywords;
          expect(Array.isArray(keywords)).toBe(true);
          keywords?.forEach((keyword) => {
            expect(typeof keyword).toBe("string");
            expect(keyword.length).toBeGreaterThan(0);
          });
        });
      });

      it(`${page} should have at least 3 keywords`, () => {
        LOCALES.forEach((locale) => {
          const keywords = (messages[locale].metadata || {})[page]?.keywords;
          expect(keywords?.length).toBeGreaterThanOrEqual(3);
        });
      });
    });
  });

  describe("Language-Specific Translations", () => {
    it("should have different titles for different locales", () => {
      const firstPageTitles = REQUIRED_PAGES.map((page) => ({
        page,
        titles: LOCALES.map(
          (locale) => (messages[locale].metadata || {})[page]?.title,
        ),
      }));

      firstPageTitles.forEach(({ _page, titles }) => {
        // Check that not all titles are the same (at least some variation)
        const uniqueTitles = new Set(titles);
        expect(uniqueTitles.size).toBeGreaterThan(1);
      });
    });

    it("should have different descriptions for different locales", () => {
      const firstPageDescriptions = REQUIRED_PAGES.map((page) => ({
        page,
        descriptions: LOCALES.map(
          (locale) => (messages[locale].metadata || {})[page]?.description,
        ),
      }));

      firstPageDescriptions.forEach(({ _page, descriptions }) => {
        const uniqueDescriptions = new Set(descriptions);
        expect(uniqueDescriptions.size).toBeGreaterThan(1);
      });
    });
  });

  describe("Metadata Consistency", () => {
    it("should have same pages across all locales", () => {
      const italianPages = Object.keys(messages.it.metadata || {}).sort();
      LOCALES.forEach((locale) => {
        const localePages = Object.keys(messages[locale].metadata || {}).sort();
        expect(localePages).toEqual(italianPages);
      });
    });
  });
});

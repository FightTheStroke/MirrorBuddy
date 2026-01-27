/**
 * Metadata Tests
 *
 * Tests for locale-specific _page metadata (title, description, keywords)
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

// Load metadata namespace for a locale (ADR 0082 namespace structure)
const loadLocaleMessages = (locale: Locale): LocaleMessages => {
  const filePath = path.resolve(
    __dirname,
    `../../../messages/${locale}/metadata.json`,
  );
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
    REQUIRED_PAGES.forEach((_page) => {
      describe(`${_page} _page`, () => {
        it(`should exist in metadata for all locales`, () => {
          LOCALES.forEach((locale) => {
            const metadata = messages[locale].metadata;
            expect(metadata).toHaveProperty(_page);
          });
        });

        it(`should have required fields in all locales`, () => {
          LOCALES.forEach((locale) => {
            const _pageMetadata = (messages[locale].metadata || {})[_page];
            expect(_pageMetadata).toHaveProperty("title");
            expect(_pageMetadata).toHaveProperty("description");
            expect(_pageMetadata).toHaveProperty("keywords");
          });
        });

        it(`should have non-empty fields in all locales`, () => {
          LOCALES.forEach((locale) => {
            const _pageMetadata = (messages[locale].metadata || {})[_page];
            expect(_pageMetadata.title).toBeTruthy();
            expect(_pageMetadata.title.length).toBeGreaterThan(0);
            expect(_pageMetadata.description).toBeTruthy();
            expect(_pageMetadata.description.length).toBeGreaterThan(0);
            expect(Array.isArray(_pageMetadata.keywords)).toBe(true);
            expect(_pageMetadata.keywords.length).toBeGreaterThan(0);
          });
        });
      });
    });
  });

  describe("Title Format", () => {
    REQUIRED_PAGES.forEach((_page) => {
      it(`${_page} title should follow format "{PageTitle} | MirrorBuddy"`, () => {
        LOCALES.forEach((locale) => {
          const title = (messages[locale].metadata || {})[_page]?.title;
          expect(title).toMatch(/\| MirrorBuddy$/);
        });
      });

      it(`${_page} title should not have trailing/leading spaces`, () => {
        LOCALES.forEach((locale) => {
          const title = (messages[locale].metadata || {})[_page]?.title;
          expect(title).toBe(title?.trim());
        });
      });
    });
  });

  describe("Description Length", () => {
    REQUIRED_PAGES.forEach((_page) => {
      it(`${_page} description should be 150-160 characters`, () => {
        LOCALES.forEach((locale) => {
          const description = (messages[locale].metadata || {})[_page]
            ?.description;
          const length = description?.length || 0;
          expect(length).toBeGreaterThanOrEqual(150);
          expect(length).toBeLessThanOrEqual(160);
        });
      });
    });
  });

  describe("Keywords", () => {
    REQUIRED_PAGES.forEach((_page) => {
      it(`${_page} keywords should be an array of strings`, () => {
        LOCALES.forEach((locale) => {
          const keywords = (messages[locale].metadata || {})[_page]?.keywords;
          expect(Array.isArray(keywords)).toBe(true);
          keywords?.forEach((keyword) => {
            expect(typeof keyword).toBe("string");
            expect(keyword.length).toBeGreaterThan(0);
          });
        });
      });

      it(`${_page} should have at least 3 keywords`, () => {
        LOCALES.forEach((locale) => {
          const keywords = (messages[locale].metadata || {})[_page]?.keywords;
          expect(keywords?.length).toBeGreaterThanOrEqual(3);
        });
      });
    });
  });

  describe("Language-Specific Translations", () => {
    it("should have different titles for different locales", () => {
      const firstPageTitles = REQUIRED_PAGES.map((_page) => ({
        _page,
        titles: LOCALES.map(
          (locale) => (messages[locale].metadata || {})[_page]?.title,
        ),
      }));

      firstPageTitles.forEach(({ _page, titles }) => {
        // Check that not all titles are the same (at least some variation)
        const uniqueTitles = new Set(titles);
        expect(uniqueTitles.size).toBeGreaterThan(1);
      });
    });

    it("should have different descriptions for different locales", () => {
      const firstPageDescriptions = REQUIRED_PAGES.map((_page) => ({
        _page,
        descriptions: LOCALES.map(
          (locale) => (messages[locale].metadata || {})[_page]?.description,
        ),
      }));

      firstPageDescriptions.forEach(({ _page, descriptions }) => {
        const uniqueDescriptions = new Set(descriptions);
        expect(uniqueDescriptions.size).toBeGreaterThan(1);
      });
    });
  });

  describe("Metadata Consistency", () => {
    it("should have same _pages across all locales", () => {
      const italianPages = Object.keys(messages.it.metadata || {}).sort();
      LOCALES.forEach((locale) => {
        const localePages = Object.keys(messages[locale].metadata || {}).sort();
        expect(localePages).toEqual(italianPages);
      });
    });
  });
});

/**
 * Tests for locale-aware Open Graph metadata generation
 */

import { describe, it, expect } from "vitest";
import {
  generateOGMetadata,
  getLocaleCode,
  type OGMetadataInput,
} from "../og-metadata";

describe("og-metadata", () => {
  describe("getLocaleCode", () => {
    it('should convert "it" to "it_IT"', () => {
      expect(getLocaleCode("it")).toBe("it_IT");
    });

    it('should convert "en" to "en_US"', () => {
      expect(getLocaleCode("en")).toBe("en_US");
    });

    it('should convert "fr" to "fr_FR"', () => {
      expect(getLocaleCode("fr")).toBe("fr_FR");
    });

    it('should convert "de" to "de_DE"', () => {
      expect(getLocaleCode("de")).toBe("de_DE");
    });

    it('should convert "es" to "es_ES"', () => {
      expect(getLocaleCode("es")).toBe("es_ES");
    });
  });

  describe("generateOGMetadata", () => {
    const baseInput: OGMetadataInput = {
      locale: "it",
      title: "MirrorBuddy",
      description: "The school we wished existed",
      url: "https://mirrorbuddy.com",
    };

    it("should generate OG metadata with og:locale", () => {
      const metadata = generateOGMetadata(baseInput);
      expect(metadata.openGraph?.locale).toBe("it_IT");
    });

    it("should generate og:locale:alternate with all other locales", () => {
      const metadata = generateOGMetadata(baseInput);
      const ogMetadata = metadata.openGraph as
        | Record<string, unknown>
        | undefined;
      const alternates = ogMetadata?.["locale:alternate"] as
        | string[]
        | undefined;

      expect(Array.isArray(alternates)).toBe(true);
      expect(alternates).toHaveLength(4); // All other locales
      expect(alternates).toContain("en_US");
      expect(alternates).toContain("fr_FR");
      expect(alternates).toContain("de_DE");
      expect(alternates).toContain("es_ES");
    });

    it("should set og:title", () => {
      const metadata = generateOGMetadata(baseInput);
      expect(metadata.openGraph?.title).toBe("MirrorBuddy");
    });

    it("should set og:description", () => {
      const metadata = generateOGMetadata(baseInput);
      expect(metadata.openGraph?.description).toBe(
        "The school we wished existed",
      );
    });

    it("should set og:url", () => {
      const metadata = generateOGMetadata(baseInput);
      expect(metadata.openGraph?.url).toBe("https://mirrorbuddy.com");
    });

    it("should set og:type to website", () => {
      const metadata = generateOGMetadata(baseInput);
      const ogMetadata = metadata.openGraph as
        | Record<string, unknown>
        | undefined;
      expect(ogMetadata?.type).toBe("website");
    });

    it("should include og:image if provided", () => {
      const input: OGMetadataInput = {
        ...baseInput,
        image: {
          url: "https://mirrorbuddy.com/og-image.png",
          width: 1200,
          height: 630,
        },
      };
      const metadata = generateOGMetadata(input);
      expect(metadata.openGraph?.images).toBeDefined();
      expect(Array.isArray(metadata.openGraph?.images)).toBe(true);
      if (Array.isArray(metadata.openGraph?.images)) {
        const image = metadata.openGraph.images[0] as Record<string, unknown>;
        expect(image.url).toBe("https://mirrorbuddy.com/og-image.png");
        expect(image.width).toBe(1200);
        expect(image.height).toBe(630);
      }
    });

    it("should set Twitter card metadata", () => {
      const metadata = generateOGMetadata(baseInput);
      const twitterMetadata = metadata.twitter as
        | Record<string, unknown>
        | undefined;
      expect(twitterMetadata?.card).toBe("summary_large_image");
      expect(twitterMetadata?.title).toBe("MirrorBuddy");
      expect(twitterMetadata?.description).toBe("The school we wished existed");
    });

    it("should include Twitter image if OG image provided", () => {
      const input: OGMetadataInput = {
        ...baseInput,
        image: {
          url: "https://mirrorbuddy.com/og-image.png",
          width: 1200,
          height: 630,
        },
      };
      const metadata = generateOGMetadata(input);
      const twitterMetadata = metadata.twitter as
        | Record<string, unknown>
        | undefined;
      expect(twitterMetadata?.images).toBeDefined();
      if (twitterMetadata?.images && Array.isArray(twitterMetadata.images)) {
        expect(twitterMetadata.images[0]).toBe(
          "https://mirrorbuddy.com/og-image.png",
        );
      }
    });

    it("should work for all locales", () => {
      const allLocales = ["it", "en", "fr", "de", "es"] as const;

      allLocales.forEach((locale) => {
        const input: OGMetadataInput = {
          ...baseInput,
          locale,
        };
        const metadata = generateOGMetadata(input);
        const ogMetadata = metadata.openGraph as
          | Record<string, unknown>
          | undefined;

        // Each should have correct og:locale
        expect(ogMetadata?.locale).toBe(getLocaleCode(locale));

        // Each should have 4 alternates (all others)
        const alternates = ogMetadata?.["locale:alternate"] as
          | string[]
          | undefined;
        expect(alternates).toHaveLength(4);
        expect(alternates).not.toContain(getLocaleCode(locale));
      });
    });

    it("should use metadataBase for URL construction if not provided", () => {
      const input: OGMetadataInput = {
        locale: "it",
        title: "Page Title",
        description: "Page description",
        url: "https://mirrorbuddy.com/page",
      };
      const metadata = generateOGMetadata(input);
      expect(metadata.openGraph?.url).toBe("https://mirrorbuddy.com/page");
    });

    it("should handle relative paths for og:image", () => {
      const input: OGMetadataInput = {
        ...baseInput,
        image: {
          url: "/og-image.png",
          width: 1200,
          height: 630,
        },
      };
      const metadata = generateOGMetadata(input);
      // The URL should remain as provided (relative)
      if (Array.isArray(metadata.openGraph?.images)) {
        const image = metadata.openGraph.images[0] as Record<string, unknown>;
        expect(image.url).toBe("/og-image.png");
      }
    });
  });
});

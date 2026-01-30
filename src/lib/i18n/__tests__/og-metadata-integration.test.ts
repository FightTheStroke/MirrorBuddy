/**
 * Integration tests for OG metadata with layout usage
 */

import { describe, it, expect } from "vitest";
import { getLocalizedOGMetadata } from "../get-og-metadata";
import type { Locale } from "@/i18n/config";

describe("og-metadata-integration", () => {
  describe("getLocalizedOGMetadata", () => {
    it("should generate metadata for homepage (it locale)", async () => {
      const metadata = await getLocalizedOGMetadata("it", {
        image: {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: "MirrorBuddy - Platform",
        },
      });

      expect(metadata.openGraph).toBeDefined();
      expect(metadata.twitter).toBeDefined();

      const ogMetadata = metadata.openGraph as Record<string, unknown>;
      expect(ogMetadata.locale).toBe("it_IT");
      expect(ogMetadata.title).toContain("MirrorBuddy");
      expect(ogMetadata.description).toContain("IA");
      expect(ogMetadata.url).toContain("/it");
    });

    it("should generate metadata for all locales", async () => {
      const locales: Locale[] = ["it", "en", "fr", "de", "es"];

      for (const locale of locales) {
        const metadata = await getLocalizedOGMetadata(locale);

        const ogMetadata = metadata.openGraph as Record<string, unknown>;
        expect(ogMetadata.locale).toBeDefined();
        expect(ogMetadata.title).toBeDefined();
        expect(ogMetadata.description).toBeDefined();
        expect(ogMetadata.url).toContain(`/${locale}`);

        // Should have 4 alternates
        const alternates = ogMetadata["alternateLocale"] as string[];
        expect(alternates).toHaveLength(4);
      }
    });

    it("should support custom page titles and descriptions", async () => {
      const metadata = await getLocalizedOGMetadata("en", {
        title: "Custom Page Title",
        description: "Custom page description",
        pathname: "/custom-page",
      });

      const ogMetadata = metadata.openGraph as Record<string, unknown>;
      expect(ogMetadata.title).toBe("Custom Page Title");
      expect(ogMetadata.description).toBe("Custom page description");
      expect(ogMetadata.url).toContain("/en/custom-page");
    });

    it("should include Twitter card metadata", async () => {
      const metadata = await getLocalizedOGMetadata("fr", {
        image: {
          url: "/og-image.png",
          width: 1200,
          height: 630,
        },
      });

      const twitterMetadata = metadata.twitter as Record<string, unknown>;
      expect(twitterMetadata.card).toBe("summary_large_image");
      expect(twitterMetadata.title).toBeDefined();
      expect(twitterMetadata.description).toBeDefined();
      expect(twitterMetadata.images).toBeDefined();
    });

    it("should construct full URLs with site domain", async () => {
      const metadata = await getLocalizedOGMetadata("de", {
        pathname: "/about",
      });

      const ogMetadata = metadata.openGraph as Record<string, unknown>;
      const url = ogMetadata.url as string;

      // Should be absolute URL
      expect(url).toMatch(/^https?:\/\//);
      expect(url).toContain("/de/about");
    });
  });
});

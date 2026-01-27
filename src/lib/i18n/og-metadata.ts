/**
 * Locale-aware Open Graph and Twitter Card metadata generation
 * Follows F-78 requirements for social media sharing
 */

import type { Metadata } from "next";
import { locales, type Locale } from "@/i18n/config";

/**
 * Maps locale codes to OG locale format
 * it → it_IT, en → en_US, etc.
 */
export const LOCALE_CODE_MAP: Record<Locale, string> = {
  it: "it_IT",
  en: "en_US",
  fr: "fr_FR",
  de: "de_DE",
  es: "es_ES",
};

/**
 * Convert locale code to OG format
 */
export function getLocaleCode(locale: Locale): string {
  return LOCALE_CODE_MAP[locale];
}

/**
 * Get all alternate locale codes except the current one
 */
function getAlternateLocales(currentLocale: Locale): string[] {
  return locales
    .filter((locale) => locale !== currentLocale)
    .map((locale) => getLocaleCode(locale));
}

/**
 * Input for OG metadata generation
 */
export interface OGMetadataInput {
  locale: Locale;
  title: string;
  description: string;
  url: string;
  image?: {
    url: string;
    width: number;
    height: number;
    alt?: string;
  };
}

/**
 * Generate locale-aware Open Graph and Twitter Card metadata
 * Implements F-78 requirements:
 * - og:locale with proper format (it_IT, en_US, etc.)
 * - og:locale:alternate for other languages
 * - og:title, og:description, og:image, og:url (localized)
 * - Twitter card metadata with proper formatting
 */
export function generateOGMetadata(input: OGMetadataInput): Metadata {
  const ogLocale = getLocaleCode(input.locale);
  const alternateLocales = getAlternateLocales(input.locale);

  // Build OG image
  const ogImages = input.image
    ? [
        {
          url: input.image.url,
          width: input.image.width,
          height: input.image.height,
          alt: input.image.alt,
        },
      ]
    : undefined;

  // Build Twitter images (just URL array)
  const twitterImages = input.image ? [input.image.url] : undefined;

  // Use type assertion to include locale:alternate which Next.js doesn't expose in types
  // but is valid Open Graph metadata
  const metadata: Metadata & {
    openGraph?: Record<string, unknown>;
    twitter?: Record<string, unknown>;
  } = {
    openGraph: {
      type: "website",
      locale: ogLocale,
      "locale:alternate": alternateLocales,
      title: input.title,
      description: input.description,
      url: input.url,
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: twitterImages,
    },
  };

  return metadata as Metadata;
}

/**
 * Helper to merge OG metadata with existing metadata
 * Useful for combining with other metadata properties
 */
export function mergeOGMetadata(
  existing: Metadata,
  ogInput: OGMetadataInput,
): Metadata {
  const ogMetadata = generateOGMetadata(ogInput);
  return {
    ...existing,
    openGraph: {
      ...existing.openGraph,
      ...ogMetadata.openGraph,
    },
    twitter: {
      ...existing.twitter,
      ...ogMetadata.twitter,
    },
  };
}

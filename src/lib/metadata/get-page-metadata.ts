/**
 * Metadata Retrieval Utility
 *
 * Provides typed access to localized page metadata from i18n message files.
 * F-75: Pages have localized metadata for search engines
 */

import type { Locale } from "@/i18n";
import { logger } from "@/lib/logger";

interface PageMetadata {
  title: string;
  description: string;
  keywords: string[];
}

// Type for pages that have metadata
export type PageMetadataKey =
  | "home"
  | "settings"
  | "aiTransparency"
  | "privacy"
  | "terms";

/**
 * Dynamically load messages for a given locale and extract page metadata
 *
 * @param locale - The locale code (e.g., 'en', 'it', 'fr', 'de', 'es')
 * @param pageKey - The page key to retrieve metadata for
 * @returns PageMetadata with title, description, and keywords
 *
 * @example
 * const metadata = await getPageMetadata('en', 'home');
 * console.log(metadata.title); // "Home | MirrorBuddy"
 */
export async function getPageMetadata(
  locale: Locale,
  pageKey: PageMetadataKey,
): Promise<PageMetadata> {
  try {
    // Dynamically import the locale message file
    const messages = (await import(`../../../messages/${locale}.json`)).default;

    // Extract metadata for the page
    const pageMetadata = messages?.metadata?.[pageKey];

    if (!pageMetadata) {
      // Fallback to default metadata if page-specific metadata not found
      return getDefaultMetadata(pageKey);
    }

    return pageMetadata;
  } catch (error) {
    // Fallback to default metadata on any error
    logger.warn(
      `Failed to load metadata for locale ${locale}, page ${pageKey}`,
      {
        locale,
        pageKey,
        error: String(error),
      },
    );
    return getDefaultMetadata(pageKey);
  }
}

/**
 * Fallback default metadata when specific page metadata is unavailable
 *
 * @param pageKey - The page key
 * @returns Default PageMetadata
 */
function getDefaultMetadata(pageKey: PageMetadataKey): PageMetadata {
  const defaults: Record<PageMetadataKey, PageMetadata> = {
    home: {
      title: "Home | MirrorBuddy",
      description:
        "AI-powered learning platform for students with learning differences.",
      keywords: ["education", "AI", "tutoring", "learning"],
    },
    settings: {
      title: "Settings | MirrorBuddy",
      description: "Customize your learning experience with MirrorBuddy.",
      keywords: ["settings", "preferences", "customization"],
    },
    aiTransparency: {
      title: "AI Transparency | MirrorBuddy",
      description: "Learn about MirrorBuddy's AI practices and transparency.",
      keywords: ["AI", "transparency", "safety"],
    },
    privacy: {
      title: "Privacy Policy | MirrorBuddy",
      description: "MirrorBuddy privacy policy and data protection.",
      keywords: ["privacy", "GDPR", "data protection"],
    },
    terms: {
      title: "Terms of Service | MirrorBuddy",
      description: "MirrorBuddy terms of service and user agreements.",
      keywords: ["terms", "service", "legal"],
    },
  };

  return defaults[pageKey];
}

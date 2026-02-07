/**
 * Generate hreflang tags for multi-locale SEO
 * https://developers.google.com/search/docs/specialty/international/localized-versions
 */

import type { HreflangTag, AlternateUrl } from "./hreflang.types";

/**
 * Build alternate URLs for all locales
 * @param baseUrl The base URL (e.g., https://your-domain.com)
 * @param pathname The page path (e.g., /welcome)
 * @param locales Array of supported locales
 * @returns Object mapping locale codes to full URLs
 */
export function buildAlternateUrls(
  baseUrl: string,
  pathname: string,
  locales: readonly string[],
): AlternateUrl {
  if (!baseUrl) {
    return {} as AlternateUrl;
  }

  // Remove trailing slash from baseUrl if present
  const cleanBaseUrl = baseUrl.replace(/\/$/, "");

  // Normalize pathname: ensure it starts with /
  let cleanPathname = pathname.startsWith("/") ? pathname : `/${pathname}`;

  // Remove trailing slash from pathname unless it's just '/'
  if (cleanPathname !== "/" && cleanPathname.endsWith("/")) {
    cleanPathname = cleanPathname.slice(0, -1);
  }

  const urls: Record<string, string> = {};

  // Build URL for each locale
  locales.forEach((locale) => {
    const path = cleanPathname === "/" ? "" : cleanPathname;
    const url = `${cleanBaseUrl}/${locale}${path}`;
    urls[locale] = url;
  });

  // Add x-default (typically points to default locale)
  const defaultLocale = locales[0];
  urls["x-default"] = urls[defaultLocale];

  return urls as AlternateUrl;
}

/**
 * Generate hreflang link tags for a page
 * @param baseUrl The base URL (e.g., https://your-domain.com)
 * @param pathname The page path (e.g., /welcome)
 * @param locales Array of supported locales
 * @returns Array of HreflangTag objects suitable for next/head metadata
 */
export function generateHreflangTags(
  baseUrl: string,
  pathname: string,
  locales: readonly string[],
): HreflangTag[] {
  if (!baseUrl) {
    return [];
  }

  const alternateUrls = buildAlternateUrls(baseUrl, pathname, locales);
  const tags: HreflangTag[] = [];

  // Create tags for all locales (including x-default)
  Object.entries(alternateUrls).forEach(([locale, url]) => {
    tags.push({
      rel: "alternate",
      hreflang: locale,
      href: url,
    });
  });

  return tags;
}

/**
 * Get hreflang metadata for Next.js metadata API
 * @param baseUrl The base URL
 * @param pathname The current page path
 * @param locales Array of supported locales
 * @returns Metadata alternates object for Next.js
 */
export function getHreflangMetadata(
  baseUrl: string,
  pathname: string,
  locales: readonly string[],
) {
  if (!baseUrl) {
    return {};
  }

  const alternateUrls = buildAlternateUrls(baseUrl, pathname, locales);

  return {
    languages: alternateUrls,
  };
}

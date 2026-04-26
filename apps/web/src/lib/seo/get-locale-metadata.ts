/**
 * Server-side utility for generating locale metadata in layouts
 * This can be used in page.tsx or layout.tsx files to add hreflang tags
 */

import { headers } from 'next/headers';
import { generateHreflangTags } from './hreflang';
import type { Metadata } from 'next';
import type { Locale } from './hreflang.types';

const SUPPORTED_LOCALES: readonly Locale[] = ['it', 'en', 'fr', 'de', 'es'];

/**
 * Get the current page pathname from headers
 * Works in both app router and layouts
 */
export async function getCurrentPathname(): Promise<string> {
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '/';
  return pathname;
}

/**
 * Get hreflang metadata for a page
 * Usage in layout.tsx or page.tsx:
 *
 * export async function generateMetadata({
 *   params,
 * }: {
 *   params: Promise<{ locale: string }>;
 * }): Promise<Metadata> {
 *   return getLocaleMetadata(pathname, params);
 * }
 */
export function getLocaleMetadata(
  pathname: string,
  locales: readonly Locale[] = SUPPORTED_LOCALES,
): Pick<Metadata, 'alternates'> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const hreflangTags = generateHreflangTags(baseUrl, pathname, locales);

  // Convert hreflang tags to metadata format
  return {
    alternates: {
      languages: Object.fromEntries(
        hreflangTags
          .filter((tag) => tag.hreflang !== 'x-default')
          .map((tag) => [tag.hreflang, tag.href]),
      ),
      // Set canonical as x-default variant
      canonical: hreflangTags.find((tag) => tag.hreflang === 'x-default')?.href,
    },
  };
}

/**
 * Extract page pathname from URL
 * Removes the locale prefix if present
 */
export function extractPathnameWithoutLocale(pathname: string, locale: string): string {
  // Remove locale prefix from pathname
  const prefix = `/${locale}`;
  if (pathname.startsWith(prefix)) {
    const withoutLocale = pathname.slice(prefix.length);
    return withoutLocale || '/';
  }
  return pathname || '/';
}

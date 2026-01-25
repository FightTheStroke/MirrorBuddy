/**
 * Metadata generation helpers for localized pages
 * Provides utility functions to generate Next.js metadata with canonical URLs
 */

import type { Metadata } from 'next';
import type { Locale } from '@/i18n/config';
import { generateCanonicalUrl } from './canonical-urls';

/**
 * Merge canonical URL into existing metadata
 * Ensures canonical links are properly included for SEO
 *
 * @param baseMetadata - Existing metadata object
 * @param locale - The page locale
 * @param pathname - The page path
 * @returns Metadata with canonical URL merged in
 */
export function mergeCanonicalMetadata(
  baseMetadata: Metadata | undefined,
  locale: Locale,
  pathname: string,
): Metadata {
  const canonicalUrl = generateCanonicalUrl(locale, pathname);

  return {
    ...baseMetadata,
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

/**
 * Create metadata for a localized page with canonical URL
 * This is the main helper for page.tsx and layout.tsx files
 *
 * @param locale - The page locale
 * @param pathname - The page path
 * @param overrides - Additional metadata to merge
 * @returns Complete metadata object
 *
 * @example
 * // In src/app/[locale]/maestri/page.tsx
 * export async function generateMetadata({
 *   params,
 * }: {
 *   params: Promise<{ locale: string }>;
 * }): Promise<Metadata> {
 *   const { locale } = await params;
 *   return createLocalizedMetadata(locale, '/maestri', {
 *     title: 'Maestri',
 *     description: 'Meet all the Maestri...',
 *   });
 * }
 */
export function createLocalizedMetadata(
  locale: Locale,
  pathname: string,
  overrides?: Record<string, unknown>,
): Metadata {
  const canonicalUrl = generateCanonicalUrl(locale, pathname);

  return {
    ...overrides,
    alternates: {
      canonical: canonicalUrl,
    },
  } as Metadata;
}

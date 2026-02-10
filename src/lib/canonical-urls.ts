/**
 * Canonical URL generation for localized pages
 * Helps prevent duplicate content issues in SEO by ensuring each localized
 * page points to its own canonical URL (not a default or cross-locale variant)
 *
 * Reference: https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
 */

import type { Locale } from '@/i18n/config';

/**
 * Generate a canonical URL for a given locale and path
 * Each locale version is its own canonical (no cross-locale canonicals)
 *
 * @param locale - The locale code (e.g., 'it', 'en', 'es')
 * @param pathname - The page path (e.g., '/maestri', '/flashcards/123')
 * @returns Absolute canonical URL with domain
 *
 * @example
 * generateCanonicalUrl('it', '/maestri')
 * // => 'https://your-domain.com/it/maestri'
 *
 * generateCanonicalUrl('en', '/search?q=test')
 * // => 'https://your-domain.com/en/search?q=test'
 */
export function generateCanonicalUrl(locale: Locale, pathname: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mirrorbuddy.org';

  // Remove hash fragments (SEO compliance - fragments should not be in canonical)
  const pathWithoutHash = pathname.split('#')[0];

  // Construct the canonical URL with locale prefix
  // The URL() constructor will handle path joining and encoding
  const url = new URL(`${baseUrl}${baseUrl.endsWith('/') ? '' : '/'}${locale}${pathWithoutHash}`);

  let result = url.toString();

  // Remove trailing slash for root locale paths (e.g., /it, not /it/)
  if (pathWithoutHash === '/' && result.endsWith('/')) {
    result = result.slice(0, -1);
  }

  return result;
}

/**
 * Get metadata object with canonical link for use in generateMetadata
 *
 * @param locale - The locale code
 * @param pathname - The page path
 * @returns Metadata object with canonical URL
 *
 * @example
 * export const generateMetadata = async ({ params }) => {
 *   const { locale } = await params;
 *   return {
 *     ...getCanonicalMetadata(locale, '/maestri'),
 *     title: 'Maestri',
 *   };
 * };
 */
export function getCanonicalMetadata(locale: Locale, pathname: string): { canonical: string } {
  return {
    canonical: generateCanonicalUrl(locale, pathname),
  };
}

/**
 * Create a Next.js metadata generator function for localized pages
 * Returns a function that generates metadata with canonical URLs
 *
 * @param defaultMetadata - Base metadata to extend
 * @returns Function to use as generateMetadata in Next.js pages
 *
 * @example
 * const generateMetadata = createLocalizedMetadataGenerator({
 *   title: 'Page Title',
 *   description: 'Page description',
 * });
 *
 * export const metadata = generateMetadata('it', '/path');
 */
export function createLocalizedMetadataGenerator(defaultMetadata: Record<string, unknown>) {
  return (locale: Locale, pathname: string) => {
    return {
      ...defaultMetadata,
      ...getCanonicalMetadata(locale, pathname),
    };
  };
}

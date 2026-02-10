/**
 * HreflangTags component for adding hreflang links to page head
 * Can be used in server-side page components to automatically generate hreflang tags
 */

import { generateHreflangTags } from '@/lib/seo/hreflang';
import type { Locale } from '@/lib/seo/hreflang.types';

interface HreflangTagsProps {
  pathname: string;
  locales?: readonly Locale[];
  baseUrl?: string;
}

/**
 * Server component that renders hreflang link tags
 * Place this in your page head or in a server layout
 *
 * @example
 * export default function MyPage() {
 *   return (
 *     <>
 *       <HreflangTags pathname="/welcome" />
 *       Page content here
 *     </>
 *   );
 * }
 */
export function HreflangTags({
  pathname,
  locales = ['it', 'en', 'fr', 'de', 'es'] as const,
  baseUrl,
}: HreflangTagsProps) {
  const resolvedBaseUrl = baseUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mirrorbuddy.org';
  const tags = generateHreflangTags(resolvedBaseUrl, pathname, locales);

  return (
    <>
      {tags.map((tag) => (
        <link
          key={`hreflang-${tag.hreflang}`}
          rel="alternate"
          hrefLang={tag.hreflang}
          href={tag.href}
        />
      ))}
    </>
  );
}

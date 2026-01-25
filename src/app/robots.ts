import type { MetadataRoute } from 'next';

/**
 * Robots.txt configuration for multilingual SEO
 *
 * This file configures search engine crawler behavior:
 * - Allows crawling of all localized public pages (it, en, es, fr, de)
 * - Blocks crawling of /api/ and /admin/ routes
 * - References the sitemap for comprehensive URL discovery
 * - Sets appropriate crawl delay to avoid server overload
 *
 * Reference: https://nextjs.org/docs/app/api-reference/file-conventions/robots
 */

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://mirrorbuddy.app';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/it/',
          '/en/',
          '/es/',
          '/fr/',
          '/de/',
          '/home',
          '/privacy',
          '/terms',
          '/ai-transparency',
          '/ai-policy',
        ],
        disallow: [
          '/api/',
          '/admin/',
          '/login',
          '/change-password',
          '/astuccio/',
          '/archivio/',
          '/search',
          '/_next',
        ],
        crawlDelay: 1,
      },
      {
        userAgent: 'GPTBot',
        disallow: '/',
      },
      {
        userAgent: 'ChatGPT-User',
        disallow: '/',
      },
      {
        userAgent: 'CCBot',
        disallow: '/',
      },
      {
        userAgent: 'anthropic-ai',
        disallow: '/',
      },
      {
        userAgent: 'Claude-Web',
        disallow: '/',
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

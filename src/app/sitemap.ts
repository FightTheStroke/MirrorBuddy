/* eslint-disable */
// @ts-nocheck
const LOCALES = ['it', 'en', 'fr', 'de', 'es'];
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://mirrorbuddy.app';
const LASTMOD = new Date().toISOString();

export default function sitemap() {
  const entries = [];

  // Root paths for each locale
  const localeRoutes = [
    { path: '/', changeFrequency: 'monthly' },
    { path: '/home', changeFrequency: 'weekly' },
    { path: '/settings', changeFrequency: 'monthly' },
    { path: '/ai-transparency', changeFrequency: 'monthly' },
    { path: '/privacy', changeFrequency: 'monthly' },
    { path: '/terms', changeFrequency: 'monthly' },
  ];

  // Generate entries for each locale
  for (const locale of LOCALES) {
    for (const route of localeRoutes) {
      entries.push({
        url: `${BASE_URL}/${locale}${route.path}`,
        lastModified: LASTMOD,
        changeFrequency: route.changeFrequency,
        priority: route.path === '/' ? 1.0 : 0.8,
      });
    }
  }

  // Add default locale (no prefix) entries
  for (const route of localeRoutes) {
    entries.push({
      url: `${BASE_URL}${route.path}`,
      lastModified: LASTMOD,
      changeFrequency: route.changeFrequency,
      priority: route.path === '/' ? 1.0 : 0.8,
    });
  }

  return entries;
}

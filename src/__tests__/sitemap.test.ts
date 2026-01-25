import { describe, it, expect } from 'vitest';

// Test the sitemap generation function
// F-77: Sitemap includes all pages in all locales with hreflang alternates

describe('Sitemap Generation (F-77)', () => {
  const LOCALES = ['it', 'en', 'fr', 'de', 'es'];
  const PUBLIC_PAGES = ['/', '/home', '/settings', '/ai-transparency', '/privacy', '/terms'];
  const BASE_URL = 'https://mirrorbuddy.app';

  it('should generate sitemap entries for all public pages', async () => {
    // Dynamic import to avoid issues with Next.js config
    const sitemapModule = await import('../app/sitemap');
    const sitemap = sitemapModule.default();

    // Should have entries for all locales + default
    // (5 locales * 6 pages) + (1 default * 6 pages) = 36 entries
    expect(sitemap).toHaveLength(36);
  });

  it('should include all 5 locales in sitemap URLs', async () => {
    const sitemapModule = await import('../app/sitemap');
    const sitemap = sitemapModule.default();

    const urls = sitemap.map((entry) => entry.url);

    // Check that all locales are present
    for (const locale of LOCALES) {
      const localeUrls = urls.filter((url) => url.includes(`/${locale}/`));
      expect(localeUrls.length).toBeGreaterThan(0);
    }
  });

  it('should include all public pages for each locale', async () => {
    const sitemapModule = await import('../app/sitemap');
    const sitemap = sitemapModule.default();

    const urls = sitemap.map((entry) => entry.url);

    for (const locale of LOCALES) {
      for (const page of PUBLIC_PAGES) {
        const url = `${BASE_URL}/${locale}${page}`;
        expect(urls).toContain(url);
      }
    }
  });

  it('should have proper metadata for each entry', async () => {
    const sitemapModule = await import('../app/sitemap');
    const sitemap = sitemapModule.default();

    for (const entry of sitemap) {
      // Each entry must have required fields
      expect(entry).toHaveProperty('url');
      expect(entry).toHaveProperty('lastModified');
      expect(entry).toHaveProperty('changeFrequency');
      expect(entry).toHaveProperty('priority');

      // Validate values
      expect(typeof entry.url).toBe('string');
      expect(entry.url).toMatch(/^https:\/\//);

      expect(['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never']).toContain(
        entry.changeFrequency
      );
      expect(entry.priority).toBeGreaterThan(0);
      expect(entry.priority).toBeLessThanOrEqual(1);
    }
  });

  it('should have higher priority for homepage', async () => {
    const sitemapModule = await import('../app/sitemap');
    const sitemap = sitemapModule.default();

    const homeEntry = sitemap.find((entry) => entry.url === `${BASE_URL}/it/`);
    expect(homeEntry?.priority).toBe(1.0);

    // Other pages should have lower priority
    const settingsEntry = sitemap.find((entry) => entry.url === `${BASE_URL}/it/settings`);
    expect(settingsEntry?.priority).toBeLessThan(1.0);
  });

  it('should include alternates with hreflang for language variants (F-77)', async () => {
    const sitemapModule = await import('../app/sitemap');
    const sitemap = sitemapModule.default();

    // Check at least one entry has alternates
    const entryWithAlternates = sitemap.find((entry) => entry.alternates);
    expect(entryWithAlternates).toBeDefined();

    if (entryWithAlternates?.alternates) {
      const languages = entryWithAlternates.alternates.languages as Record<string, string> | undefined;
      expect(languages).toBeDefined();

      if (languages) {
        expect(typeof languages).toBe('object');

        // Each page should have alternates for all locales
        const localeKeys = Object.keys(languages);
        expect(localeKeys.length).toBeGreaterThan(0);

        // Check structure of alternates
        for (const hreflang of localeKeys) {
          const url = languages[hreflang];
          expect(typeof url).toBe('string');
          // hreflang should be a locale or x-default
          const validHreflang = [...LOCALES, 'x-default'] as const;
          expect(validHreflang).toContain(hreflang as any);
        }
      }
    }
  });

  it('should include x-default alternate for default locale', async () => {
    const sitemapModule = await import('../app/sitemap');
    const sitemap = sitemapModule.default();

    // Find an entry with alternates
    const entryWithAlternates = sitemap.find((entry) => entry.alternates?.languages);

    if (entryWithAlternates?.alternates?.languages) {
      const languages = entryWithAlternates.alternates.languages;
      const hasXDefault = 'x-default' in languages;
      expect(hasXDefault).toBe(true);
    }
  });

  it('should have consistent lastModified date across entries', async () => {
    const sitemapModule = await import('../app/sitemap');
    const sitemap = sitemapModule.default();

    if (sitemap.length > 0) {
      const firstDate = (sitemap[0].lastModified as Date).getTime();

      // All entries should have similar lastModified dates (within 1 second)
      for (const entry of sitemap) {
        const entryDate = (entry.lastModified as Date).getTime();
        expect(Math.abs(entryDate - firstDate)).toBeLessThan(1000);
      }
    }
  });
});

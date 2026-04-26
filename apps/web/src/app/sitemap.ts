import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const LOCALES = ["it", "en", "fr", "de", "es"] as const;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://mirrorbuddy.app";

// Public pages available in all locales
const localeRoutes = [
  { path: "/", changeFrequency: "monthly" as const, priority: 1.0 },
  { path: "/home", changeFrequency: "weekly" as const, priority: 0.8 },
  { path: "/settings", changeFrequency: "monthly" as const, priority: 0.7 },
  {
    path: "/ai-transparency",
    changeFrequency: "monthly" as const,
    priority: 0.7,
  },
  { path: "/privacy", changeFrequency: "monthly" as const, priority: 0.6 },
  { path: "/terms", changeFrequency: "monthly" as const, priority: 0.6 },
  { path: "/schools", changeFrequency: "monthly" as const, priority: 0.8 },
  {
    path: "/accessibility",
    changeFrequency: "monthly" as const,
    priority: 0.6,
  },
];

/**
 * Generate hreflang alternates for a specific route
 * F-77: Sitemap includes all pages in all locales with language variants
 */
function generateAlternates(
  path: string,
): MetadataRoute.Sitemap[number]["alternates"] {
  const alternates: MetadataRoute.Sitemap[number]["alternates"] = {
    languages: {},
  };

  // Add all locale variants
  for (const locale of LOCALES) {
    (alternates.languages as Record<string, string>)[locale] =
      `${BASE_URL}/${locale}${path}`;
  }

  // Add x-default for the default locale (Italian)
  (alternates.languages as Record<string, string>)["x-default"] =
    `${BASE_URL}/it${path}`;

  return alternates;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];
  const lastModified = new Date();

  // Generate sitemap entries for each locale
  for (const locale of LOCALES) {
    for (const route of localeRoutes) {
      const url = `${BASE_URL}/${locale}${route.path}`;

      entries.push({
        url,
        lastModified,
        changeFrequency: route.changeFrequency,
        priority: route.priority,
        alternates: generateAlternates(route.path),
      });
    }
  }

  // Add default locale (no locale prefix) entries
  // These are aliases that redirect to the Italian locale
  for (const route of localeRoutes) {
    const url = `${BASE_URL}${route.path}`;

    entries.push({
      url,
      lastModified,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
      alternates: generateAlternates(route.path),
    });
  }

  return entries;
}

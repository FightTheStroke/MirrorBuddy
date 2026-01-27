/**
 * SEO hreflang tags for multi-locale pages
 */

export interface HreflangTag {
  rel: "alternate";
  hreflang: string; // e.g., 'it', 'en', 'x-default'
  href: string; // Full URL
}

export interface AlternateUrl {
  [locale: string]: string;
  "x-default": string;
}

export type Locale = "it" | "en" | "fr" | "de" | "es";

/**
 * Locale-specific Layout
 *
 * Wraps all localized pages and provides locale-aware metadata.
 * F-75: Pages have localized metadata for search engines
 *
 * This layout ensures that:
 * - Meta tags (title, description, keywords) are localized
 * - Open Graph and Twitter cards are appropriate for the locale
 * - HTML lang attribute reflects the current locale
 */

import { notFound } from "next/navigation";
import { getMessages } from "next-intl/server";
import { locales, defaultLocale } from "@/i18n/config";
import type { Locale } from "@/i18n/config";
import { getLocalizedOGMetadata } from "@/lib/i18n/get-og-metadata";
import { LocaleProvider } from "@/i18n/locale-provider";
import { A11yInstantAccess } from "@/components/accessibility";
import { HreflangLinks } from "@/components/seo/hreflang-links";
import type { Metadata } from "next";

// Type for route params
interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    locale: string;
  }>;
}

/**
 * Validate that the locale parameter is supported
 * Throws 404 if locale is invalid
 */
function validateLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

/**
 * Locale-specific RootLayout component
 *
 * This layout is rendered for all routes under /{locale}/* paths.
 * It receives the locale from the dynamic route parameter and
 * uses it for localization throughout the subtree.
 */
export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  // Await params in Next.js 16+
  const { locale } = await params;

  // Validate locale
  if (!validateLocale(locale)) {
    notFound();
  }

  // Load messages for the current locale
  const messages = await getMessages();

  return (
    <LocaleProvider locale={locale} messages={messages}>
      {/* WCAG 2.1 AA: Skip link rendered by AccessibilityProvider in Providers component */}
      {/* A11yInstantAccess requires i18n context, must be inside LocaleProvider */}
      <A11yInstantAccess />
      {/* HreflangLinks adds SEO hreflang tags for multi-language support */}
      <HreflangLinks />
      {children}
    </LocaleProvider>
  );
}

/**
 * Generate locale-aware metadata
 * F-78: Open Graph metadata with og:locale and og:locale:alternate
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  // Validate locale before generating metadata
  if (!validateLocale(locale)) {
    // Fallback to default locale if invalid
    return getLocalizedOGMetadata(defaultLocale);
  }

  return getLocalizedOGMetadata(locale);
}

/**
 * Generate static params for all supported locales
 *
 * This enables static generation of all locale versions at build time.
 * Required for next-intl when using localePrefix: "always"
 */
export async function generateStaticParams() {
  return locales.map((locale) => ({
    locale,
  }));
}

// Note: force-dynamic removed for performance. Individual pages that need
// dynamic rendering (e.g., server components reading cookies/headers) should
// declare `export const dynamic = "force-dynamic"` locally.
// Client components ("use client") do not need this directive.

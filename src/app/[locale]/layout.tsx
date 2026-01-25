import type { Metadata } from "next";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { locales } from "@/i18n/config";
import { LocaleProvider } from "@/i18n/locale-provider";
import { JsonLdScript } from "@/components/structured-data";
import { generateCanonicalUrl } from "@/lib/canonical-urls";
import { getLocalizedOGMetadata } from "@/lib/i18n/get-og-metadata";
import type { Locale } from "@/i18n/config";

/**
 * Generate metadata for locale-specific routes
 * Ensures canonical URL and locale-aware OG tags
 * Implements F-78: Pages have proper OG tags for social media
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  // Validate locale
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  // Generate canonical for the root locale path
  const canonicalUrl = generateCanonicalUrl(locale as Locale, "/");

  // Generate locale-specific OG metadata
  const ogMetadata = await getLocalizedOGMetadata(locale as Locale, {
    image: {
      url: "/og-image.png",
      width: 1200,
      height: 630,
      alt: "MirrorBuddy - AI-powered educational platform",
    },
  });

  return {
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: ogMetadata.openGraph,
    twitter: ogMetadata.twitter,
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // Await params as it's a Promise in Next.js 15+
  const { locale } = await params;

  // Validate locale
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  // Get messages for the locale
  const messages = await getMessages();

  return (
    <LocaleProvider locale={locale as Locale} messages={messages}>
      <JsonLdScript locale={locale as Locale} variant="educational" />
      {children}
    </LocaleProvider>
  );
}

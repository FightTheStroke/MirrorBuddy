import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

// Only render Analytics on Vercel (VERCEL env var is set by Vercel)
const isVercel = process.env.VERCEL === "1";
import { Providers } from "@/components/providers";
import { getNonce } from "@/lib/security/csp-nonce";
import { getRootOGMetadata } from "@/lib/i18n/get-og-metadata";
import { headers } from "next/headers";
import {
  detectLocaleFromRequest,
  extractLocaleFromUrl,
  isValidLocale,
} from "@/lib/i18n/locale-detection";
import { defaultLocale } from "@/i18n/config";
import type { Locale } from "@/i18n/config";
import { getLocale } from "next-intl/server";
import "./globals.css";
import "@/styles/safe-area.css";

const inter = Inter({ subsets: ["latin"] });

/**
 * Generate root-level metadata with locale-aware OG tags
 * Implements F-78: Pages have proper OG tags for social media
 */
export async function generateMetadata(): Promise<Metadata> {
  const ogMetadata = await getRootOGMetadata({
    image: {
      url: "/og-image.png",
      width: 1200,
      height: 630,
      alt: "MirrorBuddy - AI-powered educational platform",
    },
  });

  return {
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    ),
    title: "MirrorBuddy - The school we wished existed",
    description:
      "AI-powered educational platform with 17 historical Maestros, 5 Coaches, 5 Buddies, voice tutoring, and personalized learning for students with learning differences.",
    keywords: [
      "education",
      "AI",
      "tutoring",
      "voice",
      "learning",
      "DSA",
      "ADHD",
      "MirrorBuddy",
    ],
    manifest: "/manifest.json",
    icons: {
      icon: [
        { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
        { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
        { url: "/favicon-48.png", sizes: "48x48", type: "image/png" },
      ],
      apple: [
        { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      ],
    },
    openGraph: ogMetadata.openGraph,
    twitter: ogMetadata.twitter,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Get CSP nonce for Next.js hydration scripts
  // Next.js will automatically add this nonce to inline scripts when available
  const nonce = await getNonce();

  let localeFromNextIntl: Locale | null = null;
  try {
    const maybeLocale = await getLocale();
    localeFromNextIntl = isValidLocale(maybeLocale) ? maybeLocale : null;
  } catch {
    localeFromNextIntl = null;
  }

  const headersList = await headers();
  const pathnameCandidate =
    headersList.get("x-pathname") ||
    headersList.get("x-forwarded-uri") ||
    headersList.get("x-original-url") ||
    headersList.get("x-url") ||
    "/";

  const localeFromPath = extractLocaleFromUrl(pathnameCandidate);
  const locale =
    localeFromNextIntl ??
    localeFromPath ??
    detectLocaleFromRequest({
      cookieHeader: headersList.get("cookie"),
      acceptLanguageHeader: headersList.get("accept-language"),
    }) ??
    defaultLocale;

  // Load messages for the root layout (needed for consent wall and other shared components)
  const messages = await getMessages();

  return (
    <html lang={locale} dir="ltr" suppressHydrationWarning>
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, viewport-fit=cover"
        />
      </head>
      <body className={`${inter.className} antialiased`}>
        <NextIntlClientProvider messages={messages} locale={locale}>
          <Providers nonce={nonce}>
            <div data-testid="main-content">{children}</div>
          </Providers>
        </NextIntlClientProvider>
        {isVercel && <Analytics />}
      </body>
    </html>
  );
}

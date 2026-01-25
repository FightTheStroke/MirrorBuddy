import type { Metadata } from 'next';
import { generateCanonicalUrl } from '@/lib/canonical-urls';
import type { Locale } from '@/i18n/config';

/**
 * Generate metadata for cookie policy page
 * Ensures canonical URL is set for each locale version
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  return {
    title: 'Cookie Policy - MirrorBuddy',
    description: 'Informativa sui Cookie di MirrorBuddy',
    alternates: {
      canonical: generateCanonicalUrl(locale as Locale, '/cookies'),
    },
  };
}

export default function CookiesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

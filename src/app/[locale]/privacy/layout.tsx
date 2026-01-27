import type { Metadata } from 'next';
import { generateCanonicalUrl } from '@/lib/canonical-urls';
import type { Locale } from '@/i18n/config';

/**
 * Generate metadata for privacy policy page
 * Ensures canonical URL is set for each locale version
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  return {
    title: 'Privacy Policy - MirrorBuddy',
    description: 'Informativa sulla Privacy di MirrorBuddy',
    alternates: {
      canonical: generateCanonicalUrl(locale as Locale, '/privacy'),
    },
  };
}

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

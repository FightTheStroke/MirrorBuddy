import type { Metadata } from 'next';
import { generateCanonicalUrl } from '@/lib/canonical-urls';
import type { Locale } from '@/i18n/config';

/**
 * Generate metadata for terms of service page
 * Ensures canonical URL is set for each locale version
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  return {
    title: 'Termini di Servizio | MirrorBuddy',
    description:
      'Termini di Servizio di MirrorBuddy in linguaggio semplice e comprensibile. Scopri cosa promettiamo e cosa ti chiediamo.',
    robots: 'index, follow',
    alternates: {
      canonical: generateCanonicalUrl(locale as Locale, '/terms'),
    },
  };
}

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

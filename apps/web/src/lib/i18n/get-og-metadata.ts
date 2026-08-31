/**
 * Server utility to generate locale-specific OG metadata
 * Fetches locale content from next-intl messages
 */

import { defaultLocale, type Locale } from '@/i18n/config';
import { generateOGMetadata, type OGMetadataInput } from './og-metadata';
import type { Metadata } from 'next';
import { getSiteUrl } from '@/lib/config/site-url';

/**
 * Localized default metadata for each locale
 */
const DEFAULT_METADATA: Record<Locale, { title: string; description: string }> = {
  it: {
    title: 'MirrorBuddy - La scuola che desideravamo',
    description:
      "Piattaforma educativa alimentata da IA con 32 maestri storici, 6 insegnanti, 6 compagni, tutoraggio vocale e apprendimento personalizzato per studenti con disturbi dell'apprendimento.",
  },
  en: {
    title: 'MirrorBuddy - The School We Wished Existed',
    description:
      'AI-powered educational platform with 32 historical Maestros, 6 Coaches, 6 Buddies, voice tutoring, and personalized learning for students with learning differences.',
  },
  fr: {
    title: "MirrorBuddy - L'école que nous aurions aimée",
    description:
      "Plateforme éducative basée sur l'IA avec 32 maîtres historiques, 6 entraîneurs, 6 copains, tutorat vocal et apprentissage personnalisé pour les étudiants en difficulté d'apprentissage.",
  },
  de: {
    title: 'MirrorBuddy - Die Schule, die wir uns gewünscht haben',
    description:
      'KI-gestützte Bildungsplattform mit 32 historischen Meistern, 6 Trainern, 6 Lernpartnern, Sprachtutoring und personalisiertem Lernen für Schüler mit Lernbehinderungen.',
  },
  es: {
    title: 'MirrorBuddy - La escuela que deseábamos',
    description:
      'Plataforma educativa impulsada por IA con 32 maestros históricos, 6 entrenadores, 6 compañeros, tutoría de voz y aprendizaje personalizado para estudiantes con dificultades de aprendizaje.',
  },
};

/**
 * Get locale-specific OG metadata for a page
 * This function is used in layout.tsx files to set locale-aware metadata
 */
export async function getLocalizedOGMetadata(
  locale: Locale,
  options: {
    title?: string;
    description?: string;
    pathname?: string;
    image?: {
      url: string;
      width: number;
      height: number;
      alt?: string;
    };
  } = {},
): Promise<Metadata> {
  const siteUrl = getSiteUrl();

  // Use provided values or fall back to defaults
  const defaultMetadata = DEFAULT_METADATA[locale] || DEFAULT_METADATA[defaultLocale];
  const title = options.title || defaultMetadata.title;
  const description = options.description || defaultMetadata.description;

  // Build full URL
  const pathname = options.pathname || '';
  const url = pathname
    ? `${siteUrl}/${locale}${pathname.startsWith('/') ? pathname : '/' + pathname}`
    : `${siteUrl}/${locale}`;

  // Use provided image or fall back to default
  // Note: Current logo is 932x904, consider 1200x630 for optimal social sharing
  const image = options.image || {
    url: `${siteUrl}/logo-mirrorbuddy-full.png`,
    width: 932,
    height: 904,
  };

  const ogInput: OGMetadataInput = {
    locale,
    title,
    description,
    url,
    image,
  };

  return generateOGMetadata(ogInput);
}

/**
 * Get root-level OG metadata (for root layout)
 * Uses default locale
 */
export async function getRootOGMetadata(
  options: {
    image?: {
      url: string;
      width: number;
      height: number;
      alt?: string;
    };
  } = {},
): Promise<Metadata> {
  return getLocalizedOGMetadata(defaultLocale, {
    pathname: '',
    image: options.image || {
      url: '/logo-mirrorbuddy-full.png',
      width: 932,
      height: 904,
    },
  });
}

/**
 * JSON-LD Organization Schema Generator
 * Generates structured data for search engines (Google Rich Results, etc.)
 * Based on schema.org EducationalOrganization type
 *
 * F-76: Pages have structured data for rich search results
 */

import type { Locale } from '@/i18n/config';

export interface OrganizationSchema {
  '@context': string;
  '@type': string | string[];
  name: string;
  url: string;
  logo: string;
  description: string;
  sameAs: string[];
}

export interface EducationalOrganizationSchema extends OrganizationSchema {
  educationalLevel: string[];
}

// Locale-specific descriptions
const localeDescriptions: Record<Locale, string> = {
  it: 'MirrorBuddy - La scuola che vorrei. Piattaforma educativa potenziata da IA per studenti con differenze di apprendimento, con 26 maestri storici, insegnanti, compagni e tutoraggio vocale personalizzato.',
  en: 'MirrorBuddy - The school we wished existed. AI-powered educational platform for students with learning differences, featuring 26 historical maestros, coaches, buddies, and personalized voice tutoring.',
  fr: "MirrorBuddy - L'école que nous avions souhaitée. Plateforme éducative alimentée par l'IA pour les étudiants ayant des troubles d'apprentissage, avec 26 maîtres historiques, entraîneurs, camarades et tutorat vocal personnalisé.",
  de: 'MirrorBuddy - Die Schule, die wir uns gewünscht haben. KI-gestützte Bildungsplattform für Schüler mit Lernbehinderungen, mit 26 historischen Meistern, Trainern, Begleitern und personalisierter Sprachbetreuung.',
  es: 'MirrorBuddy - La escuela que siempre deseamos. Plataforma educativa impulsada por IA para estudiantes con dificultades de aprendizaje, con 26 maestros históricos, entrenadores, compañeros y tutoría de voz personalizada.',
};

// Educational levels (locale-specific)
const educationalLevels: Record<Locale, string[]> = {
  it: ['Scuola Secondaria di Primo Grado', 'Scuola Secondaria di Secondo Grado'],
  en: ['Middle School', 'High School', 'Secondary Education'],
  fr: ['Collège', 'Lycée', 'Enseignement Secondaire'],
  de: ['Sekundarstufe I', 'Sekundarstufe II', 'Weiterführende Schulen'],
  es: ['Educación Secundaria Obligatoria', 'Bachillerato', 'Educación Secundaria'],
};

/**
 * Generate Organization schema for JSON-LD structured data
 * Includes basic organization information for search engines
 *
 * @param locale - The locale for descriptions and content
 * @returns Organization schema object
 */
export function generateOrganizationSchema(locale: Locale): OrganizationSchema {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const logoUrl = `${siteUrl}/logo-512.png`;

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'MirrorBuddy',
    url: siteUrl,
    logo: logoUrl,
    description: localeDescriptions[locale],
    sameAs: [
      'https://github.com/FightTheStroke/MirrorBuddy',
      'https://twitter.com/MirrorBuddy_AI',
      'https://www.linkedin.com/company/mirrorbuddy/',
      'https://www.instagram.com/mirrorbuddy.ai/',
    ],
  };
}

/**
 * Generate EducationalOrganization schema for JSON-LD structured data
 * Extends Organization schema with educational-specific properties
 * Better for educational content in search results
 *
 * @param locale - The locale for descriptions and content
 * @returns EducationalOrganization schema object
 */
export function generateEducationalOrganizationSchema(
  locale: Locale,
): EducationalOrganizationSchema {
  const baseSchema = generateOrganizationSchema(locale);

  return {
    ...baseSchema,
    '@type': ['Organization', 'EducationalOrganization'],
    educationalLevel: educationalLevels[locale],
  };
}

/**
 * Serialize schema to JSON-LD script tag format
 * Safe for direct injection into HTML
 *
 * @param schema - The schema object to serialize
 * @returns JSON string safe for HTML
 */
export function serializeSchemaToJson(
  schema: OrganizationSchema | EducationalOrganizationSchema,
): string {
  return JSON.stringify(schema, null, 2);
}

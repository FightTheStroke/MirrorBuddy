/**
 * SoftwareApplication JSON-LD Schema
 * For rich search results showing app info, pricing, ratings
 */

import type { Locale } from '@/i18n/config';

export interface SoftwareApplicationSchema {
  '@context': string;
  '@type': string;
  name: string;
  description: string;
  url: string;
  applicationCategory: string;
  operatingSystem: string;
  offers: {
    '@type': string;
    price: string;
    priceCurrency: string;
  }[];
  inLanguage: string[];
}

const appDescriptions: Record<Locale, string> = {
  it: 'Piattaforma educativa AI con 26 professori storici per studenti con e senza DSA.',
  en: 'AI education platform with 26 historic professors for students with and without learning differences.',
  fr: 'Plateforme educative IA avec 26 professeurs historiques pour tous les etudiants.',
  de: 'KI-Bildungsplattform mit 26 historischen Professoren fur alle Schuler.',
  es: 'Plataforma educativa IA con 26 profesores historicos para todos los estudiantes.',
};

export function generateSoftwareApplicationSchema(locale: Locale): SoftwareApplicationSchema {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'MirrorBuddy',
    description: appDescriptions[locale],
    url: siteUrl,
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web, iOS, Android',
    offers: [
      { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
      { '@type': 'Offer', price: '9.99', priceCurrency: 'EUR' },
    ],
    inLanguage: ['it', 'en', 'fr', 'de', 'es'],
  };
}

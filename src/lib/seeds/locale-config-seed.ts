/**
 * Locale Configuration Seeding Module
 *
 * Creates default locale configurations for the 5 supported locales.
 * Maps each country to its primary language maestro.
 */

import { PrismaClient } from '@prisma/client';
import type { LocaleConfig } from '@prisma/client';

interface LocaleConfigSeedData {
  id: string;
  countryName: string;
  primaryLocale: string;
  primaryLanguageMaestroId: string;
  secondaryLocales: string[];
}

const LOCALE_CONFIGS: LocaleConfigSeedData[] = [
  {
    id: 'IT',
    countryName: 'Italia',
    primaryLocale: 'it',
    primaryLanguageMaestroId: 'manzoni-italiano',
    secondaryLocales: ['en', 'fr', 'de', 'es'],
  },
  {
    id: 'GB',
    countryName: 'United Kingdom',
    primaryLocale: 'en',
    primaryLanguageMaestroId: 'shakespeare-inglese',
    secondaryLocales: ['it', 'fr', 'de', 'es'],
  },
  {
    id: 'FR',
    countryName: 'France',
    primaryLocale: 'fr',
    primaryLanguageMaestroId: 'moliere-french',
    secondaryLocales: ['it', 'en', 'de', 'es'],
  },
  {
    id: 'DE',
    countryName: 'Deutschland',
    primaryLocale: 'de',
    primaryLanguageMaestroId: 'goethe-german',
    secondaryLocales: ['it', 'en', 'fr', 'es'],
  },
  {
    id: 'ES',
    countryName: 'España',
    primaryLocale: 'es',
    primaryLanguageMaestroId: 'cervantes-spanish',
    secondaryLocales: ['it', 'en', 'fr', 'de'],
  },
];

/**
 * Seed locale configurations into the database.
 * Uses upsert to be idempotent — safe to run multiple times.
 */
export async function seedLocaleConfigs(prisma: PrismaClient): Promise<LocaleConfig[]> {
  const results: LocaleConfig[] = [];

  for (const config of LOCALE_CONFIGS) {
    const locale = await prisma.localeConfig.upsert({
      where: { id: config.id },
      update: {
        countryName: config.countryName,
        primaryLocale: config.primaryLocale,
        primaryLanguageMaestroId: config.primaryLanguageMaestroId,
        secondaryLocales: config.secondaryLocales,
      },
      create: {
        id: config.id,
        countryName: config.countryName,
        primaryLocale: config.primaryLocale,
        primaryLanguageMaestroId: config.primaryLanguageMaestroId,
        secondaryLocales: config.secondaryLocales,
        enabled: true,
      },
    });
    results.push(locale);
  }

  return results;
}

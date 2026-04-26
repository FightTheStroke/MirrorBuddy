/**
 * Geo-based Cookie Consent Configuration
 *
 * Provides country-specific cookie consent configurations based on
 * regulatory requirements (LOPDGDD, Law 78-17, TTDSG, UK GDPR, GDPR).
 *
 * Plan 90: Multi-Language-Compliance (T4-07)
 */

export type CountryCode = "IT" | "ES" | "FR" | "DE" | "UK" | "US" | "OTHER";

export interface CookieConsentConfig {
  /** Country code for this configuration */
  country: CountryCode;
  /** Regulatory framework name */
  regulation: string;
  /** Language code for banner text */
  language: string;
  /** Accept all button text */
  acceptAllText: string;
  /** Reject all button text (must be prominent) */
  rejectAllText: string;
  /** Customize button text */
  customizeText: string;
  /** Title text */
  titleText: string;
  /** Subtitle text */
  subtitleText: string;
  /** Whether reject button must be equally prominent */
  rejectAllProminent: boolean;
  /** Regulatory authority contact info */
  authority: {
    name: string;
    website: string;
    email?: string;
  };
}

/**
 * Map locale to country code for cookie consent
 */
export function localeToCountry(locale: string): CountryCode {
  const localeMap: Record<string, CountryCode> = {
    it: "IT",
    es: "ES",
    fr: "FR",
    de: "DE",
    en: "UK", // Default English to UK for GDPR compliance
  };

  return localeMap[locale.toLowerCase()] || "OTHER";
}

/**
 * Get cookie consent configuration for a country
 */
export function getCookieConsentConfig(
  country: CountryCode,
): CookieConsentConfig {
  const configs: Record<CountryCode, CookieConsentConfig> = {
    IT: {
      country: "IT",
      regulation: "GDPR (Regulation EU 2016/679)",
      language: "it",
      acceptAllText: "Accetta Tutto",
      rejectAllText: "Rifiuta Tutto",
      customizeText: "Personalizza",
      titleText: "Utilizziamo i cookie",
      subtitleText: "Per migliorare la tua esperienza",
      rejectAllProminent: true,
      authority: {
        name: "Garante per la Protezione dei Dati Personali",
        website: "https://www.garanteprivacy.it",
        email: "garante@gpdp.it",
      },
    },
    ES: {
      country: "ES",
      regulation: "LOPDGDD (Ley Orgánica 3/2018) + GDPR",
      language: "es",
      acceptAllText: "Aceptar Todo",
      rejectAllText: "Rechazar Todo",
      customizeText: "Personalizar",
      titleText: "Utilizamos cookies",
      subtitleText: "Para mejorar tu experiencia",
      rejectAllProminent: true,
      authority: {
        name: "AEPD (Agencia Española de Protección de Datos)",
        website: "https://www.aepd.es",
        email: "consultas@aepd.es",
      },
    },
    FR: {
      country: "FR",
      regulation: "Law 78-17 (Informatique et Libertés) + GDPR",
      language: "fr",
      acceptAllText: "Tout Accepter",
      rejectAllText: "Tout Refuser",
      customizeText: "Personnaliser",
      titleText: "Nous utilisons des cookies",
      subtitleText: "Pour améliorer votre expérience",
      rejectAllProminent: true,
      authority: {
        name: "CNIL (Commission Nationale de l'Informatique et des Libertés)",
        website: "https://www.cnil.fr",
        email: "contact@cnil.fr",
      },
    },
    DE: {
      country: "DE",
      regulation:
        "TTDSG (Telekommunikation-Telemedien-Datenschutz-Gesetz) + GDPR",
      language: "de",
      acceptAllText: "Alle Akzeptieren",
      rejectAllText: "Alle Ablehnen",
      customizeText: "Anpassen",
      titleText: "Wir nutzen Cookies",
      subtitleText: "Um Ihre Erfahrung zu verbessern",
      rejectAllProminent: true,
      authority: {
        name: "BfDI (Bundesdatenschutzbeauftragte)",
        website: "https://www.bfdi.bund.de",
        email: "poststelle@bfdi.bund.de",
      },
    },
    UK: {
      country: "UK",
      regulation: "UK GDPR + ICO Guidelines",
      language: "en",
      acceptAllText: "Accept All",
      rejectAllText: "Reject All",
      customizeText: "Customize",
      titleText: "We use cookies",
      subtitleText: "To improve your experience",
      rejectAllProminent: true,
      authority: {
        name: "ICO (Information Commissioner's Office)",
        website: "https://ico.org.uk",
        email: "casework@ico.org.uk",
      },
    },
    US: {
      country: "US",
      regulation: "COPPA (Children's Online Privacy Protection Act)",
      language: "en",
      acceptAllText: "Accept All",
      rejectAllText: "Reject All",
      customizeText: "Customize",
      titleText: "We use cookies",
      subtitleText: "To improve your experience",
      rejectAllProminent: true,
      authority: {
        name: "FTC (Federal Trade Commission)",
        website: "https://www.ftc.gov",
      },
    },
    OTHER: {
      country: "OTHER",
      regulation: "GDPR (Regulation EU 2016/679)",
      language: "en",
      acceptAllText: "Accept All",
      rejectAllText: "Reject All",
      customizeText: "Customize",
      titleText: "We use cookies",
      subtitleText: "To improve your experience",
      rejectAllProminent: true,
      authority: {
        name: "Local Data Protection Authority",
        website: "https://edpb.europa.eu",
      },
    },
  };

  return configs[country] || configs.OTHER;
}

/**
 * Get cookie consent configuration from locale
 */
export function getCookieConsentConfigFromLocale(
  locale: string,
): CookieConsentConfig {
  const country = localeToCountry(locale);
  return getCookieConsentConfig(country);
}

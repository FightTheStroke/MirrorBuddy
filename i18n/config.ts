/**
 * i18n Configuration
 * Supported locales and default language settings
 */

export const locales = ["it", "en", "es", "fr", "de"] as const;
export const defaultLocale = "it" as const;

export type Locale = (typeof locales)[number];

/**
 * Locale display names (for UI)
 */
export const localeNames: Record<Locale, string> = {
  it: "Italiano",
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
};

/**
 * Check if a value is a valid locale
 */
export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && locales.includes(value as Locale);
}

/**
 * Locale Navigation Helpers
 *
 * Functions for building locale URLs, extracting locales, and managing cookies.
 */

import type { Page } from "@playwright/test";
import type { Locale } from "@/i18n/config";

/**
 * Supported locales
 */
const SUPPORTED_LOCALES = ["it", "en", "fr", "de", "es"] as const;

/**
 * Locale names for display
 */
export const LOCALE_NAMES: Record<Locale, string> = {
  it: "Italiano",
  en: "English",
  fr: "Français",
  de: "Deutsch",
  es: "Español",
};

/**
 * Accept-Language headers for each locale
 */
export const ACCEPT_LANGUAGE_HEADERS: Record<Locale, string> = {
  it: "it-IT,it;q=0.9,en;q=0.8",
  en: "en-US,en;q=0.9",
  fr: "fr-FR,fr;q=0.9,en;q=0.8",
  de: "de-DE,de;q=0.9,en;q=0.8",
  es: "es-ES,es;q=0.9,en;q=0.8",
};

/**
 * Get locale name from locale code
 *
 * @param locale - Locale code (e.g., 'it', 'en')
 * @returns Locale display name (e.g., 'Italiano', 'English')
 */
export function getLocaleName(locale: Locale): string {
  return LOCALE_NAMES[locale];
}

/**
 * Get Accept-Language header for locale
 *
 * @param locale - Locale code
 * @returns Accept-Language header value
 */
export function getAcceptLanguageHeader(locale: Locale): string {
  return ACCEPT_LANGUAGE_HEADERS[locale];
}

/**
 * Check if a locale is supported
 *
 * @param locale - Locale code to check
 * @returns True if locale is supported
 */
export function isSupportedLocale(locale: string): locale is Locale {
  return SUPPORTED_LOCALES.includes(locale as Locale);
}

/**
 * Extract locale from URL
 *
 * @param url - Full URL or pathname
 * @returns Locale code if found, null otherwise
 */
export function extractLocaleFromUrl(url: string): Locale | null {
  const match = url.match(/\/([a-z]{2})\//);
  if (!match) return null;

  const locale = match[1];
  return isSupportedLocale(locale) ? locale : null;
}

/**
 * Build localized URL path
 *
 * @param locale - Locale code
 * @param path - Path without locale prefix
 * @returns Localized path (e.g., '/it/home')
 */
export function buildLocalizedPath(locale: Locale, path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${cleanPath}`;
}

/**
 * Get NEXT_LOCALE cookie value from page
 *
 * @param page - Playwright page
 * @returns Cookie value or null if not set
 */
export async function getLocaleCookie(page: Page): Promise<string | null> {
  const cookies = await page.context().cookies();
  const localeCookie = cookies.find((c) => c.name === "NEXT_LOCALE");
  return localeCookie?.value || null;
}

/**
 * Set NEXT_LOCALE cookie (simulates user preference)
 *
 * @param page - Playwright page
 * @param locale - Locale to set
 */
export async function setLocaleCookie(
  page: Page,
  locale: Locale,
): Promise<void> {
  await page.context().addCookies([
    {
      name: "NEXT_LOCALE",
      value: locale,
      domain: "localhost",
      path: "/",
      expires: Date.now() / 1000 + 86400 * 365, // 1 year
    },
  ]);
}

/**
 * Clear NEXT_LOCALE cookie
 *
 * @param page - Playwright page
 */
export async function clearLocaleCookie(page: Page): Promise<void> {
  await page.context().clearCookies({ name: "NEXT_LOCALE" });
}

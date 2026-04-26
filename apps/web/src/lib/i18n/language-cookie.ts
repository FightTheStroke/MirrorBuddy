/**
 * Language Cookie Management
 * Client-side utilities for NEXT_LOCALE cookie
 */

import { defaultLocale, locales } from "@/i18n/config";
import type { Locale } from "@/i18n/config";
import { clientLogger } from "@/lib/logger/client";

const COOKIE_NAME = "NEXT_LOCALE";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year in seconds

/**
 * Get current language from NEXT_LOCALE cookie (client-side)
 */
export function getLanguageCookie(): Locale | null {
  if (typeof document === "undefined") {
    return null;
  }

  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [key, value] = cookie.split("=").map((s) => s.trim());
    if (key === COOKIE_NAME && value) {
      // Validate against supported locales
      if (locales.includes(value as Locale)) {
        return value as Locale;
      }
    }
  }
  return null;
}

/**
 * Set language in NEXT_LOCALE cookie (client-side)
 * Cookie is valid for 1 year and available site-wide
 *
 * @param locale Language code to set
 */
export function setLanguageCookie(locale: Locale): void {
  if (typeof document === "undefined") {
    return;
  }

  // Validate locale
  if (!locales.includes(locale)) {
    clientLogger.warn(
      `Invalid locale: ${locale}, using default: ${defaultLocale}`,
      {
        component: "language-cookie",
      },
    );
    locale = defaultLocale;
  }

  // Set cookie with 1-year expiration, HttpOnly=false (needs client access)
  document.cookie = `${COOKIE_NAME}=${locale}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

/**
 * Remove NEXT_LOCALE cookie (client-side)
 */
export function removeLanguageCookie(): void {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
}

/**
 * Detect browser's preferred language from navigator.language
 * Returns supported locale or null if not supported
 */
export function getBrowserLanguage(): Locale | null {
  if (typeof navigator === "undefined") {
    return null;
  }

  // Get browser language (e.g., "en-US", "it-IT")
  const browserLang =
    navigator.language ||
    (navigator as unknown as Record<string, string>).userLanguage;
  if (!browserLang) {
    return null;
  }

  // Extract base language code (e.g., "en" from "en-US")
  const baseLang = browserLang.toLowerCase().split("-")[0];

  // Check if it's a supported locale
  if (locales.includes(baseLang as Locale)) {
    return baseLang as Locale;
  }

  return null;
}

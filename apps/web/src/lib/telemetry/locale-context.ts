/**
 * Locale Context for Telemetry
 * Provides a way to get the current locale for telemetry tracking
 */

import { useLocale as useNextIntlLocale } from "next-intl";

/**
 * Get the current locale for telemetry purposes
 * This is a client-side utility that must be called within a component context
 */
export function getCurrentLocaleForTelemetry(): string | null {
  try {
    // This will only work in component context
    // For non-component contexts, we return null and let the caller handle it
    if (typeof window === "undefined") {
      return null;
    }

    // Try to get locale from document lang attribute as a fallback
    const documentLang = document.documentElement.lang;
    return documentLang || "it"; // Default to Italian if not set
  } catch {
    return null;
  }
}

/**
 * Hook to get locale for telemetry
 * Use this in React components
 */
export function useLocaleForTelemetry(): string {
  const locale = useNextIntlLocale();
  return locale || "it";
}

/**
 * useLocale hook - Provides locale information and switching capability
 *
 * This hook combines:
 * - next-intl's useLocale for getting the current locale
 * - Custom locale context for accessing locale metadata and switching
 *
 * Usage:
 * ```tsx
 * import { useLocale } from "@/hooks/use-locale";
 *
 * function MyComponent() {
 *   const { locale, locales, localeNames, switchLocale } = useLocale();
 *
 *   return (
 *     <select
 *       value={locale}
 *       onChange={(e) => switchLocale(e.target.value as Locale)}
 *     >
 *       {locales.map((loc) => (
 *         <option key={loc} value={loc}>
 *           {localeNames[loc]}
 *         </option>
 *       ))}
 *     </select>
 *   );
 * }
 * ```
 */

import { useLocale as useNextIntlLocale } from "next-intl";
import { useLocaleContext } from "@/i18n/locale-provider";

export function useLocale() {
  // Get current locale from next-intl
  const currentLocale = useNextIntlLocale();

  // Get locale context (metadata and switching)
  const { locales, defaultLocale, localeNames, localeFlags, switchLocale } =
    useLocaleContext();

  return {
    locale: currentLocale,
    locales,
    defaultLocale,
    localeNames,
    localeFlags,
    switchLocale,
  };
}

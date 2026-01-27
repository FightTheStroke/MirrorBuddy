/**
 * useAdminLocalePreview hook
 *
 * For admin users only: Returns the preview locale if set, otherwise the current locale.
 * This hook checks sessionStorage for "admin_preview_locale" to determine which locale to use.
 *
 * Usage in client components:
 * ```tsx
 * import { useAdminLocalePreview } from "@/hooks/use-admin-locale-preview";
 *
 * function MyComponent() {
 *   const locale = useAdminLocalePreview();
 *   return <p>Current/Preview Locale: {locale}</p>;
 * }
 * ```
 *
 * Use case:
 * - Admin selects a preview locale via LocalePreviewSelector
 * - Components use this hook instead of useLocale() to get the preview locale
 * - Allows testing UI in different languages without changing the URL
 */

import { useEffect, useState } from "react";
import { useLocale as useNextIntlLocale } from "next-intl";
import type { Locale } from "@/i18n/config";

// Initialize preview locale from session storage
function getInitialPreviewLocale(): Locale | null {
  if (typeof sessionStorage === "undefined") return null;
  const stored = sessionStorage.getItem("admin_preview_locale");
  return stored ? (stored as Locale) : null;
}

export function useAdminLocalePreview(): Locale {
  const currentLocale = useNextIntlLocale();
  const [previewLocale, setPreviewLocale] = useState<Locale | null>(
    getInitialPreviewLocale,
  );

  useEffect(() => {
    // Listen for preview locale changes
    const handlePreviewChange = (
      event: CustomEvent<{ locale: Locale }>,
    ) => {
      setPreviewLocale(event.detail.locale);
    };

    window.addEventListener(
      "admin_locale_preview_changed",
      handlePreviewChange as EventListener,
    );

    return () => {
      window.removeEventListener(
        "admin_locale_preview_changed",
        handlePreviewChange as EventListener,
      );
    };
  }, []);

  // Return preview locale if set, otherwise current locale
  return previewLocale || (currentLocale as Locale);
}

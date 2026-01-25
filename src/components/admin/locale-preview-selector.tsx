"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/hooks/use-locale";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/config";

/**
 * LocalePreviewSelector
 *
 * Admin-only component to preview the app in any locale without logout.
 * Uses session storage to temporarily override the current locale for preview.
 *
 * Features:
 * - Dropdown to select any supported locale
 * - Shows locale flags and names
 * - Stores preview preference in sessionStorage (admin_preview_locale)
 * - Reset button to return to current locale
 * - Visual indicator when in preview mode
 *
 * Usage:
 * ```tsx
 * import { LocalePreviewSelector } from "@/components/admin/locale-preview-selector";
 *
 * export function AdminHeader() {
 *   return (
 *     <header>
 *       <LocalePreviewSelector />
 *     </header>
 *   );
 * }
 * ```
 */

// Initialize preview locale from session storage
function getInitialPreviewLocale(): Locale | null {
  if (typeof sessionStorage === "undefined") return null;
  const stored = sessionStorage.getItem("admin_preview_locale");
  return stored ? (stored as Locale) : null;
}

export function LocalePreviewSelector() {
  const { locale, locales, localeNames, localeFlags } = useLocale();
  const [previewLocale, setPreviewLocale] = useState<Locale | null>(
    getInitialPreviewLocale,
  );
  const [isPreviewActive, setIsPreviewActive] = useState(
    () => getInitialPreviewLocale() !== null,
  );

  // Subscribe to preview locale changes from other tabs/windows
  useEffect(() => {
    const handlePreviewChange = (
      event: CustomEvent<{ locale: Locale }>,
    ) => {
      setPreviewLocale(event.detail.locale);
      setIsPreviewActive(true);
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

  const handleLocaleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = e.target.value as Locale;

    // If switching back to current locale, clear preview
    if (newLocale === locale) {
      sessionStorage.removeItem("admin_preview_locale");
      setPreviewLocale(null);
      setIsPreviewActive(false);
    } else {
      // Set preview locale in session storage
      sessionStorage.setItem("admin_preview_locale", newLocale);
      setPreviewLocale(newLocale);
      setIsPreviewActive(true);

      // Dispatch custom event for components to update UI
      window.dispatchEvent(
        new CustomEvent("admin_locale_preview_changed", {
          detail: { locale: newLocale },
        }),
      );
    }
  };

  const handleReset = () => {
    sessionStorage.removeItem("admin_preview_locale");
    setPreviewLocale(null);
    setIsPreviewActive(false);
    // Reset the select element
    const selectElement = document.querySelector(
      "[name='locale-preview']",
    ) as HTMLSelectElement;
    if (selectElement) {
      selectElement.value = locale;
    }
  };

  const displayLocale = previewLocale || locale;

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <select
          name="locale-preview"
          value={displayLocale}
          onChange={handleLocaleChange}
          aria-label="Seleziona locale per anteprima / Preview language"
          className={cn(
            "px-3 py-2 rounded-lg border text-sm font-medium",
            "bg-white dark:bg-slate-800",
            "border-slate-200 dark:border-slate-700",
            "text-slate-900 dark:text-white",
            "hover:border-slate-300 dark:hover:border-slate-600",
            "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
            "dark:focus:ring-offset-slate-900",
            "transition-colors duration-200",
            isPreviewActive &&
              "ring-2 ring-amber-400 ring-offset-2 dark:ring-offset-slate-900",
          )}
        >
          {(locales as readonly Locale[]).map((loc) => (
            <option key={loc} value={loc}>
              {localeFlags[loc]} {localeNames[loc]}
            </option>
          ))}
        </select>

        {/* Preview indicator badge */}
        {isPreviewActive && (
          <span className="absolute -top-2 -right-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-amber-500 rounded-full">
            *
          </span>
        )}
      </div>

      {/* Reset button - only show when preview is active */}
      {isPreviewActive && (
        <button
          onClick={handleReset}
          aria-label="Ripristina locale / Reset locale preview"
          className={cn(
            "p-2 rounded-lg border text-sm font-medium",
            "bg-white dark:bg-slate-800",
            "border-slate-200 dark:border-slate-700",
            "text-slate-600 dark:text-slate-400",
            "hover:bg-slate-100 dark:hover:bg-slate-700",
            "hover:text-slate-900 dark:hover:text-white",
            "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
            "dark:focus:ring-offset-slate-900",
            "transition-colors duration-200",
          )}
          title="Ripristina locale corrente / Reset to current locale"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      )}

      {/* Info text */}
      {isPreviewActive && (
        <span className="text-xs text-amber-700 dark:text-amber-300 font-medium">
          Anteprima
        </span>
      )}
    </div>
  );
}

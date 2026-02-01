"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { Globe } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { locales, localeNames, localeFlags, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

/**
 * Language Switcher Component
 * F-69: Users can select their preferred language before logging in
 *
 * Features:
 * - Displays all 5 languages (IT, EN, FR, DE, ES) with flags
 * - Sets NEXT_LOCALE cookie on selection
 * - Redirects to /{locale}/welcome after selection
 * - Keyboard accessible (Tab, Enter, Escape)
 * - ARIA attributes for screen readers
 * - Mobile responsive
 */
export function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Extract current locale from pathname (e.g., /en/welcome -> en)
  const currentLocale = pathname?.split("/")[1] as Locale | undefined;

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const handleLanguageSelect = (locale: Locale) => {
    // Set cookie with 1 year expiration
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);
    // eslint-disable-next-line react-hooks/immutability
    document.cookie = `NEXT_LOCALE=${locale}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;

    // Close dropdown
    setIsOpen(false);

    // Redirect to new locale path
    router.push("/welcome", { locale });
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger Button */}
      <button
        onClick={toggleDropdown}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault(); // Prevent default button activation (which also triggers onClick)
            toggleDropdown();
          }
        }}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="Select language"
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-lg",
          "bg-white dark:bg-gray-800",
          "border border-gray-200 dark:border-gray-700",
          "hover:bg-gray-50 dark:hover:bg-gray-700",
          "transition-colors duration-200",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
          "shadow-sm hover:shadow-md",
        )}
      >
        <Globe className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {currentLocale
            ? `${localeFlags[currentLocale]} ${localeNames[currentLocale]}`
            : "Language"}
        </span>
        <svg
          className={cn(
            "w-4 h-4 text-gray-500 transition-transform duration-200",
            isOpen && "rotate-180",
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            role="menu"
            className={cn(
              "absolute right-0 mt-2 w-56",
              "bg-white dark:bg-gray-800",
              "border border-gray-200 dark:border-gray-700",
              "rounded-lg shadow-xl",
              "py-2",
              "z-50",
              "max-h-[300px] overflow-y-auto",
            )}
          >
            {locales.map((locale) => {
              const isCurrent = locale === currentLocale;
              return (
                <button
                  key={locale}
                  role="menuitem"
                  aria-current={isCurrent}
                  onClick={() => handleLanguageSelect(locale)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5",
                    "text-left text-sm",
                    "hover:bg-gray-100 dark:hover:bg-gray-700",
                    "transition-colors duration-150",
                    "focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700",
                    isCurrent &&
                      "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
                  )}
                >
                  <span className="text-2xl" aria-hidden="true">
                    {localeFlags[locale]}
                  </span>
                  <span
                    className={cn(
                      "flex-1 font-medium",
                      isCurrent
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-gray-700 dark:text-gray-300",
                    )}
                  >
                    {localeNames[locale]}
                  </span>
                  {isCurrent && (
                    <svg
                      className="w-5 h-5 text-blue-600 dark:text-blue-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

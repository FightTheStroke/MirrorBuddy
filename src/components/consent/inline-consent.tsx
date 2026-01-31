"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Cookie, Check } from "lucide-react";
import {
  saveConsent,
  syncConsentToServer,
} from "@/lib/consent/consent-storage";
import {
  subscribeToConsent,
  getConsentSnapshot,
  getServerConsentSnapshot,
  updateConsentSnapshot,
} from "@/lib/consent/consent-store";

interface InlineConsentProps {
  /** Optional callback when consent changes */
  onConsentChange?: (consented: boolean) => void;
  /** Compact mode for tight spaces */
  compact?: boolean;
}

/**
 * Inline Consent Component - Non-blocking cookie consent for footer
 *
 * Provides a checkbox-style consent mechanism that integrates
 * into the welcome page footer instead of blocking the UI.
 *
 * GDPR compliant - user must actively accept.
 */
export function InlineConsent({
  onConsentChange,
  compact = false,
}: InlineConsentProps) {
  const t = useTranslations("consent.inline");

  // Use useSyncExternalStore to avoid setState-in-effect issues
  const consented = useSyncExternalStore(
    subscribeToConsent,
    getConsentSnapshot,
    getServerConsentSnapshot,
  );
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);

  const handleAccept = async () => {
    const consent = saveConsent(analyticsEnabled);
    await syncConsentToServer(consent);
    updateConsentSnapshot(true);
    onConsentChange?.(true);
  };

  // Already consented
  if (consented) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
        <Check className="w-4 h-4" />
        <span>{t("acceptedText")}</span>
        <span className="text-gray-400">•</span>
        <Link
          href="/cookies"
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline-offset-2 hover:underline"
        >
          {t("manage")}
        </Link>
      </div>
    );
  }

  // Compact version
  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <button
          onClick={handleAccept}
          className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          <Cookie className="w-4 h-4" />
          {t("acceptButton")}
        </button>
        <Link
          href="/cookies"
          className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline-offset-2 hover:underline"
        >
          {t("info")}
        </Link>
      </div>
    );
  }

  // Full version with analytics toggle
  return (
    <div className="flex flex-col gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-start gap-3">
        <Cookie className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {t("title")}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t("description")}{" "}
            <Link
              href="/cookies"
              className="text-blue-600 dark:text-blue-400 underline hover:no-underline"
            >
              {t("learnMore")}
            </Link>
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <label
          htmlFor="inline-consent-analytics"
          className="flex items-center gap-2 cursor-pointer"
        >
          <input
            id="inline-consent-analytics"
            type="checkbox"
            checked={analyticsEnabled}
            onChange={(e) => setAnalyticsEnabled(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-xs text-gray-600 dark:text-gray-300">
            {t("analyticsLabel")}
          </span>
        </label>
        <button
          onClick={handleAccept}
          className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
        >
          {t("submitButton")}
        </button>
      </div>
    </div>
  );
}

export default InlineConsent;

"use client";

import { useState, useSyncExternalStore } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Cookie, Shield, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  getCookieConsentConfigFromLocale,
  type CookieConsentConfig,
} from "@/lib/compliance/cookie-consent-config";
import { CookiePreferencesModal } from "./cookie-preferences-modal";

interface CookieConsentWallProps {
  children: React.ReactNode;
}

/**
 * Cookie Consent Wall - GDPR Compliant with Geo-based Variations
 *
 * Blocks access to the application until user accepts essential cookies.
 * Required for GDPR/COPPA compliance.
 *
 * Plan 90: Implements country-specific cookie consent requirements:
 * - Spain (LOPDGDD): Spanish language, "Rechazar Todo" prominent
 * - France (Law 78-17): French language, "Tout Refuser" prominent
 * - Germany (TTDSG): German language, "Alle Ablehnen" prominent
 * - UK (UK GDPR): English language, "Reject All" prominent
 * - Italy (GDPR): Italian language, "Rifiuta Tutto" prominent
 */
export function CookieConsentWall({ children }: CookieConsentWallProps) {
  const t = useTranslations("consent.cookie");
  const locale = useLocale();

  // Get country-specific configuration
  const config: CookieConsentConfig = getCookieConsentConfigFromLocale(locale);

  // Use useSyncExternalStore to avoid setState-in-effect
  const consented = useSyncExternalStore(
    subscribeToConsent,
    getConsentSnapshot,
    getServerConsentSnapshot,
  );
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);

  const handleAccept = async () => {
    const consent = saveConsent(analyticsEnabled);
    await syncConsentToServer(consent);
    // Update external store and notify subscribers
    updateConsentSnapshot(true);
  };

  // User has consented, show app
  if (consented) {
    return <>{children}</>;
  }

  // Show consent wall
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="max-w-lg w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
            <Cookie className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {config.titleText}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {config.subtitleText}
            </p>
          </div>
        </div>

        {/* Explanation */}
        <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
          <p>{t("explanation")}</p>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>{t("list.session")}</span>
            </li>
            <li className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>{t("list.preferences")}</span>
            </li>
            <li className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>{t("list.protect")}</span>
            </li>
          </ul>
        </div>

        {/* Analytics toggle */}
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
          <div>
            <p className="font-medium text-slate-900 dark:text-white text-sm">
              {t("analytics.label")}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("analytics.description")}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={analyticsEnabled}
            aria-label={t("analytics.aria")}
            onClick={() => setAnalyticsEnabled(!analyticsEnabled)}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              analyticsEnabled
                ? "bg-blue-600"
                : "bg-slate-300 dark:bg-slate-600"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                analyticsEnabled ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>

        {/* Action buttons - Reject All must be equally prominent */}
        <div
          className={`flex gap-3 ${config.rejectAllProminent ? "flex-col sm:flex-row" : ""}`}
        >
          <Button
            onClick={() => {
              // Reject all = only essential cookies
              const consent = saveConsent(false);
              syncConsentToServer(consent);
              updateConsentSnapshot(true);
            }}
            variant={config.rejectAllProminent ? "outline" : "ghost"}
            className={config.rejectAllProminent ? "flex-1" : ""}
            size="lg"
          >
            {config.rejectAllText}
          </Button>
          <Button
            onClick={handleAccept}
            className={config.rejectAllProminent ? "flex-1" : "w-full"}
            size="lg"
          >
            {config.acceptAllText}
          </Button>
        </div>

        {/* Customize option */}
        <div className="text-center">
          <button
            onClick={() => setShowCustomizeModal(true)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            {config.customizeText}
          </button>
        </div>

        {/* Customize Modal */}
        <CookiePreferencesModal
          open={showCustomizeModal}
          onOpenChange={setShowCustomizeModal}
          analyticsEnabled={analyticsEnabled}
          onAnalyticsEnabledChange={setAnalyticsEnabled}
        />

        {/* Links */}
        <div className="flex items-center justify-center gap-4 text-xs">
          <a
            href="/privacy"
            target="_blank"
            rel="noopener"
            className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
          >
            {t("privacyPolicy")}
            <ExternalLink className="w-3 h-3" />
          </a>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <a
            href="/cookies"
            target="_blank"
            rel="noopener"
            className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
          >
            {t("cookiePolicy")}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Regulatory note */}
        <div className="text-[10px] text-slate-500 dark:text-slate-400 text-center space-y-1">
          <p>{t("coppa")}</p>
          <p>
            {config.regulation} -{" "}
            <a
              href={config.authority.website}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-slate-700 dark:hover:text-slate-300"
            >
              {config.authority.name}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default CookieConsentWall;

"use client";

import { useState, useEffect, useSyncExternalStore, useCallback } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Cookie, Shield, FileText, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clientLogger } from "@/lib/logger/client";
import {
  saveUnifiedConsent,
  syncUnifiedConsentToServer,
  needsReconsent,
  getUnifiedConsent,
  initializeConsent,
  markConsentLoaded,
} from "@/lib/consent/unified-consent-storage";
import {
  subscribeToConsent,
  getConsentSnapshot,
  getServerConsentSnapshot,
  updateConsentSnapshot,
} from "@/lib/consent/consent-store";

interface UnifiedConsentWallProps {
  children: React.ReactNode;
}

/**
 * Unified Consent Wall - TOS + Cookie consent in one place (DB-first)
 *
 * Blocks access until user accepts:
 * - Terms of Service (required)
 * - Essential cookies (required)
 * - Analytics cookies (optional)
 *
 * DB-first approach:
 * 1. Load consent from DB on mount (for authenticated users)
 * 2. Cache in localStorage for offline/fast access
 * 3. Sync changes back to DB
 *
 * GDPR/COPPA compliant.
 */
export function UnifiedConsentWall({ children }: UnifiedConsentWallProps) {
  const t = useTranslations("compliance.consent.unified");

  // Use useSyncExternalStore to avoid setState-in-effect
  const consented = useSyncExternalStore(
    subscribeToConsent,
    getConsentSnapshot,
    getServerConsentSnapshot,
  );

  const [tosAccepted, setTosAccepted] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check if this is a re-consent scenario
  const isReconsent = needsReconsent();
  const existingConsent = getUnifiedConsent();

  // Initialize consent from DB on mount
  useEffect(() => {
    let mounted = true;

    const loadConsent = async () => {
      try {
        const hasConsent = await initializeConsent();
        if (mounted) {
          updateConsentSnapshot(hasConsent);
          markConsentLoaded();
          setIsLoading(false);
        }
      } catch (error) {
        clientLogger.error(
          "Failed to initialize consent",
          { component: "UnifiedConsentWall" },
          error,
        );
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadConsent();

    return () => {
      mounted = false;
    };
  }, []);

  const handleAccept = useCallback(async () => {
    // Require TOS checkbox to be checked
    if (!tosAccepted) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Save to localStorage
      const consent = saveUnifiedConsent(analyticsEnabled);

      // Sync to server (best effort)
      await syncUnifiedConsentToServer(consent);

      // Update external store and notify subscribers
      updateConsentSnapshot(true);
    } catch (error) {
      clientLogger.error(
        "Failed to save consent",
        { component: "UnifiedConsentWall" },
        error,
      );
      // Still proceed - localStorage is primary
      updateConsentSnapshot(true);
    } finally {
      setIsSubmitting(false);
    }
  }, [tosAccepted, analyticsEnabled]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Allow Enter to submit if TOS accepted
      if (e.key === "Enter" && tosAccepted && !isSubmitting) {
        handleAccept();
      }
    },
    [tosAccepted, isSubmitting, handleAccept],
  );

  // Show loading state while checking DB
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 mx-auto border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t("loading")}
          </p>
        </div>
      </div>
    );
  }

  // User has consented and doesn't need re-consent, show app
  if (consented && !isReconsent) {
    return <>{children}</>;
  }

  // Show consent wall
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4"
      onKeyDown={handleKeyDown}
    >
      <div className="max-w-2xl w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
            {isReconsent ? (
              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            ) : (
              <Cookie className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {isReconsent ? t("titleUpdated") : t("titleWelcome")}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {isReconsent ? t("subtitleUpdated") : t("subtitleWelcome")}
            </p>
          </div>
        </div>

        {/* Re-consent notice */}
        {isReconsent && existingConsent && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>{t("reconsentNotice.lastAccepted")}</strong>{" "}
              {new Date(existingConsent.tos.acceptedAt).toLocaleDateString()}
              <br />
              <strong>{t("reconsentNotice.changed")}</strong>{" "}
              {t("reconsentNotice.details")}
            </p>
          </div>
        )}

        {/* Summary */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            {t("summaryTitle")}
          </h2>
          <div className="grid gap-3">
            <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <Shield className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {t("privacy.title")}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {t("privacy.description")}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <Cookie className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {t("cookies.title")}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {t("cookies.description")}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <FileText className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {t("tos.title")}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {t("tos.description")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Links to full documents */}
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
          <Link
            href="/terms"
            target="_blank"
            rel="noopener"
            className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
          >
            {t("links.full")}
            <ExternalLink className="w-3 h-3" />
          </Link>
          <span className="text-slate-300 dark:text-slate-600">•</span>
          <Link
            href="/privacy"
            target="_blank"
            rel="noopener"
            className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
          >
            {t("links.privacy")}
            <ExternalLink className="w-3 h-3" />
          </Link>
          <span className="text-slate-300 dark:text-slate-600">•</span>
          <Link
            href="/cookies"
            target="_blank"
            rel="noopener"
            className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
          >
            {t("links.cookies")}
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        {/* Consent checkboxes/toggles */}
        <div className="space-y-4 border-t border-slate-200 pt-6 dark:border-slate-800">
          {/* TOS acceptance (required) */}
          <label
            htmlFor="tos-checkbox"
            className="flex items-start gap-3 cursor-pointer group focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 rounded-lg p-2 -m-2"
          >
            <input
              id="tos-checkbox"
              type="checkbox"
              checked={tosAccepted}
              onChange={(e) => setTosAccepted(e.target.checked)}
              disabled={isSubmitting}
              className="mt-1 h-5 w-5 rounded border-2 border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 cursor-pointer"
              aria-required="true"
              aria-describedby="tos-checkbox-label"
            />
            <span
              id="tos-checkbox-label"
              className="text-sm text-slate-700 dark:text-slate-300 select-none"
            >
              <strong>{t("tosCheckbox.label")}</strong> {t("tosCheckbox.text")}
            </span>
          </label>

          {/* Analytics toggle (optional) */}
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
              aria-label={t("analytics.label")}
              onClick={() => setAnalyticsEnabled(!analyticsEnabled)}
              disabled={isSubmitting}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                analyticsEnabled
                  ? "bg-blue-600"
                  : "bg-slate-300 dark:bg-slate-600"
              } ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  analyticsEnabled ? "translate-x-5" : ""
                }`}
              />
            </button>
          </div>
        </div>

        {/* Accept button */}
        <Button
          onClick={handleAccept}
          disabled={!tosAccepted || isSubmitting}
          className="w-full"
          size="lg"
          aria-label={
            !tosAccepted ? t("buttons.disabled") : t("buttons.accept")
          }
        >
          {isSubmitting ? t("buttons.submitting") : t("buttons.accept")}
        </Button>

        {/* COPPA note */}
        <p className="text-[10px] text-slate-500 dark:text-slate-400 text-center">
          {t("coppa")}
        </p>

        {/* Screen reader announcement */}
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {!tosAccepted && t("screenReader.required")}
          {isSubmitting && t("screenReader.submitting")}
        </div>
      </div>
    </div>
  );
}

export default UnifiedConsentWall;

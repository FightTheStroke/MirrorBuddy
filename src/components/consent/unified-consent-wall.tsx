"use client";

import { useState, useEffect, useSyncExternalStore, useCallback } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clientLogger } from "@/lib/logger/client";
import {
  saveUnifiedConsent,
  syncUnifiedConsentToServer,
  needsReconsent,
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
 * Unified Consent Wall - Slim Bottom Banner (TOS + Cookie consent)
 *
 * Single-step acceptance:
 * - Terms of Service (required)
 * - Essential cookies (required)
 * - Analytics cookies (optional, inline toggle)
 *
 * Design:
 * - Fixed bottom banner (not fullscreen modal)
 * - Compact, minimal friction
 * - Slide-up animation (respects prefers-reduced-motion)
 * - Links open in new tab
 *
 * GDPR/COPPA compliant.
 */
export function UnifiedConsentWall({ children }: UnifiedConsentWallProps) {
  const t = useTranslations("consent.unified");

  // Use useSyncExternalStore to avoid setState-in-effect
  const consented = useSyncExternalStore(
    subscribeToConsent,
    getConsentSnapshot,
    getServerConsentSnapshot,
  );

  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);

  // Check if this is a re-consent scenario
  const isReconsent = needsReconsent();

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
          // Show banner with animation if consent needed
          if (!hasConsent || isReconsent) {
            setIsVisible(true);
          }
        }
      } catch (error) {
        clientLogger.error(
          "Failed to initialize consent",
          { component: "UnifiedConsentWall" },
          error,
        );
        if (mounted) {
          setIsLoading(false);
          setIsVisible(true);
        }
      }
    };

    loadConsent();

    return () => {
      mounted = false;
    };
  }, [isReconsent]);

  const handleAccept = useCallback(async () => {
    setIsSubmitting(true);
    try {
      // Save to localStorage
      const consent = saveUnifiedConsent(analyticsEnabled);

      // Sync to server (best effort)
      await syncUnifiedConsentToServer(consent);

      // Update external store and notify subscribers
      updateConsentSnapshot(true);

      // Hide banner
      setIsVisible(false);
    } catch (error) {
      clientLogger.error(
        "Failed to save consent",
        { component: "UnifiedConsentWall" },
        error,
      );
      // Still proceed - localStorage is primary
      updateConsentSnapshot(true);
      setIsVisible(false);
    } finally {
      setIsSubmitting(false);
    }
  }, [analyticsEnabled]);

  // User has consented and doesn't need re-consent, show app
  if (consented && !isReconsent) {
    return <>{children}</>;
  }

  // Detect prefers-reduced-motion
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Show consent banner (slim bottom banner)
  return (
    <>
      {children}
      {/* Slim bottom consent banner */}
      {(isLoading || isVisible) && (
        <div
          data-testid="consent-banner"
          className={`fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 shadow-lg transition-transform duration-300 ${
            prefersReducedMotion ? "" : "ease-out"
          } ${isLoading ? "translate-y-0 opacity-50" : isVisible ? "translate-y-0" : "translate-y-full"}`}
          role="dialog"
          aria-labelledby="consent-banner-title"
          aria-describedby="consent-banner-description"
        >
          <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4">
            {isLoading ? (
              <div className="flex items-center justify-center gap-3">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {t("loading")}
                </p>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                {/* Brief text */}
                <div className="flex-1 min-w-0">
                  <p
                    id="consent-banner-title"
                    className="text-sm font-medium text-slate-900 dark:text-white"
                  >
                    {isReconsent ? t("titleUpdated") : t("titleWelcome")}
                  </p>
                  <p
                    id="consent-banner-description"
                    className="text-xs text-slate-600 dark:text-slate-400 mt-0.5"
                  >
                    {t("bannerDescription")}{" "}
                    <Link
                      href="/privacy"
                      target="_blank"
                      rel="noopener"
                      className="inline-flex items-center gap-0.5 text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {t("links.privacy")}
                      <ExternalLink className="w-3 h-3 inline" />
                    </Link>
                    {" • "}
                    <Link
                      href="/terms"
                      target="_blank"
                      rel="noopener"
                      className="inline-flex items-center gap-0.5 text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {t("links.full")}
                      <ExternalLink className="w-3 h-3 inline" />
                    </Link>
                  </p>
                </div>

                {/* Analytics toggle (compact inline) */}
                <div className="flex items-center gap-2 shrink-0">
                  <label
                    htmlFor="analytics-toggle"
                    className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    {t("analytics.label")}
                  </label>
                  <button
                    id="analytics-toggle"
                    type="button"
                    role="switch"
                    aria-checked={analyticsEnabled}
                    aria-label={t("analytics.label")}
                    onClick={() => setAnalyticsEnabled(!analyticsEnabled)}
                    disabled={isSubmitting}
                    className={`relative w-9 h-5 rounded-full transition-colors ${
                      analyticsEnabled
                        ? "bg-blue-600"
                        : "bg-slate-300 dark:bg-slate-600"
                    } ${isSubmitting ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        analyticsEnabled ? "translate-x-4" : ""
                      }`}
                    />
                  </button>
                </div>

                {/* Single accept button */}
                <Button
                  onClick={handleAccept}
                  disabled={isSubmitting}
                  size="sm"
                  className="shrink-0"
                  aria-label={t("buttons.accept")}
                >
                  {isSubmitting ? t("buttons.submitting") : t("buttons.accept")}
                </Button>
              </div>
            )}
          </div>

          {/* Screen reader announcement */}
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
          >
            {isSubmitting && t("screenReader.submitting")}
          </div>
        </div>
      )}
    </>
  );
}

export default UnifiedConsentWall;

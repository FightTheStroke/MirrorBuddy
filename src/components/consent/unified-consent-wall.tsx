"use client";

import { useState, useEffect, useSyncExternalStore, useCallback } from "react";
import Link from "next/link";
import { Cookie, Shield, FileText, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
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
        console.error("Failed to initialize consent:", error);
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
      console.error("Failed to save consent:", error);
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
            Caricamento...
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
              {isReconsent ? "Termini Aggiornati" : "Benvenuto in MirrorBuddy!"}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {isReconsent
                ? "I nostri termini sono stati aggiornati"
                : "Privacy, cookie e termini di servizio"}
            </p>
          </div>
        </div>

        {/* Re-consent notice */}
        {isReconsent && existingConsent && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Ultima accettazione:</strong>{" "}
              {new Date(existingConsent.tos.acceptedAt).toLocaleDateString(
                "it-IT",
              )}
              <br />
              <strong>Cosa è cambiato:</strong> Abbiamo aggiornato i Termini di
              Servizio. Per continuare, leggi e accetta i nuovi termini.
            </p>
          </div>
        )}

        {/* Summary */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            In breve:
          </h2>
          <div className="grid gap-3">
            <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <Shield className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  Privacy e sicurezza
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  I tuoi dati sono protetti secondo GDPR e COPPA
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <Cookie className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  Cookie essenziali
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Necessari per il funzionamento (sessione, preferenze)
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <FileText className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  Termini di servizio
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  MirrorBuddy è gratuito, l&apos;AI può sbagliare, usa con un
                  adulto se hai meno di 14 anni
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
            Termini completi
            <ExternalLink className="w-3 h-3" />
          </Link>
          <span className="text-slate-300 dark:text-slate-600">•</span>
          <Link
            href="/privacy"
            target="_blank"
            rel="noopener"
            className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
          >
            Privacy Policy
            <ExternalLink className="w-3 h-3" />
          </Link>
          <span className="text-slate-300 dark:text-slate-600">•</span>
          <Link
            href="/cookies"
            target="_blank"
            rel="noopener"
            className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
          >
            Cookie Policy
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
              <strong>Ho letto e accetto</strong> i Termini di Servizio e
              l&apos;uso di cookie essenziali (obbligatorio)
            </span>
          </label>

          {/* Analytics toggle (optional) */}
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
            <div>
              <p className="font-medium text-slate-900 dark:text-white text-sm">
                Cookie analitici (opzionale)
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ci aiutano a migliorare MirrorBuddy
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={analyticsEnabled}
              aria-label="Abilita cookie analitici"
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
            !tosAccepted
              ? "Accetta (prima spunta la casella dei termini)"
              : "Accetta e continua"
          }
        >
          {isSubmitting ? "Salvataggio..." : "Accetta e continua"}
        </Button>

        {/* COPPA note */}
        <p className="text-[10px] text-slate-500 dark:text-slate-400 text-center">
          MirrorBuddy è conforme alle normative GDPR e COPPA per la protezione
          dei minori.
        </p>

        {/* Screen reader announcement */}
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {!tosAccepted &&
            "Per continuare, è necessario accettare i Termini di Servizio"}
          {isSubmitting && "Salvataggio in corso..."}
        </div>
      </div>
    </div>
  );
}

export default UnifiedConsentWall;

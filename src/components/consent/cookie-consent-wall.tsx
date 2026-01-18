"use client";

import { useState, useSyncExternalStore } from "react";
import { Cookie, Shield, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  hasConsent,
  saveConsent,
  syncConsentToServer,
} from "@/lib/consent/consent-storage";

interface CookieConsentWallProps {
  children: React.ReactNode;
}

// External store for consent state
const consentSubscribers = new Set<() => void>();
let consentSnapshot = false;

function subscribeToConsent(callback: () => void) {
  consentSubscribers.add(callback);
  return () => consentSubscribers.delete(callback);
}

function getConsentSnapshot() {
  return consentSnapshot;
}

function getServerConsentSnapshot() {
  return false; // Server-side, assume no consent
}

/**
 * Cookie Consent Wall - GDPR Compliant
 *
 * Blocks access to the application until user accepts essential cookies.
 * Required for GDPR/COPPA compliance.
 */
export function CookieConsentWall({ children }: CookieConsentWallProps) {
  // Use useSyncExternalStore to avoid setState-in-effect
  const consented = useSyncExternalStore(
    subscribeToConsent,
    () => {
      // Initialize snapshot on first call
      if (!consentSnapshot) {
        consentSnapshot = hasConsent();
      }
      return getConsentSnapshot();
    },
    getServerConsentSnapshot,
  );
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);

  const handleAccept = async () => {
    const consent = saveConsent(analyticsEnabled);
    await syncConsentToServer(consent);
    // Update external store and notify subscribers
    consentSnapshot = true;
    consentSubscribers.forEach((cb) => cb());
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
              Privacy e Cookie
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              MirrorBuddy rispetta la tua privacy
            </p>
          </div>
        </div>

        {/* Explanation */}
        <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
          <p>
            Per utilizzare MirrorBuddy, devi accettare i cookie essenziali che
            ci permettono di:
          </p>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Mantenere la tua sessione sicura</span>
            </li>
            <li className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Salvare le tue preferenze</span>
            </li>
            <li className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Proteggere i tuoi dati</span>
            </li>
          </ul>
        </div>

        {/* Analytics toggle */}
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

        {/* Accept button */}
        <Button onClick={handleAccept} className="w-full" size="lg">
          Accetta e continua
        </Button>

        {/* Links */}
        <div className="flex items-center justify-center gap-4 text-xs">
          <a
            href="/privacy"
            target="_blank"
            rel="noopener"
            className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
          >
            Privacy Policy
            <ExternalLink className="w-3 h-3" />
          </a>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <a
            href="/cookies"
            target="_blank"
            rel="noopener"
            className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
          >
            Cookie Policy
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* COPPA note */}
        <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center">
          MirrorBuddy e conforme alle normative GDPR e COPPA per la protezione
          dei minori. I tuoi dati sono al sicuro con noi.
        </p>
      </div>
    </div>
  );
}

export default CookieConsentWall;

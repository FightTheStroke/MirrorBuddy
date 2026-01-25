"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  BarChart3,
  LogOut,
  User,
  FileText,
  Cookie,
  CheckCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { csrfFetch } from "@/lib/auth/csrf-client";
import { getUserIdFromCookie } from "@/lib/auth/client-auth";
import {
  getUnifiedConsent,
  saveUnifiedConsent,
  syncUnifiedConsentToServer,
  clearUnifiedConsent,
  type UnifiedConsentData,
} from "@/lib/consent/unified-consent-storage";
import { updateConsentSnapshot } from "@/lib/consent/consent-store";

// Privacy Settings
export function PrivacySettings() {
  const router = useRouter();
  const [version, setVersion] = useState<{
    version: string;
    buildTime: string;
    environment: string;
  } | null>(null);
  // Use lazy initialization to check auth state
  const [isAuthenticated] = useState(() => {
    if (typeof window === "undefined") return false;
    const userId = getUserIdFromCookie();
    return !!userId;
  });
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  // Use lazy initialization to read unified consent from localStorage
  const [consentData, setConsentData] = useState<UnifiedConsentData | null>(
    () => {
      if (typeof window === "undefined") return null;
      return getUnifiedConsent();
    },
  );
  const [analyticsEnabled, setAnalyticsEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    const consent = getUnifiedConsent();
    return consent?.cookies.analytics ?? true;
  });

  useEffect(() => {
    fetch("/api/version")
      .then((res) => res.json())
      .then(setVersion)
      .catch(() => null);
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await csrfFetch("/api/auth/logout", { method: "POST" });
      // Clear local storage
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("mirrorbuddy")) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
      router.push("/welcome");
    } catch {
      setIsLoggingOut(false);
    }
  };

  const handleAnalyticsToggle = async () => {
    const newValue = !analyticsEnabled;
    setAnalyticsEnabled(newValue);
    const consent = saveUnifiedConsent(newValue);
    setConsentData(consent);
    await syncUnifiedConsentToServer(consent);
  };

  const handleReviewConsents = () => {
    // Clear consent to trigger wall again
    clearUnifiedConsent();
    updateConsentSnapshot(false);
    // Reload to show consent wall
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      {/* Account Section - shows when authenticated */}
      {isAuthenticated && (
        <Card data-testid="user-menu">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-500" />
              Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Sei connesso al tuo account MirrorBuddy.
            </p>
            <Button
              variant="outline"
              data-testid="logout-button"
              className="w-full"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              {isLoggingOut ? "Disconnessione..." : "Disconnetti"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Consent Management Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            Consensi e Termini
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {consentData ? (
            <>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Stato dei tuoi consensi e termini accettati.
              </p>

              {/* TOS Status */}
              <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    Termini di Servizio
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Accettati il{" "}
                    {new Date(consentData.tos.acceptedAt).toLocaleDateString(
                      "it-IT",
                      {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      },
                    )}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                    Versione: {consentData.tos.version}
                  </p>
                </div>
              </div>

              {/* Cookie Status */}
              <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <Cookie className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    Cookie e Privacy
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Accettati il{" "}
                    {new Date(
                      consentData.cookies.acceptedAt,
                    ).toLocaleDateString("it-IT", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                    Cookie essenziali: ✓ | Cookie analitici:{" "}
                    {consentData.cookies.analytics ? "✓" : "✗"}
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={handleReviewConsents}
              >
                Rivedi e modifica consensi
              </Button>
            </>
          ) : (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Nessun consenso trovato. Riceverai la richiesta al prossimo
              accesso.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-500" />
            Privacy e Sicurezza
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-600 dark:text-slate-400">
            I tuoi dati sono al sicuro. MirrorBuddy e progettato pensando alla
            privacy dei bambini e rispetta le normative COPPA e GDPR.
          </p>

          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
            <h4 className="font-medium text-green-700 dark:text-green-300 mb-2">
              I tuoi dati sono protetti
            </h4>
            <ul className="text-sm text-green-600 dark:text-green-400 space-y-1">
              <li>I dati sono memorizzati localmente sul dispositivo</li>
              <li>Nessun dato viene condiviso con terze parti</li>
              <li>Le conversazioni non vengono registrate</li>
              <li>Puoi eliminare i tuoi dati in qualsiasi momento</li>
            </ul>
          </div>

          <Button
            variant="outline"
            className="w-full text-red-600 border-red-200 hover:bg-red-50"
            onClick={async () => {
              const confirmed = window.confirm(
                "Sei sicuro di voler eliminare tutti i tuoi dati? Questa azione non può essere annullata.",
              );
              if (confirmed) {
                // Clear all localStorage data
                const keysToRemove = [];
                for (let i = 0; i < localStorage.length; i++) {
                  const key = localStorage.key(i);
                  if (key?.startsWith("mirrorbuddy")) {
                    keysToRemove.push(key);
                  }
                }
                keysToRemove.forEach((key) => localStorage.removeItem(key));

                // Also clear any other app-specific keys
                localStorage.removeItem("voice-session");
                localStorage.removeItem("accessibility-settings");

                // Delete all data from database (primary data source)
                try {
                  await csrfFetch("/api/user/data", { method: "DELETE" });
                } catch {
                  // Continue even if API fails - user will be logged out anyway
                }

                // Reload to reset state
                window.location.reload();
              }
            }}
          >
            Elimina tutti i miei dati
          </Button>
        </CardContent>
      </Card>

      {/* Telemetry Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            Telemetria e Analisi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            I dati anonimi ci aiutano a migliorare MirrorBuddy. Nessun dato
            personale viene raccolto.
          </p>

          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
            <div>
              <p className="font-medium text-slate-900 dark:text-white text-sm">
                Invia dati anonimi
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Statistiche di utilizzo anonime
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-label="Toggle analytics"
              aria-checked={analyticsEnabled}
              onClick={handleAnalyticsToggle}
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
        </CardContent>
      </Card>

      {/* Version Info */}
      <Card>
        <CardHeader>
          <CardTitle>Informazioni App</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Versione</span>
            <span className="font-mono">
              {version ? `v${version.version}` : "Loading..."}
            </span>
          </div>
          {version?.environment === "development" && (
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-slate-500">Ambiente</span>
              <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded text-xs">
                Development
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

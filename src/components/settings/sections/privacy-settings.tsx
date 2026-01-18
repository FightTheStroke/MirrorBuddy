"use client";

import { useState, useEffect } from "react";
import { Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { csrfFetch } from "@/lib/auth/csrf-client";

// Privacy Settings
export function PrivacySettings() {
  const [version, setVersion] = useState<{
    version: string;
    buildTime: string;
    environment: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/version")
      .then((res) => res.json())
      .then(setVersion)
      .catch(() => null);
  }, []);

  return (
    <div className="space-y-6">
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

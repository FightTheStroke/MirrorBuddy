"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProviderSettings } from "./ai-provider-settings/hooks/use-provider-settings";
import { ProviderStatusCard } from "./ai-provider-settings/components/provider-status-card";
import { ProviderSelection } from "./ai-provider-settings/components/provider-selection";
import { EnvVarsSection } from "./ai-provider-settings/components/env-vars-section";
import { CostConfigForm } from "./ai-provider-settings/components/cost-config-form";
import { CostsSection } from "./ai-provider-settings/components/costs-section";

export function AIProviderSettings() {
  const {
    providerStatus,
    costs,
    forecast,
    loadingCosts,
    costsConfigured,
    showEnvDetails,
    setShowEnvDetails,
    preferredProvider,
    setPreferredProvider,
    saveCostConfig,
  } = useProviderSettings();

  const [showCostConfig, setShowCostConfig] = useState(false);

  return (
    <div className="space-y-6">
      <ProviderStatusCard providerStatus={providerStatus} />

      {providerStatus && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <ProviderSelection
              providerStatus={providerStatus}
              preferredProvider={preferredProvider}
              onSelectProvider={setPreferredProvider}
              onResetToAuto={() => setPreferredProvider("auto")}
            />

            {!providerStatus.activeProvider && (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                <h4 className="font-medium text-amber-700 dark:text-amber-300">
                  Nessun provider configurato
                </h4>
                <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                  Configura Azure OpenAI nel file .env oppure avvia Ollama
                  localmente.
                </p>
              </div>
            )}

            <EnvVarsSection
              providerStatus={providerStatus}
              showEnvDetails={showEnvDetails}
              onToggle={() => setShowEnvDetails(!showEnvDetails)}
            />
          </CardContent>
        </Card>
      )}

      {providerStatus?.activeProvider === "azure" && (
        <CostsSection
          costs={costs}
          forecast={forecast}
          loadingCosts={loadingCosts}
          costsConfigured={costsConfigured}
          onShowConfig={() => setShowCostConfig(true)}
        />
      )}

      {showCostConfig && (
        <Card>
          <CardHeader>
            <CardTitle>Configurazione Costi Azure</CardTitle>
          </CardHeader>
          <CardContent>
            <CostConfigForm onSave={saveCostConfig} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Funzionalita Voce</CardTitle>
        </CardHeader>
        <CardContent>
          {providerStatus?.azure.realtimeConfigured ? (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-3 h-3 rounded-full bg-green-500" />
                <span className="font-medium text-green-700 dark:text-green-300">
                  Voce disponibile
                </span>
              </div>
              <p className="text-sm text-green-600 dark:text-green-400">
                Azure OpenAI Realtime: {providerStatus.azure.realtimeModel}
              </p>
            </div>
          ) : (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="font-medium text-amber-700 dark:text-amber-300">
                  Voce non disponibile
                </span>
              </div>
              <p className="text-sm text-amber-600 dark:text-amber-400 mb-2">
                Le conversazioni vocali richiedono Azure OpenAI Realtime.
              </p>
              <p className="text-xs text-slate-500">
                Configura: AZURE_OPENAI_REALTIME_ENDPOINT,
                AZURE_OPENAI_REALTIME_API_KEY, AZURE_OPENAI_REALTIME_DEPLOYMENT
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-500" />
            Ricerca Web
          </CardTitle>
        </CardHeader>
        <CardContent>
          {providerStatus?.services?.braveSearch?.configured ? (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-3 h-3 rounded-full bg-green-500" />
                <span className="font-medium text-green-700 dark:text-green-300">
                  Ricerca Web attiva
                </span>
              </div>
              <p className="text-sm text-green-600 dark:text-green-400">
                Brave Search API configurata. I maestri possono accedere a
                notizie e informazioni in tempo reale.
              </p>
            </div>
          ) : (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="font-medium text-amber-700 dark:text-amber-300">
                  Ricerca Web limitata
                </span>
              </div>
              <p className="text-sm text-amber-600 dark:text-amber-400 mb-2">
                I maestri usano Wikipedia come fonte. Per notizie e informazioni
                aggiornate, configura Brave Search.
              </p>
              <p className="text-xs text-slate-500">
                Ottieni una API key gratuita su{" "}
                <a
                  href="https://brave.com/search/api/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  brave.com/search/api
                </a>{" "}
                e aggiungi: BRAVE_SEARCH_API_KEY
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

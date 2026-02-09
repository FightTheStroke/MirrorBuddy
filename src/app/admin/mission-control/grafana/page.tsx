"use client";

import { useEffect, useState } from "react";
import { AlertCircle, BarChart3, ExternalLink, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type {
  GrafanaConfig,
  GrafanaPanel,
} from "@/lib/admin/grafana-embed-types";
import { useTranslations } from "next-intl";

export const dynamic = "force-dynamic";

interface GrafanaPageState {
  config: GrafanaConfig | null;
  panels: GrafanaPanel[] | null;
  loading: boolean;
  error: string | null;
}

export default function GrafanaPage() {
  const t = useTranslations("admin");
  const [state, setState] = useState<GrafanaPageState>({
    config: null,
    panels: null,
    loading: true,
    error: null,
  });

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchGrafanaData = async () => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        const response = await fetch("/api/admin/grafana");

        if (!response.ok) {
          throw new Error(
            `Failed to fetch Grafana config: ${response.statusText}`,
          );
        }

        const { data } = await response.json();
        setState({
          config: data.config,
          panels: data.panels,
          loading: false,
          error: null,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setState((prev) => ({
          ...prev,
          loading: false,
          error: message,
        }));
      }
    };

    fetchGrafanaData();
  }, [refreshKey]);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  if (state.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 mb-4 text-gray-400 mx-auto" />
          <p className="text-gray-600">{t("loadingGrafanaConfiguration")}</p>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-900">
              <AlertCircle className="w-5 h-5" />
              {t("configurationError")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-red-800">
            <p>{state.error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!state.config?.configured) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <AlertCircle className="w-5 h-5" />
              {t("grafanaNotConfigured")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-blue-800 space-y-4">
            <p>
              {t("grafanaCloudIntegrationIsNotConfiguredToEnableMiss")}

            </p>
            <ol className="list-decimal list-inside space-y-2">
              <li>{t("setupGrafanaCloud")}</li>
              <li>{t("configureEnvVars")}</li>
            </ol>
            <pre className="bg-blue-100 p-4 rounded text-xs overflow-auto">
              {`GRAFANA_CLOUD_PROMETHEUS_URL=https://...
GRAFANA_CLOUD_PROMETHEUS_USER=...
GRAFANA_CLOUD_API_KEY=...`}
            </pre>
            <p className="text-sm">
              {t("forDetailsSee")}{" "}
              <code className="bg-blue-100 px-2 py-1 rounded">
                {t("docsOperationsRunbookMd")}
              </code>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state.config?.configured && !state.config?.reachable) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-900">
              <AlertCircle className="w-5 h-5" />
              {t("grafanaConfiguredButUnreachable")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-yellow-800 space-y-4">
            <p>
              {t("grafanaCloudIsConfiguredButCurrentlyUnreachableThi")}

            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>{t("networkConnectivityIssues")}</li>
              <li>{t("grafanaCloudTemporarilyUnavailable")}</li>
              <li>{t("invalidCredentialsOrExpiredApiKey")}</li>
              <li>{t("firewallOrProxyBlockingRequests")}</li>
            </ul>
            <div className="pt-2">
              <Button
                onClick={handleRefresh}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                {t("retryConnection")}
              </Button>
            </div>
            <p className="text-sm">
              {t("configuration")}{" "}
              <code className="bg-yellow-100 px-2 py-1 rounded">
                {state.config.orgSlug}{t("grafanaNet")}
              </code>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {t("grafanaDashboards")}
          </h1>
          <p className="text-gray-600 mt-2">
            {t("realTimeObservabilityFromGrafanaCloud")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            {t("refresh")}
          </Button>
          {state.config?.dashboardUrl && (
            <Button asChild variant="outline" size="sm" className="gap-2">
              <a
                href={state.config.dashboardUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-4 h-4" />
                {t("openInGrafana")}
              </a>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {state.panels?.map((panel) => (
          <Card key={panel.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                {panel.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="rounded bg-gray-50 overflow-hidden"
                style={{ height: `${panel.height}px` }}
              >
                <iframe
                  src={panel.embedUrl}
                  className="w-full h-full border-0"
                  title={panel.title}
                  sandbox="allow-scripts allow-same-origin"
                  loading="lazy"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-xs text-gray-500">
        <p>
          {t("panelsAutoRefreshEvery60SecondsConfigurableInGrafa")}
          {t("updated")}
        </p>
      </div>
    </div>
  );
}

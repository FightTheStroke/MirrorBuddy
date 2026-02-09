/**
 * Infrastructure Panel Page
 * Real-time monitoring of Vercel, Supabase, and Redis
 */

"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertCircle, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { InfraMetrics } from "@/lib/admin/infra-panel-types";
import { VercelCard } from "./components";
import { SupabaseCard, RedisCard } from "./service-cards";
import { useTranslations } from "next-intl";

export const dynamic = "force-dynamic";

/**
 * Not Configured Card Component
 */
function NotConfiguredCard({
  serviceName,
  envVars,
  isError = false,
}: {
  serviceName: string;
  envVars: { name: string; optional?: boolean }[];
  isError?: boolean;
}) {
  const t = useTranslations("admin");
  return (
    <div className="space-y-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-5 w-5 text-yellow-600 dark:text-yellow-500" />
        <div className="flex-1">
          <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">
            {isError
              ? `${serviceName} Connection Error`
              : `${serviceName} Not Configured`}
          </h3>
          {!isError && (
            <>
              <p className="mt-1 text-sm text-yellow-800 dark:text-yellow-200">
                {t("requiredEnvironmentVariables")}
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                {envVars.map((envVar) => (
                  <li
                    key={envVar.name}
                    className="font-mono text-yellow-900 dark:text-yellow-100"
                  >
                    • {envVar.name}
                    {envVar.optional && (
                      <span className="ml-2 text-xs text-yellow-700 dark:text-yellow-300">
                        {t("optional")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
          {isError && (
            <p className="mt-1 text-sm text-yellow-800 dark:text-yellow-200">
              {t("databaseConnectionFailedCheckLogsForDetails")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InfrastructurePage() {
  const t = useTranslations("admin");
  const [metrics, setMetrics] = useState<InfraMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/admin/infra-panel");
      if (!response.ok) {
        throw new Error("Failed to fetch infrastructure metrics");
      }
      const result = await response.json();
      setMetrics(result.data);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchMetrics();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      void fetchMetrics();
    }, 30_000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    void fetchMetrics();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("infrastructure")}</h1>
          <p className="text-muted-foreground">
            {t("realTimeMonitoringOfExternalServices")}
          </p>
          {lastUpdate && (
            <p className="text-sm text-muted-foreground mt-1">
              {t("lastUpdated")} {lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </div>
        <Button onClick={handleRefresh} disabled={loading} variant="outline">
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          {t("refresh")}
        </Button>
      </div>

      {loading && !metrics && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-4 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {metrics && (
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
          {/* Vercel */}
          <Card>
            <CardHeader>
              <CardTitle>Vercel</CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.vercel ? (
                <VercelCard metrics={metrics.vercel} />
              ) : (
                <NotConfiguredCard
                  serviceName="Vercel"
                  envVars={[
                    { name: "VERCEL_TOKEN" },
                    { name: "VERCEL_TEAM_ID", optional: true },
                  ]}
                />
              )}
            </CardContent>
          </Card>

          {/* Supabase */}
          <Card>
            <CardHeader>
              <CardTitle>{t("supabase1")}</CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.supabase ? (
                <SupabaseCard metrics={metrics.supabase} />
              ) : (
                <NotConfiguredCard
                  serviceName="Supabase"
                  envVars={[]}
                  isError={true}
                />
              )}
            </CardContent>
          </Card>

          {/* Redis */}
          <Card>
            <CardHeader>
              <CardTitle>{t("redis1")}</CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.redis ? (
                <RedisCard metrics={metrics.redis} />
              ) : (
                <NotConfiguredCard
                  serviceName="Redis"
                  envVars={[
                    { name: "KV_REST_API_URL" },
                    { name: "KV_REST_API_TOKEN" },
                  ]}
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Additional Info */}
      {metrics && (
        <Card>
          <CardHeader>
            <CardTitle>{t("serviceHealthSummary")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>{t("vercel")}</span>
                <span
                  className={
                    metrics.vercel?.status === "healthy"
                      ? "text-green-600"
                      : "text-yellow-600"
                  }
                >
                  {metrics.vercel?.status || "unknown"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>{t("supabase")}</span>
                <span
                  className={
                    metrics.supabase?.status === "healthy"
                      ? "text-green-600"
                      : "text-yellow-600"
                  }
                >
                  {metrics.supabase?.status || "unknown"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>{t("redis")}</span>
                <span
                  className={
                    metrics.redis?.status === "healthy"
                      ? "text-green-600"
                      : "text-yellow-600"
                  }
                >
                  {metrics.redis?.status || "unknown"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

"use client";

/**
 * AI/Email Monitoring Page
 * Displays Azure OpenAI, Sentry, and Resend metrics
 */

import { useEffect, useState } from "react";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { AIEmailMetrics } from "@/lib/admin/ai-email-types";
import { AzureOpenAICard, SentryCard, ResendCard } from "./components";
import { useTranslations } from "next-intl";

export const dynamic = "force-dynamic";

export default function AIEmailMonitoringPage() {
  const t = useTranslations("admin");
  const [metrics, setMetrics] = useState<AIEmailMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/admin/ai-email", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setMetrics(data.data);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <p className="text-lg font-semibold">{t("failedToLoadMetrics")}</p>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button onClick={fetchMetrics} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          {t("retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("aiEmailMonitoring")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("lastUpdated")} {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <Button onClick={fetchMetrics} variant="outline" disabled={loading}>
          <RefreshCw
            className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          {t("refresh")}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {metrics?.azureOpenAI && (
          <AzureOpenAICard metrics={metrics.azureOpenAI} />
        )}
        {metrics?.sentry && <SentryCard metrics={metrics.sentry} />}
        {metrics?.resend && <ResendCard metrics={metrics.resend} />}
      </div>

      {!metrics?.azureOpenAI && !metrics?.sentry && !metrics?.resend && (
        <Card>
          <CardHeader>
            <CardTitle>{t("noDataAvailable")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t("configureEnvironmentVariablesToEnableMonitoringAzu")}

            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

"use client";

/**
 * Business KPI Dashboard Page
 * Shows revenue, users, countries, and top maestri metrics
 */

import { useState, useEffect } from "react";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import type { BusinessKPIResponse } from "@/lib/admin/business-kpi-types";
import { RevenueCard } from "./revenue-card";
import { UsersCard } from "./users-card";
import { CountriesTable, MaestriTable } from "./tables";
import { useTranslations } from "next-intl";

export const dynamic = "force-dynamic";

export default function BusinessKPIPage() {
  const t = useTranslations("admin");
  const [data, setData] = useState<BusinessKPIResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchKPIs = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/admin/business-kpi", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      setData(result.data);
      setLastRefresh(new Date());
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load KPIs";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKPIs();

    const interval = setInterval(() => {
      fetchKPIs();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>{t("loadingBusinessKpis")}</span>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span>{t("error")} {error}</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("businessKpis")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("revenueUsersAndEngagementMetrics")}
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{t("lastUpdated")} {lastRefresh.toLocaleTimeString()}</span>
          <button
            onClick={fetchKPIs}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md border hover:bg-accent transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {t("refresh")}
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <RevenueCard revenue={data.revenue} />
        <UsersCard users={data.users} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <CountriesTable countries={data.topCountries} />
        <MaestriTable maestri={data.topMaestri} />
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-md bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>{t("failedToRefresh")} {error}</span>
        </div>
      )}
    </div>
  );
}

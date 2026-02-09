/**
 * Cost Overview Card
 * Shows aggregated cost data from /api/admin/cost-tracking
 * Plan 105 - W5-Alerting [T5-06]
 */

"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, AlertTriangle } from "lucide-react";
import type { CostDashboardData } from "@/lib/ops/cost-tracker";
import { useTranslations } from "next-intl";

export function CostOverviewCard() {
  const t = useTranslations("admin");
  const [data, setData] = useState<CostDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCosts() {
      try {
        const res = await fetch("/api/admin/cost-tracking");
        if (!res.ok) throw new Error("Failed to fetch costs");
        setData((await res.json()) as CostDashboardData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
      }
    }
    void fetchCosts();
    const interval = setInterval(() => void fetchCosts(), 60_000);
    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {t("costOverview2")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {t("costOverview1")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("loadingCosts")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          {t("costOverview")}
          {data.alerts.length > 0 && (
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold">
            &euro;{data.totalMonthly.toFixed(2)}
          </span>
          <span className="text-sm text-muted-foreground">
            / &euro;{data.totalBudget} {t("monthlyBudget")}
          </span>
        </div>

        <div className="space-y-2">
          {data.services.map((svc) => (
            <div key={svc.service} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span>{svc.service}</span>
                <span className="font-medium">
                  &euro;{svc.estimatedMonthlyCost.toFixed(2)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div
                  className={`h-2 rounded-full ${getBarColor(svc.status)}`}
                  style={{
                    width: `${Math.min(svc.budgetUsagePercent, 100)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {data.alerts.length > 0 && (
          <div className="space-y-1 rounded border border-yellow-200 bg-yellow-50 p-2 dark:border-yellow-900 dark:bg-yellow-950">
            {data.alerts.map((alert, i) => (
              <p
                key={i}
                className="text-xs text-yellow-700 dark:text-yellow-300"
              >
                {alert.message}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getBarColor(status: string): string {
  if (status === "exceeded") return "bg-red-500";
  if (status === "warning") return "bg-yellow-500";
  return "bg-green-500";
}

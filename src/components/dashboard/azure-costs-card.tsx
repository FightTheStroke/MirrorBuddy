/**
 * Azure Costs Card Component
 * Displays Azure subscription costs if API is available
 * Shows monthly forecast and breakdown by service
 */

"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { DollarSign, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";

interface CostSummary {
  totalCost: number;
  currency: string;
  periodStart: string;
  periodEnd: string;
  costsByService: Array<{
    serviceName: string;
    cost: number;
  }>;
}

interface CostForecast {
  estimatedTotal: number;
  currency: string;
  forecastPeriodEnd: string;
}

interface AzureCostsCardProps {
  className?: string;
}

export function AzureCostsCard({ className }: AzureCostsCardProps) {
  const t = useTranslations("admin.dashboard");
  const [summary, setSummary] = useState<CostSummary | null>(null);
  const [forecast, setForecast] = useState<CostForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [configured, setConfigured] = useState(true);

  useEffect(() => {
    const fetchCosts = async () => {
      try {
        setLoading(true);
        setError(null);

        const [summaryRes, forecastRes] = await Promise.all([
          fetch("/api/azure/costs?days=30&type=summary"),
          fetch("/api/azure/costs?type=forecast"),
        ]);

        if (summaryRes.status === 503) {
          const data = await summaryRes.json();
          setConfigured(data.configured === false);
          setError("Azure authentication not configured");
          return;
        }

        if (summaryRes.ok) {
          const data = await summaryRes.json();
          setSummary(data);
        }

        if (forecastRes.ok) {
          const data = await forecastRes.json();
          setForecast(data);
        }
      } catch (err) {
        logger.error("Failed to fetch Azure costs", { error: String(err) });
        setError(t("loadingError"));
      } finally {
        setLoading(false);
      }
    };

    fetchCosts();
  }, [t]);

  if (!configured) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            {t("azureCosts")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-slate-500">
            <p className="text-sm">{t("notAvailable")}</p>
            <p className="text-xs mt-2">{t("authNotConfigured")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            {t("azureCosts")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-slate-500">
            <p className="text-sm">{t("loading")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            {t("azureCosts")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-500">
            <p className="text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const topServices = summary?.costsByService.slice(0, 3) || [];

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          {t("azureCosts")}
        </CardTitle>
        {summary && (
          <p className="text-xs text-slate-500">
            {new Date(summary.periodStart).toLocaleDateString("it-IT")} -{" "}
            {new Date(summary.periodEnd).toLocaleDateString("it-IT")}
          </p>
        )}
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Current month costs */}
          {summary && (
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  {t("last30Days")}
                </span>
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  ${summary.totalCost.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Monthly forecast */}
          {forecast && (
            <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-sm font-medium text-purple-900 dark:text-purple-100">
                    {t("monthlyForecast")}
                  </span>
                </div>
                <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  ${forecast.estimatedTotal.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Top services */}
          {topServices.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 mb-2">
                {t("topServices")}
              </h4>
              <div className="space-y-2">
                {topServices.map((service, index) => (
                  <div
                    key={service.serviceName}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-slate-600 dark:text-slate-400 truncate flex-1">
                      {index + 1}. {service.serviceName}
                    </span>
                    <span className="font-medium text-slate-900 dark:text-slate-100 ml-2">
                      ${service.cost.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

/**
 * Revenue metrics card component
 */

import { TrendingUp, AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { RevenueMetrics } from "@/lib/admin/business-kpi-types";
import { useTranslations } from "next-intl";

interface RevenueCardProps {
  revenue: RevenueMetrics;
}

export function RevenueCard({ revenue }: RevenueCardProps) {
  const t = useTranslations("admin");
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: revenue.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const isPositiveGrowth =
    revenue.growthRate !== null && revenue.growthRate >= 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t("revenue")}</CardTitle>
          <div className="flex items-center gap-2">
            {revenue.isEstimated && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                <AlertTriangle className="h-3 w-3" />
                {t("estimated")}
              </span>
            )}
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
        <CardDescription>{t("monthlyAndAnnualRecurringRevenue")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium text-muted-foreground">MRR</div>
            <div className="text-2xl font-bold mt-1">
              {formatCurrency(revenue.mrr)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {t("monthlyRecurring")}
            </div>
          </div>

          <div>
            <div className="text-sm font-medium text-muted-foreground">ARR</div>
            <div className="text-2xl font-bold mt-1">
              {formatCurrency(revenue.arr)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {t("annualRecurring")}
            </div>
          </div>
        </div>

        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground">
              {t("growthRate")}
            </div>
            {revenue.growthRate === null ? (
              <div
                className="text-sm font-medium text-muted-foreground"
                title={t("insufficientHistoricalData")}
              >
                N/A
              </div>
            ) : (
              <div
                className={`flex items-center gap-1 text-sm font-medium ${
                  isPositiveGrowth ? "text-green-600" : "text-red-600"
                }`}
              >
                <span>
                  {isPositiveGrowth ? "+" : ""}
                  {revenue.growthRate.toFixed(1)}%
                </span>
                <TrendingUp className="h-4 w-4" />
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground">
              {t("totalRevenue")}
            </div>
            {revenue.totalRevenue === null ? (
              <div
                className="text-lg font-medium text-muted-foreground"
                title={t("requiresStripeIntegration")}
              >
                N/A
              </div>
            ) : (
              <div className="text-lg font-bold">
                {formatCurrency(revenue.totalRevenue)}
              </div>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {t("allTimeRevenue")}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

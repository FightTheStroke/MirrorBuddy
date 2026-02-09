"use client";

import { Cloud } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import type { ExternalServicesData } from "../types";
import { useTranslations } from "next-intl";

export function ExternalServicesCard({
  data,
}: {
  data: ExternalServicesData | null;
}) {
  const t = useTranslations("admin");
  return (
    <Card
      className={
        data?.summary.hasAlerts ? "border-amber-200 dark:border-amber-800" : ""
      }
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Cloud className="h-4 w-4 text-purple-500" />
          {t("externalServices")}
          {data?.summary.hasAlerts && (
            <span className="ml-2 px-2 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 rounded-full">
              {data.summary.criticalCount + data.summary.warningCount} {t("alerts")}
            </span>
          )}
        </CardTitle>
        <CardDescription className="text-xs">
          {t("apiUsageQuotasForAzureOpenaiGoogleDriveBraveSearch")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {data?.summary.alertDetails && data.summary.alertDetails.length > 0 && (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg space-y-1">
            <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
              {t("quotaAlerts")}
            </p>
            {data.summary.alertDetails.map((alert, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-[10px]"
              >
                <span className="text-amber-700 dark:text-amber-300">
                  {alert.service}: {alert.metric}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded-full ${
                    alert.status === "critical" || alert.status === "exceeded"
                      ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                  }`}
                >
                  {alert.usagePercent.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        )}
        {data?.byService &&
          Object.entries(data.byService).map(([service, metrics]) => (
            <div key={service} className="space-y-1.5">
              <p className="text-xs font-medium text-slate-900 dark:text-white">
                {service}
              </p>
              {metrics.map((m, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        m.status === "exceeded"
                          ? "bg-red-500"
                          : m.status === "critical"
                            ? "bg-red-400"
                            : m.status === "warning"
                              ? "bg-amber-400"
                              : "bg-green-400"
                      }`}
                      style={{
                        width: `${Math.min(m.usagePercent, 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 w-20 text-right">
                    {m.metric}
                  </span>
                  <span className="text-[10px] font-mono w-12 text-right">
                    {m.usagePercent.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          ))}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
          {/* eslint-disable local-rules/no-literal-strings-in-jsx */}
          <p className="text-[10px] text-slate-400">
            Azure {data?.quotas.azureOpenAI.chatTpm.toLocaleString()} TPM · Drive {data?.quotas.googleDrive.queriesPerMin.toLocaleString()}/min · Brave {data?.quotas.braveSearch.monthlyQueries.toLocaleString()}{t("month")}
          </p>
          {/* eslint-enable local-rules/no-literal-strings-in-jsx */}
        </div>
      </CardContent>
    </Card>
  );
}

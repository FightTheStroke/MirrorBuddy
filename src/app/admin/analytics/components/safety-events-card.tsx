"use client";

import { ShieldAlert } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import type { SafetyEventsData } from "../types";
import { useTranslations } from "next-intl";

export function SafetyEventsCard({ data }: { data: SafetyEventsData | null }) {
  const t = useTranslations("admin");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <ShieldAlert className="h-4 w-4 text-red-500" />
          {t("safetyEvents")}
        </CardTitle>
        <CardDescription className="text-xs">
          {t("contentModerationAndSafetyMonitoring")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <p className="text-xl font-bold text-slate-900 dark:text-white">
              {data?.summary.totalEvents ?? 0}
            </p>
            <p className="text-[10px] text-slate-500">{t("total")}</p>
          </div>
          <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <p className="text-xl font-bold text-amber-600">
              {data?.summary.unresolvedCount ?? 0}
            </p>
            <p className="text-[10px] text-slate-500">{t("unresolved")}</p>
          </div>
          <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-xl font-bold text-red-600">
              {data?.summary.criticalCount ?? 0}
            </p>
            <p className="text-[10px] text-slate-500">{t("critical")}</p>
          </div>
        </div>
        {data?.bySeverity && Object.keys(data.bySeverity).length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500">{t("bySeverity")}</p>
            {Object.entries(data.bySeverity).map(([severity, count]) => (
              <div
                key={severity}
                className="flex items-center justify-between text-xs"
              >
                <span
                  className={`capitalize ${
                    severity === "critical"
                      ? "text-red-600"
                      : severity === "alert"
                        ? "text-amber-600"
                        : severity === "warning"
                          ? "text-yellow-600"
                          : "text-slate-600"
                  }`}
                >
                  {severity}
                </span>
                <span className="font-mono">{count}</span>
              </div>
            ))}
          </div>
        )}
        {data?.recentEvents && data.recentEvents.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500">{t("recent")}</p>
            {data.recentEvents.slice(0, 5).map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between text-[10px] py-0.5 border-b border-slate-100 dark:border-slate-800"
              >
                <span className="text-slate-500">{event.type}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full ${
                    event.resolved
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  }`}
                >
                  {event.resolved ? "Resolved" : "Open"}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

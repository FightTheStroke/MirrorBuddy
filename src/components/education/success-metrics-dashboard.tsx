"use client";

import { useMemo, useEffect } from "react";
import { useMethodProgressStore } from "@/lib/stores/method-progress-store";
import { useTranslations } from "next-intl";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccessibilityStore } from "@/lib/accessibility/accessibility-store";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import type { SuccessMetricsData } from "./success-metrics-dashboard/types";
import { EmptyMetricsState } from "./success-metrics-dashboard/components/empty-state";
import { MetricCard } from "./success-metrics-dashboard/components/metric-card";
import { MilestoneItem } from "./success-metrics-dashboard/components/milestone-item";
import { transformMethodProgressToMetrics } from "./success-metrics-dashboard/utils/transform";

interface SuccessMetricsDashboardProps {
  studentId?: string;
  studentName?: string;
  data?: SuccessMetricsData;
  className?: string;
}

export function SuccessMetricsDashboard({
  studentId,
  studentName = "Studente",
  data,
  className,
}: SuccessMetricsDashboardProps) {
  const t = useTranslations("education.success-metrics");
  const { settings } = useAccessibilityStore();
  const methodProgress = useMethodProgressStore();

  useEffect(() => {
    if (studentId && !methodProgress.userId) {
      methodProgress.setUserId(studentId);
    }
  }, [studentId, methodProgress]);

  const metricsData = useMemo(() => {
    if (data) return data;
    if (methodProgress.userId) {
      return transformMethodProgressToMetrics(methodProgress, studentName);
    }
    return null;
  }, [data, methodProgress, studentName]);

  const achievedMilestones = useMemo(
    () => metricsData?.milestones.filter((m) => m.achievedAt) ?? [],
    [metricsData],
  );

  const pendingMilestones = useMemo(
    () => metricsData?.milestones.filter((m) => !m.achievedAt) ?? [],
    [metricsData],
  );

  if (!metricsData) {
    return (
      <div
        className={cn(
          "p-6",
          settings.highContrast ? "bg-black" : "bg-slate-50 dark:bg-slate-950",
          className,
        )}
      >
        <EmptyMetricsState />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "p-6 space-y-6",
        settings.highContrast ? "bg-black" : "bg-slate-50 dark:bg-slate-950",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <h1
            className={cn(
              "text-2xl font-bold",
              settings.highContrast
                ? "text-yellow-400"
                : "text-slate-900 dark:text-white",
            )}
          >
            {t("title")}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("progressDescription", { studentName: metricsData.studentName })}
          </p>
        </div>
        <div
          className={cn(
            "text-center p-4 rounded-xl",
            settings.highContrast
              ? "bg-gray-900 border border-yellow-400"
              : "bg-white dark:bg-slate-900 shadow-lg",
          )}
        >
          <div
            className={cn(
              "text-4xl font-bold",
              metricsData.overallScore >= 80
                ? "text-emerald-600"
                : metricsData.overallScore >= 60
                  ? "text-amber-600"
                  : "text-red-600",
            )}
          >
            {metricsData.overallScore}
          </div>
          <div className="text-xs text-slate-500">{t("overallScore")}</div>
        </div>
      </div>

      <Card
        className={cn(
          "border-l-4",
          settings.highContrast
            ? "border-yellow-400 bg-gray-900"
            : "border-blue-500 bg-blue-50 dark:bg-blue-950/30",
        )}
      >
        <CardContent className="py-4">
          <p
            className={cn(
              "italic",
              settings.highContrast
                ? "text-gray-300"
                : "text-slate-700 dark:text-slate-300",
            )}
          >
            &ldquo;{t("quote")}&rdquo;
          </p>
          <p className="text-xs text-slate-500 mt-1">{t("quoteAuthor")}</p>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {metricsData.metrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </div>

      <Card
        className={settings.highContrast ? "border-yellow-400 bg-gray-900" : ""}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy
              className={cn(
                "w-5 h-5",
                settings.highContrast
                  ? "text-yellow-400"
                  : "text-amber-600 dark:text-amber-400",
              )}
            />
            <span className={settings.highContrast ? "text-yellow-400" : ""}>
              {t("milestones")}
            </span>
          </CardTitle>
          <CardDescription>
            {t("milestonesDescription", {
              achieved: achievedMilestones.length,
              pending: pendingMilestones.length,
            })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {achievedMilestones.map((milestone) => (
            <MilestoneItem key={milestone.id} milestone={milestone} />
          ))}

          {pendingMilestones.length > 0 && (
            <>
              <div className="text-xs text-slate-500 pt-2">
                {t("upcomingMilestones")}
              </div>
              {pendingMilestones.map((milestone) => (
                <MilestoneItem key={milestone.id} milestone={milestone} />
              ))}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default SuccessMetricsDashboard;
export type {
  SuccessMetricsData,
  SuccessMetric,
  Milestone,
} from "./success-metrics-dashboard/types";

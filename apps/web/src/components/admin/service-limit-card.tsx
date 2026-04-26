"use client";

import { ReactNode } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { RecommendationSection } from "./recommendation-section";
import type { ServiceRecommendation } from "@/lib/admin/service-recommendations";
import { useTranslations } from "next-intl";

export type MetricStatus = "ok" | "warning" | "critical" | "emergency";

export interface ServiceMetric {
  name: string;
  usage: number;
  limit: number;
  percentage: number;
  status: MetricStatus;
  unit: string;
  period?: string;
}

export interface ServiceLimitCardProps {
  serviceName: string;
  metrics: ServiceMetric[];
  icon: ReactNode;
  recommendation?: ServiceRecommendation | null;
}

const statusConfig = {
  ok: {
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/20",
    progressColor: "bg-green-600",
    icon: CheckCircle,
    label: "Normal",
    alertMessage: "All systems operational",
  },
  warning: {
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/20",
    progressColor: "bg-yellow-600",
    icon: AlertTriangle,
    label: "Warning",
    alertMessage: "Approaching limit",
  },
  critical: {
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-900/20",
    progressColor: "bg-orange-600",
    icon: AlertCircle,
    label: "Critical",
    alertMessage: "Critical usage",
  },
  emergency: {
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/20",
    progressColor: "bg-red-600",
    icon: XCircle,
    label: "Emergency",
    alertMessage: "Emergency: Near capacity",
  },
};

export function ServiceLimitCard({
  serviceName,
  metrics,
  icon,
  recommendation,
}: ServiceLimitCardProps) {
  // Determine overall service status (worst metric status)
  const overallStatus = metrics.reduce((worst, metric) => {
    const statusPriority: Record<MetricStatus, number> = {
      ok: 0,
      warning: 1,
      critical: 2,
      emergency: 3,
    };
    return statusPriority[metric.status] > statusPriority[worst]
      ? metric.status
      : worst;
  }, "ok" as MetricStatus);

  const StatusIcon = statusConfig[overallStatus].icon;

  // Show recommendation only for warning/critical/emergency
  const showRecommendation = recommendation && overallStatus !== "ok";

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
              {icon}
            </div>
            <CardTitle className="text-lg">{serviceName}</CardTitle>
          </div>
          <div
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium",
              statusConfig[overallStatus].bgColor,
              statusConfig[overallStatus].color,
            )}
          >
            <StatusIcon className="h-4 w-4" />
            <span className="hidden sm:inline">
              {statusConfig[overallStatus].label}
            </span>
          </div>
        </div>
      </CardHeader>

      {/* Alert Badge Section */}
      <div
        className={cn(
          "px-6 py-3 border-l-4",
          statusConfig[overallStatus].bgColor,
          statusConfig[overallStatus].color,
          {
            "border-l-green-600 dark:border-l-green-400": overallStatus === "ok",
            "border-l-yellow-600 dark:border-l-yellow-400": overallStatus === "warning",
            "border-l-orange-600 dark:border-l-orange-400": overallStatus === "critical",
            "border-l-red-600 dark:border-l-red-400": overallStatus === "emergency",
          },
        )}
      >
        <div className="flex items-center gap-2">
          <StatusIcon className="h-5 w-5 flex-shrink-0" />
          <span className="font-semibold text-sm">
            {statusConfig[overallStatus].alertMessage}
          </span>
        </div>
      </div>

      <CardContent className="space-y-4">
        {metrics.map((metric, index) => (
          <MetricRow key={index} metric={metric} />
        ))}

        {/* Recommendation section - only visible when status is warning/critical/emergency */}
        {showRecommendation && (
          <RecommendationSection recommendation={recommendation} />
        )}
      </CardContent>
    </Card>
  );
}

interface MetricRowProps {
  metric: ServiceMetric;
}

function MetricRow({ metric }: MetricRowProps) {
  const t = useTranslations("admin");
  const config = statusConfig[metric.status];
  const StatusIcon = config.icon;

  return (
    <div className="space-y-2">
      {/* Metric header */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <StatusIcon className={cn("h-4 w-4", config.color)} />
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {metric.name}
          </span>
          {metric.period && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              ({metric.period})
            </span>
          )}
        </div>
        <span className={cn("font-semibold", config.color)}>
          {metric.percentage.toFixed(1)}%
        </span>
      </div>

      {/* Progress bar */}
      <Progress
        value={metric.percentage}
        max={100}
        className="h-2"
        indicatorClassName={config.progressColor}
      />

      {/* Usage text */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>
          {formatValue(metric.usage, metric.unit)} / {formatValue(metric.limit, metric.unit)}
        </span>
        <span>
          {formatValue(metric.limit - metric.usage, metric.unit)} {t("remaining")}
        </span>
      </div>
    </div>
  );
}

function formatValue(value: number, unit: string): string {
  // Handle different unit types
  switch (unit.toLowerCase()) {
    case "gb":
      return `${value.toFixed(2)} GB`;
    case "mb":
      return `${value.toFixed(1)} MB`;
    case "requests":
      return value.toLocaleString();
    case "tokens":
      return value.toLocaleString();
    case "minutes":
      return `${value.toFixed(1)} min`;
    case "hours":
      return `${value.toFixed(1)} h`;
    case "eur":
    case "euro":
      return `€${value.toFixed(2)}`;
    default:
      return `${value} ${unit}`;
  }
}

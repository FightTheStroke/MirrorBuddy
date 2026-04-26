"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Star } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAccessibilityStore } from "@/lib/accessibility";
import type { SuccessMetric } from "../types";
import { METRIC_ICONS, METRIC_COLORS } from "../constants";
import { useTranslations } from "next-intl";

interface MetricCardProps {
  metric: SuccessMetric;
}

export function MetricCard({ metric }: MetricCardProps) {
  const t = useTranslations("education");
  const { settings } = useAccessibilityStore();
  const Icon = METRIC_ICONS[metric.id];
  const colors = METRIC_COLORS[metric.id];
  const change = metric.currentScore - metric.previousScore;

  const TrendIcon =
    metric.trend === "up"
      ? TrendingUp
      : metric.trend === "down"
        ? TrendingDown
        : Minus;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card
        className={cn(
          "overflow-hidden",
          settings.highContrast
            ? "border-yellow-400 bg-gray-900"
            : colors.border,
        )}
        role="region"
        aria-labelledby={`metric-title-${metric.id}`}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "p-2 rounded-lg",
                  settings.highContrast ? "bg-yellow-400/20" : colors.bg,
                )}
                aria-hidden="true"
              >
                <Icon
                  className={cn(
                    "w-5 h-5",
                    settings.highContrast ? "text-yellow-400" : colors.primary,
                  )}
                />
              </div>
              <div>
                <CardTitle
                  id={`metric-title-${metric.id}`}
                  className={cn(
                    "text-lg",
                    settings.highContrast ? "text-yellow-400" : "",
                  )}
                >
                  {metric.name}
                </CardTitle>
                <CardDescription
                  id={`metric-desc-${metric.id}`}
                  className="text-xs"
                >
                  {metric.description}
                </CardDescription>
              </div>
            </div>
            <div className="text-right">
              <div
                className={cn(
                  "text-3xl font-bold",
                  settings.highContrast
                    ? "text-white"
                    : "text-slate-900 dark:text-white",
                )}
                aria-label={t("currentScore", { score: metric.currentScore })}
              >
                {metric.currentScore}
              </div>
              <div
                className={cn(
                  "flex items-center gap-1 text-xs",
                  change > 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : change < 0
                      ? "text-red-600 dark:text-red-400"
                      : "text-slate-500",
                )}
                aria-label={t("trendAriaLabel", { direction: change > 0 ? t("trendUp") : change < 0 ? t("trendDown") : t("trendStable"), change: Math.abs(change) })}
              >
                <TrendIcon className="w-3 h-3" aria-hidden="true" />
                <span className="sr-only">
                  {change > 0
                    ? "Increase"
                    : change < 0
                      ? "Decrease"
                      : "No change"}{" "}
                  {t("of")}{" "}
                </span>
                {change > 0 ? "+" : ""}
                {change}%
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div
              className={cn(
                "h-2 rounded-full overflow-hidden",
                settings.highContrast
                  ? "bg-gray-800"
                  : "bg-slate-200 dark:bg-slate-700",
              )}
              role="progressbar"
              aria-valuenow={metric.currentScore}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-labelledby={`metric-title-${metric.id}`}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${metric.currentScore}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className={cn(
                  "h-full rounded-full",
                  settings.highContrast ? "bg-yellow-400" : colors.progress,
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {metric.subMetrics.map((sub) => {
              const percentage = Math.min((sub.value / sub.target) * 100, 100);
              const isAchieved = sub.value >= sub.target;

              return (
                <div
                  key={sub.id}
                  className={cn(
                    "p-2 rounded-lg",
                    settings.highContrast
                      ? "bg-gray-800"
                      : "bg-slate-50 dark:bg-slate-800/50",
                  )}
                  role="region"
                  aria-labelledby={`submetric-${sub.id}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      id={`submetric-${sub.id}`}
                      className="text-xs text-slate-500 dark:text-slate-400 truncate font-medium"
                    >
                      {sub.name}
                    </span>
                    {isAchieved && (
                      <Star
                        className="w-3 h-3 text-amber-500 shrink-0"
                        aria-label={t("goalAchieved")}
                      />
                    )}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span
                      className={cn(
                        "text-lg font-semibold",
                        settings.highContrast
                          ? "text-white"
                          : "text-slate-900 dark:text-white",
                      )}
                      aria-label={`${sub.value} out of ${sub.target} ${sub.unit}`}
                    >
                      {sub.value}
                    </span>
                    <span className="text-xs text-slate-500">
                      / {sub.target} {sub.unit}
                    </span>
                  </div>
                  <div
                    className={cn(
                      "h-1 mt-1 rounded-full overflow-hidden",
                      settings.highContrast
                        ? "bg-gray-700"
                        : "bg-slate-200 dark:bg-slate-700",
                    )}
                    role="progressbar"
                    aria-valuenow={sub.value}
                    aria-valuemin={0}
                    aria-valuemax={sub.target}
                    aria-labelledby={`submetric-${sub.id}`}
                  >
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        isAchieved
                          ? "bg-emerald-500"
                          : settings.highContrast
                            ? "bg-yellow-400"
                            : colors.progress,
                      )}
                      style={{ width: `${percentage}%` }}
                      aria-hidden="true"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

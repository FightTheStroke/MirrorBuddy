"use client";

import { motion } from "framer-motion";
import { Lightbulb } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useAccessibilityStore } from "@/lib/accessibility";
import type { LearningStrategy } from "@/types";

interface StrategyCardProps {
  strategy: LearningStrategy;
}

export function StrategyCard({ strategy }: StrategyCardProps) {
  const t = useTranslations("education.parentDashboard.strategy");
  const { settings } = useAccessibilityStore();

  const priorityColors = {
    high: settings.highContrast
      ? "border-yellow-400 bg-yellow-400/10"
      : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30",
    medium: settings.highContrast
      ? "border-gray-400 bg-gray-400/10"
      : "border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30",
    low: settings.highContrast
      ? "border-gray-600 bg-gray-600/10"
      : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900",
  };

  const priorityLabels = {
    high: t("priority.high"),
    medium: t("priority.medium"),
    low: t("priority.low"),
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn("p-4 rounded-lg border", priorityColors[strategy.priority])}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "p-2 rounded-lg shrink-0",
            settings.highContrast
              ? "bg-yellow-400/20"
              : "bg-blue-100 dark:bg-blue-900/30",
          )}
        >
          <Lightbulb
            className={cn(
              "w-5 h-5",
              settings.highContrast
                ? "text-yellow-400"
                : "text-blue-600 dark:text-blue-400",
            )}
          />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4
              className={cn(
                "font-medium",
                settings.highContrast
                  ? "text-white"
                  : "text-slate-900 dark:text-white",
              )}
            >
              {strategy.title}
            </h4>
            <span
              className={cn(
                "text-xs px-2 py-0.5 rounded-full",
                settings.highContrast
                  ? "bg-gray-800 text-yellow-400"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300",
              )}
            >
              {priorityLabels[strategy.priority]}
            </span>
          </div>
          <p
            className={cn(
              "text-sm",
              settings.highContrast
                ? "text-gray-300"
                : "text-slate-600 dark:text-slate-400",
            )}
          >
            {strategy.description}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            {t("suggestedBy")} {strategy.suggestedBy.join(", ")}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

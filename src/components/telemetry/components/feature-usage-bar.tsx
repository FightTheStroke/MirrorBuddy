"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import type { ChartData } from "@/lib/telemetry/types";

interface FeatureUsageBarProps {
  data: ChartData[];
}

export function FeatureUsageBar({ data }: FeatureUsageBarProps) {
  const t = useTranslations("settings.telemetry");

  if (!data.length) {
    return <div className="text-sm text-slate-400">{t("noData")}</div>;
  }

  const total = data.reduce((sum, d) => sum + (d.data[0]?.value || 0), 0);
  if (total === 0) {
    return <div className="text-sm text-slate-400">{t("noUsage")}</div>;
  }

  return (
    <div className="space-y-2">
      {data.map((feature) => {
        const value = feature.data[0]?.value || 0;
        const percentage = (value / total) * 100;

        return (
          <div key={feature.label} className="flex items-center gap-2">
            <div className="w-20 text-sm text-slate-600 dark:text-slate-400 truncate">
              {feature.label}
            </div>
            <div className="flex-1 h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.5 }}
                className="h-full rounded-full"
                style={{ backgroundColor: feature.color }}
              />
            </div>
            <div className="w-12 text-right text-sm font-medium">{value}</div>
          </div>
        );
      })}
    </div>
  );
}

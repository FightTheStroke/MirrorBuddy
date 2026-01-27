"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import type { ChartData } from "@/lib/telemetry/types";

interface MiniBarChartProps {
  data: ChartData[];
  height?: number;
}

export function MiniBarChart({ data, height = 80 }: MiniBarChartProps) {
  const t = useTranslations("telemetry");

  if (!data.length || !data[0]?.data.length) {
    return (
      <div
        className="flex items-center justify-center text-slate-400 text-sm"
        style={{ height }}
      >
        {t("noDataAvailable")}
      </div>
    );
  }

  const primaryData = data[0].data;
  const maxValue = Math.max(...primaryData.map((d) => d.value), 1);
  const dayFormatter = new Intl.DateTimeFormat("default", { weekday: "short" });

  return (
    <div className="flex items-end justify-between gap-1" style={{ height }}>
      {primaryData.map((point, index) => {
        const barHeight = (point.value / maxValue) * (height - 20);
        const date = new Date(point.timestamp);
        const dayLabel = dayFormatter.format(date);

        return (
          <div key={index} className="flex flex-col items-center flex-1">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: barHeight }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              className="w-full rounded-t"
              style={{ backgroundColor: data[0].color }}
              title={`${point.value} ${t("minutes")}`}
            />
            <span className="text-xs text-slate-500 mt-1">{dayLabel}</span>
          </div>
        );
      })}
    </div>
  );
}

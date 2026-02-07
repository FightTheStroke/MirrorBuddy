"use client";

import { useTranslations } from "next-intl";
import type { TimelineDataPoint } from "@/lib/email/stats-service";

interface EmailOpenChartProps {
  timeline: TimelineDataPoint[];
}

export function EmailOpenChart({ timeline }: EmailOpenChartProps) {
  const t = useTranslations("admin");

  if (timeline.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        {t("communications.stats.noTimelineData")}
      </div>
    );
  }

  // Find max count for scaling
  const maxCount = Math.max(...timeline.map((d) => d.count));

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {t("communications.stats.openTimeline")}
      </h3>
      <div className="space-y-2">
        {timeline.map((dataPoint) => {
          const percentage =
            maxCount > 0 ? (dataPoint.count / maxCount) * 100 : 0;

          return (
            <div key={dataPoint.hour} className="flex items-center gap-3">
              <div className="w-16 text-xs text-gray-600 dark:text-gray-400 font-mono">
                {dataPoint.hour}
              </div>
              <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-6 relative overflow-hidden">
                <div
                  className="h-full bg-blue-500 dark:bg-blue-600 transition-all duration-300 rounded-full flex items-center justify-end pr-2"
                  style={{ width: `${Math.max(percentage, 2)}%` }}
                  role="progressbar"
                  aria-valuenow={dataPoint.count}
                  aria-valuemin={0}
                  aria-valuemax={maxCount}
                  aria-label={`${dataPoint.hour}: ${dataPoint.count} opens`}
                >
                  {dataPoint.count > 0 && percentage > 10 && (
                    <span className="text-xs font-medium text-white">
                      {dataPoint.count}
                    </span>
                  )}
                </div>
              </div>
              {dataPoint.count > 0 && percentage <= 10 && (
                <div className="w-8 text-xs text-gray-600 dark:text-gray-400 font-medium">
                  {dataPoint.count}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

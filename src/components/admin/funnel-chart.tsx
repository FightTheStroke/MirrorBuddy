/**
 * Funnel Visualization Chart
 * Shows conversion funnel with stage counts and conversion rates
 * Plan 069 - Conversion Funnel Dashboard
 */

"use client";

import { useMemo } from "react";

interface StageData {
  stage: string;
  count: number;
  conversionRate: number | null;
}

interface FunnelChartProps {
  stages: StageData[];
}

const STAGE_LABELS: Record<string, string> = {
  VISITOR: "Visitor",
  TRIAL_START: "Trial Started",
  TRIAL_ENGAGED: "Trial Engaged",
  LIMIT_HIT: "Limit Hit",
  BETA_REQUEST: "Beta Request",
  APPROVED: "Approved",
  FIRST_LOGIN: "First Login",
  ACTIVE: "Active",
  CHURNED: "Churned",
};

const STAGE_COLORS: Record<string, string> = {
  VISITOR: "bg-slate-400",
  TRIAL_START: "bg-blue-400",
  TRIAL_ENGAGED: "bg-blue-500",
  LIMIT_HIT: "bg-amber-500",
  BETA_REQUEST: "bg-purple-500",
  APPROVED: "bg-green-500",
  FIRST_LOGIN: "bg-green-600",
  ACTIVE: "bg-emerald-600",
  CHURNED: "bg-red-500",
};

export function FunnelChart({ stages }: FunnelChartProps) {
  const maxCount = useMemo(() => {
    return Math.max(...stages.map((s) => s.count), 1);
  }, [stages]);

  return (
    <div className="space-y-3">
      {stages.map((stage, idx) => {
        const width = (stage.count / maxCount) * 100;
        const label = STAGE_LABELS[stage.stage] || stage.stage;
        const color = STAGE_COLORS[stage.stage] || "bg-gray-400";

        return (
          <div key={stage.stage} className="relative">
            <div className="flex items-center gap-4">
              {/* Stage label */}
              <div className="w-32 text-sm font-medium text-right truncate">
                {label}
              </div>

              {/* Bar */}
              <div className="flex-1 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                <div
                  className={`h-full ${color} transition-all duration-500 flex items-center justify-end pr-3`}
                  style={{ width: `${Math.max(width, 5)}%` }}
                >
                  <span className="text-white text-sm font-semibold">
                    {stage.count.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Conversion rate */}
              <div className="w-20 text-sm text-right">
                {stage.conversionRate !== null ? (
                  <span
                    className={
                      stage.conversionRate >= 50
                        ? "text-green-600"
                        : "text-amber-600"
                    }
                  >
                    {stage.conversionRate.toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
            </div>

            {/* Connector arrow */}
            {idx < stages.length - 1 && (
              <div className="flex justify-center py-1">
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

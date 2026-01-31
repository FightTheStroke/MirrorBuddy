"use client";

import { useMemo, useState, useEffect } from "react";

interface StageData {
  stage: string;
  count: number;
  conversionRate: number | null;
  avgTimeFromPrevious?: number | null;
}

interface FunnelChartProps {
  stages: StageData[];
  showVelocity?: boolean;
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
  VISITOR: "#64748b",
  TRIAL_START: "#3b82f6",
  TRIAL_ENGAGED: "#6366f1",
  LIMIT_HIT: "#f59e0b",
  BETA_REQUEST: "#8b5cf6",
  APPROVED: "#22c55e",
  FIRST_LOGIN: "#10b981",
  ACTIVE: "#0d9488",
  CHURNED: "#ef4444",
};

function formatDuration(ms: number): string {
  const hours = ms / 3600000;
  if (hours < 1) return `${Math.round(ms / 60000)}m`;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

export function FunnelChart({
  stages,
  showVelocity = false,
}: FunnelChartProps) {
  const maxCount = useMemo(
    () => Math.max(...stages.map((s) => s.count), 1),
    [stages],
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-1">
      {stages.map((stage, idx) => {
        const widthPct = Math.max((stage.count / maxCount) * 100, 12);
        const label = STAGE_LABELS[stage.stage] || stage.stage;
        const color = STAGE_COLORS[stage.stage] || "#94a3b8";

        return (
          <div key={stage.stage}>
            <div className="flex items-center gap-3">
              <div className="w-24 text-[11px] font-medium text-slate-600 dark:text-slate-400 text-right truncate">
                {label}
              </div>
              <div className="flex-1 flex justify-center">
                <div
                  className="h-9 rounded-md flex items-center justify-between px-3 transition-all duration-500 ease-out"
                  style={{
                    width: mounted ? `${widthPct}%` : "0%",
                    backgroundColor: color,
                    transitionDelay: `${idx * 60}ms`,
                  }}
                >
                  <span className="text-white text-xs font-semibold">
                    {stage.count.toLocaleString()}
                  </span>
                  {stage.conversionRate !== null && (
                    <span
                      className={`text-[10px] font-medium ${
                        stage.conversionRate >= 50
                          ? "text-white/90"
                          : "text-white/70"
                      }`}
                    >
                      {stage.conversionRate.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
              {showVelocity && stage.avgTimeFromPrevious != null && (
                <div className="w-14 text-[10px] text-slate-400 text-right font-mono">
                  {formatDuration(stage.avgTimeFromPrevious)}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

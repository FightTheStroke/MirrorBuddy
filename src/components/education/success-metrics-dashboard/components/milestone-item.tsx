import { Trophy, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccessibilityStore } from "@/lib/accessibility/accessibility-store";
import type { Milestone } from "../types";
import { METRIC_COLORS } from "../constants";

interface MilestoneItemProps {
  milestone: Milestone;
}

export function MilestoneItem({ milestone }: MilestoneItemProps) {
  const { settings } = useAccessibilityStore();
  const isAchieved = !!milestone.achievedAt;
  const colors = METRIC_COLORS[milestone.metricId];

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg",
        isAchieved
          ? settings.highContrast
            ? "bg-yellow-400/10 border border-yellow-400"
            : "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800"
          : settings.highContrast
            ? "bg-gray-800 border border-gray-700"
            : "bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700",
      )}
      role="region"
      aria-labelledby={`milestone-title-${milestone.id}`}
      aria-label={isAchieved ? "Milestone achieved" : "Milestone pending"}
    >
      <div
        className={cn(
          "p-2 rounded-full shrink-0",
          isAchieved
            ? "bg-emerald-500 text-white"
            : settings.highContrast
              ? "bg-gray-700"
              : colors.bg,
        )}
        aria-hidden="true"
      >
        {isAchieved ? (
          <Trophy className="w-4 h-4" />
        ) : (
          <Sparkles className={cn("w-4 h-4", colors.primary)} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p
          id={`milestone-title-${milestone.id}`}
          className={cn(
            "font-medium truncate",
            settings.highContrast
              ? isAchieved
                ? "text-yellow-400"
                : "text-gray-400"
              : isAchieved
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-slate-600 dark:text-slate-400",
          )}
        >
          {milestone.title}
        </p>
        <p
          id={`milestone-desc-${milestone.id}`}
          className="text-xs text-slate-500 truncate"
        >
          {milestone.description}
        </p>
      </div>
      {isAchieved && milestone.achievedAt && (
        <span
          className="text-xs text-slate-500 shrink-0"
          aria-label={`Achievement date: ${milestone.achievedAt.toLocaleDateString("it-IT")}`}
        >
          {milestone.achievedAt.toLocaleDateString("it-IT")}
        </span>
      )}
    </div>
  );
}

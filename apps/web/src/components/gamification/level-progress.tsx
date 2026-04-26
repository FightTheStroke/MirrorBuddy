/**
 * Level Progress Component
 * Shows XP/level progress bar with visual feedback
 */

"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface LevelProgressProps {
  level: number;
  currentXP: number;
  xpToNextLevel: number;
  className?: string;
}

export function LevelProgress({
  level,
  currentXP,
  xpToNextLevel,
  className,
}: LevelProgressProps) {
  const t = useTranslations("achievements.level");

  const isMaxLevel = level >= 100;
  const progress = isMaxLevel
    ? 100
    : Math.min(100, (currentXP / xpToNextLevel) * 100);
  const remaining = Math.max(0, xpToNextLevel - currentXP);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold">
          {t("current", { level })}
          {isMaxLevel && ` (${t("max")})`}
        </span>
        {!isMaxLevel && (
          <span className="text-slate-500 dark:text-slate-400">
            {t("toNext", { amount: remaining, next: level + 1 })}
          </span>
        )}
      </div>

      <div className="relative w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={cn(
            "absolute inset-y-0 left-0 transition-all duration-500 ease-out",
            isMaxLevel
              ? "bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600"
              : "bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500",
          )}
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${t("progress")}: ${Math.round(progress)}%`}
        >
          {progress > 10 && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          )}
        </div>
      </div>

      {!isMaxLevel && (
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>{currentXP} MB</span>
          <span>{Math.round(progress)}%</span>
          <span>{xpToNextLevel} MB</span>
        </div>
      )}
    </div>
  );
}

/**
 * Achievements Grid Component
 * Grid display of achievement badges with locked/unlocked states
 */

"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { Achievement } from "@/types";

interface AchievementsGridProps {
  achievements: Achievement[];
  className?: string;
}

export function AchievementsGrid({
  achievements,
  className,
}: AchievementsGridProps) {
  const t = useTranslations("achievements");

  const unlockedCount = useMemo(
    () => achievements.filter((a) => a.unlockedAt).length,
    [achievements],
  );

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {t("unlockedCount", {
            count: unlockedCount,
            total: achievements.length,
          })}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {achievements.map((achievement) => (
          <AchievementCard key={achievement.id} achievement={achievement} />
        ))}
      </div>
    </div>
  );
}

interface AchievementCardProps {
  achievement: Achievement;
}

function AchievementCard({ achievement }: AchievementCardProps) {
  const t = useTranslations("achievements");
  const isUnlocked = !!achievement.unlockedAt;

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-all",
        isUnlocked
          ? "border-yellow-500/50 bg-yellow-500/10 hover:border-yellow-500"
          : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 grayscale opacity-50",
      )}
      role="article"
      aria-label={`${achievement.name}${isUnlocked ? ` (${t("unlocked")})` : ` (${t("locked")})`}`}
    >
      <div className="text-4xl" aria-hidden="true">
        {achievement.icon}
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">{achievement.name}</h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
          {achievement.description}
        </p>
      </div>
      {isUnlocked ? (
        <div className="mt-auto flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
          <span>✓</span>
          <span>{t("unlocked")}</span>
        </div>
      ) : (
        <div className="mt-auto text-xs text-slate-500">
          {t("reward", { amount: achievement.mirrorBucksReward })}
        </div>
      )}
    </div>
  );
}

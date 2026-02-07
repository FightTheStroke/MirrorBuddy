/**
 * Achievements Page
 * Display user achievements, streak, level progress, and study stats
 *
 * Plan 125 - Wave W3: Gamification & Security [T3-01]
 */

"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Clock, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProgressStore } from "@/lib/stores/progress-store";
import { ACHIEVEMENTS } from "@/lib/gamification/achievements";
import { AchievementsGrid } from "@/components/gamification/achievements-grid";
import { StreakCalendar } from "@/components/gamification/streak-calendar";
import { LevelProgress } from "@/components/gamification/level-progress";
import {
  getMirrorBucksToNextLevel,
  MIRRORBUCKS_PER_LEVEL,
} from "@/lib/constants/mirrorbucks";

export default function AchievementsPage() {
  const t = useTranslations("achievements");

  // Get user progress data from store
  const achievements = useProgressStore((state) => state.achievements);
  const streak = useProgressStore((state) => state.streak);
  const seasonLevel = useProgressStore((state) => state.seasonLevel);
  const seasonMirrorBucks = useProgressStore(
    (state) => state.seasonMirrorBucks,
  );
  const totalStudyMinutes = useProgressStore(
    (state) => state.totalStudyMinutes,
  );
  const sessionsThisWeek = useProgressStore((state) => state.sessionsThisWeek);

  // Merge user achievements with all achievements
  const allAchievements = useMemo(() => {
    return ACHIEVEMENTS.map((achievement) => {
      const unlocked = achievements.find((a) => a.id === achievement.id);
      return {
        ...achievement,
        unlockedAt: unlocked?.unlockedAt,
      };
    });
  }, [achievements]);

  // Calculate level progress
  const xpToNextLevel = getMirrorBucksToNextLevel(
    seasonLevel,
    seasonMirrorBucks,
  );
  const currentLevelBase =
    seasonLevel > 0 ? MIRRORBUCKS_PER_LEVEL[seasonLevel - 1] : 0;
  const currentXP = seasonMirrorBucks - currentLevelBase;

  // Format study time
  const studyHours = Math.floor(totalStudyMinutes / 60);
  const studyMinutes = totalStudyMinutes % 60;
  const formattedStudyTime =
    studyHours > 0
      ? t("stats.hours", { count: studyHours })
      : t("stats.minutes", { count: studyMinutes });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          {t("description")}
        </p>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Level Progress Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              {t("level.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LevelProgress
              level={seasonLevel}
              currentXP={currentXP}
              xpToNextLevel={xpToNextLevel}
            />
          </CardContent>
        </Card>

        {/* Study Time Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              {t("stats.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t("stats.totalTime")}
                </p>
                <p className="text-2xl font-bold">{formattedStudyTime}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t("stats.thisWeek")}
                </p>
                <p className="text-lg font-semibold">
                  {t("stats.sessions", { count: sessionsThisWeek })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t("unlockedCount", {
                    count: achievements.length,
                    total: ACHIEVEMENTS.length,
                  })}
                </p>
                <div className="mt-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-400 to-amber-500"
                    style={{
                      width: `${(achievements.length / ACHIEVEMENTS.length) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t("streak.current")}
                </p>
                <p className="text-2xl font-bold text-orange-500">
                  {streak.current} 🔥
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Streak Calendar */}
      <StreakCalendar streak={streak} />

      {/* Achievements Grid */}
      <AchievementsGrid achievements={allAchievements} />
    </div>
  );
}

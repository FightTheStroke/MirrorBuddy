/**
 * Streak Calendar Component
 * Calendar heatmap visualization of study streak (similar to GitHub contributions)
 */

"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Flame, Award } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Streak } from "@/types";

interface StreakCalendarProps {
  streak: Streak;
  className?: string;
}

export function StreakCalendar({ streak, className }: StreakCalendarProps) {
  const t = useTranslations("achievements.streak");

  const today = new Date();
  const lastStudy = streak.lastStudyDate
    ? new Date(streak.lastStudyDate)
    : null;
  const isStudiedToday =
    lastStudy && lastStudy.toDateString() === today.toDateString();

  // Generate last 12 weeks (84 days) for calendar heatmap
  const calendarDays = useMemo(() => {
    const days = [];
    const weeksToShow = 12;
    const totalDays = weeksToShow * 7;

    for (let i = totalDays - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date);
    }

    return days;
  }, []);

  // Check if a day was studied (simplified - in real app, check against study history)
  const wasStudied = (date: Date): boolean => {
    if (!lastStudy) return false;
    const daysDiff = Math.floor(
      (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
    );
    return daysDiff < streak.current;
  };

  // Group days by week
  const weeks = useMemo(() => {
    const weekGroups: Date[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      weekGroups.push(calendarDays.slice(i, i + 7));
    }
    return weekGroups;
  }, [calendarDays]);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <motion.div
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                streak.current > 0
                  ? "bg-gradient-to-br from-orange-400 to-red-500"
                  : "bg-slate-200 dark:bg-slate-700",
              )}
              animate={
                streak.current > 0
                  ? {
                      scale: [1, 1.05, 1],
                    }
                  : {}
              }
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Flame
                className={cn(
                  "w-6 h-6",
                  streak.current > 0 ? "text-white" : "text-slate-400",
                )}
              />
            </motion.div>
            <div>
              <p className="text-3xl font-bold">{streak.current}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t("days", { count: streak.current })}
              </p>
            </div>
          </div>

          {/* Longest streak badge */}
          {streak.longest > 0 && (
            <div className="text-right">
              <div className="flex items-center gap-1 text-amber-500">
                <Award className="w-4 h-4" />
                <span className="text-sm font-medium">{streak.longest}</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("longest")}
              </p>
            </div>
          )}
        </div>

        {/* Calendar Heatmap */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {t("calendar")}
          </h3>
          <div className="flex gap-1 overflow-x-auto pb-2">
            {weeks.map((week, weekIdx) => (
              <div key={weekIdx} className="flex flex-col gap-1">
                {week.map((date, dayIdx) => {
                  const isToday = date.toDateString() === today.toDateString();
                  const studied =
                    wasStudied(date) || (isToday && isStudiedToday);

                  return (
                    <motion.div
                      key={dayIdx}
                      className={cn(
                        "w-3 h-3 rounded-sm",
                        studied
                          ? "bg-gradient-to-br from-orange-400 to-red-500"
                          : isToday
                            ? "bg-slate-300 dark:bg-slate-600 ring-1 ring-blue-500"
                            : "bg-slate-100 dark:bg-slate-800",
                      )}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: (weekIdx * 7 + dayIdx) * 0.005 }}
                      title={`${date.toLocaleDateString()} - ${studied ? t("unlocked") : t("locked")}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Motivation message */}
        <div className="mt-6 text-center">
          {!isStudiedToday ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              <span className="text-orange-500 font-medium">
                {t("keepItUp")}
              </span>
            </p>
          ) : streak.current >= 7 ? (
            <p className="text-sm text-green-600 dark:text-green-400 font-medium">
              {t("weekStreak")}
            </p>
          ) : (
            <p className="text-sm text-green-600 dark:text-green-400">
              {t("goodJob")}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

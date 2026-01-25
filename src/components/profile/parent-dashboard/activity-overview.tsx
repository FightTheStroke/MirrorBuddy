"use client";

import { Clock, BookOpen, Star, Coins } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { WeeklyStats } from "@/types";

interface ActivityOverviewProps {
  stats: WeeklyStats;
  highContrast?: boolean;
  className?: string;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
  color: string;
  highContrast?: boolean;
}

function StatCard({
  icon,
  label,
  value,
  subtext,
  color,
  highContrast,
}: StatCardProps) {
  return (
    <article
      className={cn(
        "p-4 rounded-xl border transition-all",
        highContrast
          ? "bg-black border-yellow-400"
          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700",
      )}
      aria-label={`${label}: ${value}${subtext ? ` ${subtext}` : ""}`}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "p-2 rounded-lg",
            highContrast ? "bg-yellow-400 text-black" : color,
          )}
          aria-hidden="true"
        >
          {icon}
        </div>
        <div>
          <p
            className={cn(
              "text-sm",
              highContrast
                ? "text-yellow-200"
                : "text-slate-500 dark:text-slate-400",
            )}
          >
            {label}
          </p>
          <div className="flex items-baseline gap-1">
            <span
              className={cn(
                "text-2xl font-bold",
                highContrast
                  ? "text-yellow-400"
                  : "text-slate-900 dark:text-white",
              )}
            >
              {value}
            </span>
            {subtext && (
              <span
                className={cn(
                  "text-sm",
                  highContrast
                    ? "text-yellow-200"
                    : "text-slate-500 dark:text-slate-400",
                )}
              >
                {subtext}
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

/**
 * Activity overview showing weekly stats in a responsive grid.
 * WCAG 2.1 AA compliant with high contrast support.
 */
export function ActivityOverview({
  stats,
  highContrast = false,
  className,
}: ActivityOverviewProps) {
  const t = useTranslations("education.parent-dashboard.activity");
  const formatMinutes = (mins: number): string => {
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remaining = mins % 60;
      return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
    }
    return `${mins}`;
  };

  const cards = [
    {
      icon: <Clock className="w-5 h-5" />,
      label: t("study-time"),
      value: formatMinutes(stats.totalMinutes),
      subtext: stats.totalMinutes < 60 ? "min" : "",
      color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    },
    {
      icon: <BookOpen className="w-5 h-5" />,
      label: t("sessions"),
      value: stats.sessionsCount,
      subtext: t("this-week"),
      color:
        "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    },
    {
      icon: <Star className="w-5 h-5" />,
      label: t("xp-earned"),
      value: stats.xpEarned.toLocaleString("it-IT"),
      color:
        "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    },
    {
      icon: <Coins className="w-5 h-5" />,
      label: t("mirror-bucks"),
      value: stats.mirrorBucksEarned.toLocaleString("it-IT"),
      color:
        "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    },
  ];

  return (
    <section
      className={cn("space-y-3", className)}
      aria-label={t("aria-label")}
    >
      <h2
        className={cn(
          "text-lg font-semibold",
          highContrast ? "text-yellow-400" : "text-slate-900 dark:text-white",
        )}
      >
        {t("title")}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((card) => (
          <StatCard
            key={card.label}
            icon={card.icon}
            label={card.label}
            value={card.value}
            subtext={card.subtext}
            color={card.color}
            highContrast={highContrast}
          />
        ))}
      </div>
    </section>
  );
}

"use client";

import { Clock, TrendingUp, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAccessibilityStore } from "@/lib/accessibility";

interface StatsOverviewProps {
  hours: number;
  sessions: number;
  maestri: number;
}

export function StatsOverview({
  hours,
  sessions,
  maestri,
}: StatsOverviewProps) {
  const t = useTranslations("education.parentDashboard.stats");
  const { settings } = useAccessibilityStore();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card
        className={settings.highContrast ? "border-yellow-400 bg-gray-900" : ""}
      >
        <CardContent className="pt-6 text-center">
          <Clock
            className={cn(
              "w-8 h-8 mx-auto mb-2",
              settings.highContrast
                ? "text-yellow-400"
                : "text-blue-600 dark:text-blue-400",
            )}
          />
          <p
            className={cn(
              "text-3xl font-bold",
              settings.highContrast
                ? "text-white"
                : "text-slate-900 dark:text-white",
            )}
          >
            {hours}h
          </p>
          <p className="text-sm text-slate-500">{t("totalTime")}</p>
        </CardContent>
      </Card>

      <Card
        className={settings.highContrast ? "border-yellow-400 bg-gray-900" : ""}
      >
        <CardContent className="pt-6 text-center">
          <TrendingUp
            className={cn(
              "w-8 h-8 mx-auto mb-2",
              settings.highContrast
                ? "text-yellow-400"
                : "text-emerald-600 dark:text-emerald-400",
            )}
          />
          <p
            className={cn(
              "text-3xl font-bold",
              settings.highContrast
                ? "text-white"
                : "text-slate-900 dark:text-white",
            )}
          >
            {sessions}
          </p>
          <p className="text-sm text-slate-500">{t("sessions")}</p>
        </CardContent>
      </Card>

      <Card
        className={settings.highContrast ? "border-yellow-400 bg-gray-900" : ""}
      >
        <CardContent className="pt-6 text-center">
          <Users
            className={cn(
              "w-8 h-8 mx-auto mb-2",
              settings.highContrast
                ? "text-yellow-400"
                : "text-purple-600 dark:text-purple-400",
            )}
          />
          <p
            className={cn(
              "text-3xl font-bold",
              settings.highContrast
                ? "text-white"
                : "text-slate-900 dark:text-white",
            )}
          >
            {maestri}
          </p>
          <p className="text-sm text-slate-500">{t("maestri")}</p>
        </CardContent>
      </Card>
    </div>
  );
}

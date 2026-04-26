/**
 * Accessibility Stats Widget for Admin Analytics
 */

"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Accessibility } from "lucide-react";
import type { A11yStatsData } from "@/app/api/dashboard/a11y-stats/route";
import { useTranslations } from "next-intl";

// Profile display names
const PROFILE_LABELS: Record<string, string> = {
  dyslexia: "Dislessia",
  adhd: "ADHD",
  visual: "Visivo",
  motor: "Motorio",
  autism: "Autismo",
  auditory: "Uditivo",
  cerebral: "Motorio+",
};

// Profile colors
const PROFILE_COLORS: Record<string, string> = {
  dyslexia: "bg-blue-500",
  adhd: "bg-purple-500",
  visual: "bg-amber-500",
  motor: "bg-green-500",
  autism: "bg-teal-500",
  auditory: "bg-rose-500",
  cerebral: "bg-primary",
};

interface A11yStatsWidgetProps {
  data: A11yStatsData | null;
}

export function A11yStatsWidget({ data }: A11yStatsWidgetProps) {
  const t = useTranslations("admin");
  if (!data) return null;

  const totalProfiles = Object.values(data.byProfile).reduce(
    (sum, count) => sum + count,
    0,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Accessibility className="h-5 w-5 text-violet-500" />
          {t("accessibilityUsage")}
        </CardTitle>
        <CardDescription>
          {t("profileActivationsAndAccessibilityFeatureUsage")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-2xl font-bold text-violet-600">
              {data.summary.totalActivations}
            </p>
            <p className="text-xs text-muted-foreground">{t("profileActivations")}</p>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-2xl font-bold text-blue-600">
              {data.summary.uniqueSessions}
            </p>
            <p className="text-xs text-muted-foreground">{t("uniqueSessions")}</p>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-2xl font-bold text-foreground">
              {data.summary.resetCount}
            </p>
            <p className="text-xs text-muted-foreground">{t("resets")}</p>
          </div>
        </div>

        {/* Profile distribution */}
        {totalProfiles > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              {t("profileDistribution")}
            </p>
            <div className="flex h-4 rounded-full overflow-hidden bg-muted">
              {Object.entries(data.byProfile).map(([profile, count]) => {
                const percentage = (count / totalProfiles) * 100;
                if (percentage === 0) return null;
                return (
                  <div
                    key={profile}
                    className={`${PROFILE_COLORS[profile] ?? "bg-muted0"} transition-all`}
                    style={{ width: `${percentage}%` }}
                    title={`${PROFILE_LABELS[profile] ?? profile}: ${count} (${percentage.toFixed(1)}%)`}
                  />
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.entries(data.byProfile)
                .sort((a, b) => b[1] - a[1])
                .map(([profile, count]) => (
                  <div
                    key={profile}
                    className="flex items-center gap-1 text-xs"
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${PROFILE_COLORS[profile] ?? "bg-muted0"}`}
                    />
                    <span className="text-muted-foreground">
                      {PROFILE_LABELS[profile] ?? profile}
                    </span>
                    <span className="font-mono text-muted-foreground">
                      {count}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Toggle usage */}
        {Object.keys(data.byToggle).length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              {t("mostUsedToggles")}
            </p>
            {Object.entries(data.byToggle)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([toggle, count]) => (
                <div
                  key={toggle}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-muted-foreground">{toggle}</span>
                  <span className="font-mono">{count}</span>
                </div>
              ))}
          </div>
        )}

        {/* Empty state */}
        {totalProfiles === 0 &&
          Object.keys(data.byToggle).length === 0 &&
          data.summary.resetCount === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t("noAccessibilityEventsRecordedYet")}
            </p>
          )}
      </CardContent>
    </Card>
  );
}

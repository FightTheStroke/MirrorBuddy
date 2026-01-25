"use client";

import { useMemo } from "react";
import { Star, Sprout, Lightbulb, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccessibilityStore } from "@/lib/accessibility/accessibility-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StudentInsights } from "@/types";
import { EmptyInsightsState } from "./parent-dashboard/components/empty-state";
import { ObservationCard } from "./parent-dashboard/components/observation-card";
import { StrategyCard } from "./parent-dashboard/components/strategy-card";
import { LearningStyleCard } from "./parent-dashboard/components/learning-style-card";
import { StatsOverview } from "./parent-dashboard/components/stats-overview";

interface ParentDashboardProps {
  insights?: StudentInsights;
  className?: string;
}

export function ParentDashboard({ insights, className }: ParentDashboardProps) {
  const { settings } = useAccessibilityStore();

  const stats = useMemo(
    () =>
      insights
        ? {
            hours: Math.round(insights.totalMinutes / 60),
            sessions: insights.totalSessions,
            maestri: insights.maestriInteracted.length,
          }
        : null,
    [insights],
  );

  if (!insights) {
    return (
      <div
        className={cn(
          "p-6",
          settings.highContrast ? "bg-black" : "bg-slate-50 dark:bg-slate-950",
          className,
        )}
      >
        <EmptyInsightsState />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "p-6 space-y-6",
        settings.highContrast ? "bg-black" : "bg-slate-50 dark:bg-slate-950",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <h1
            className={cn(
              "text-2xl font-bold",
              settings.highContrast
                ? "text-yellow-400"
                : "text-slate-900 dark:text-white",
            )}
          >
            Profilo di {insights.studentName}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Ultimo aggiornamento:{" "}
            {insights.lastUpdated.toLocaleDateString("it-IT")}
          </p>
        </div>
      </div>

      {stats && <StatsOverview {...stats} />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card
          className={
            settings.highContrast ? "border-yellow-400 bg-gray-900" : ""
          }
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star
                className={cn(
                  "w-5 h-5",
                  settings.highContrast
                    ? "text-yellow-400"
                    : "text-emerald-600 dark:text-emerald-400",
                )}
              />
              <span className={settings.highContrast ? "text-yellow-400" : ""}>
                Punti di Forza
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.strengths.map((obs) => (
              <ObservationCard
                key={obs.id}
                observation={obs}
                isStrength={true}
              />
            ))}
          </CardContent>
        </Card>

        <Card
          className={
            settings.highContrast ? "border-yellow-400 bg-gray-900" : ""
          }
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sprout
                className={cn(
                  "w-5 h-5",
                  settings.highContrast
                    ? "text-yellow-400"
                    : "text-amber-600 dark:text-amber-400",
                )}
              />
              <span className={settings.highContrast ? "text-yellow-400" : ""}>
                Aree di Crescita
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.growthAreas.map((obs) => (
              <ObservationCard
                key={obs.id}
                observation={obs}
                isStrength={false}
              />
            ))}
          </CardContent>
        </Card>
      </div>

      <Card
        className={settings.highContrast ? "border-yellow-400 bg-gray-900" : ""}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb
              className={cn(
                "w-5 h-5",
                settings.highContrast
                  ? "text-yellow-400"
                  : "text-blue-600 dark:text-blue-400",
              )}
            />
            <span className={settings.highContrast ? "text-yellow-400" : ""}>
              Strategie Suggerite
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {insights.strategies.map((strategy) => (
            <StrategyCard key={strategy.id} strategy={strategy} />
          ))}
        </CardContent>
      </Card>

      <Card
        className={settings.highContrast ? "border-yellow-400 bg-gray-900" : ""}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain
              className={cn(
                "w-5 h-5",
                settings.highContrast
                  ? "text-yellow-400"
                  : "text-purple-600 dark:text-purple-400",
              )}
            />
            <span className={settings.highContrast ? "text-yellow-400" : ""}>
              Stile di Apprendimento
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LearningStyleCard style={insights.learningStyle} />

          <div className="mt-6">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
              Cosa lo motiva:
            </p>
            <div className="flex flex-wrap gap-2">
              {insights.learningStyle.motivators.map((motivator, idx) => (
                <span
                  key={idx}
                  className={cn(
                    "px-3 py-1 rounded-full text-sm",
                    settings.highContrast
                      ? "bg-yellow-400/20 text-yellow-400"
                      : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
                  )}
                >
                  {motivator}
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ParentDashboard;

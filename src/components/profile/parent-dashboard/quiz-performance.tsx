"use client";

import { Trophy, Target, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuizStats } from "@/types";

interface QuizPerformanceProps {
  stats: QuizStats;
  highContrast?: boolean;
  className?: string;
}

function getScoreColor(score: number, highContrast: boolean): string {
  if (highContrast) return "text-yellow-400";
  if (score >= 80) return "text-green-600 dark:text-green-400";
  if (score >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function getScoreBackground(score: number, highContrast: boolean): string {
  if (highContrast) return "bg-yellow-400/20";
  if (score >= 80) return "bg-green-100 dark:bg-green-900/30";
  if (score >= 60) return "bg-amber-100 dark:bg-amber-900/30";
  return "bg-red-100 dark:bg-red-900/30";
}

/**
 * Quiz performance metrics with overall and per-subject stats.
 * WCAG 2.1 AA compliant with high contrast support.
 */
export function QuizPerformance({
  stats,
  highContrast = false,
  className,
}: QuizPerformanceProps) {
  if (stats.totalAttempts === 0) {
    return (
      <section
        className={cn("space-y-3", className)}
        aria-label="Performance quiz"
      >
        <div className="flex items-center gap-2">
          <Target
            className={cn(
              "w-5 h-5",
              highContrast ? "text-yellow-400" : "text-primary",
            )}
            aria-hidden="true"
          />
          <h2
            className={cn(
              "text-lg font-semibold",
              highContrast
                ? "text-yellow-400"
                : "text-slate-900 dark:text-white",
            )}
          >
            Quiz
          </h2>
        </div>
        <p
          className={cn(
            "text-sm py-8 text-center",
            highContrast
              ? "text-yellow-200"
              : "text-slate-500 dark:text-slate-400",
          )}
        >
          Nessun quiz completato ancora
        </p>
      </section>
    );
  }

  return (
    <section
      className={cn("space-y-4", className)}
      aria-label="Performance quiz"
    >
      <div className="flex items-center gap-2">
        <Target
          className={cn(
            "w-5 h-5",
            highContrast ? "text-yellow-400" : "text-primary",
          )}
          aria-hidden="true"
        />
        <h2
          className={cn(
            "text-lg font-semibold",
            highContrast ? "text-yellow-400" : "text-slate-900 dark:text-white",
          )}
        >
          Quiz
        </h2>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div
          className={cn(
            "p-3 rounded-lg text-center",
            highContrast
              ? "bg-black border border-yellow-400"
              : "bg-slate-50 dark:bg-slate-800/50",
          )}
        >
          <TrendingUp
            className={cn(
              "w-5 h-5 mx-auto mb-1",
              highContrast ? "text-yellow-400" : "text-slate-400",
            )}
            aria-hidden="true"
          />
          <p
            className={cn(
              "text-2xl font-bold",
              highContrast
                ? "text-yellow-400"
                : "text-slate-900 dark:text-white",
            )}
          >
            {stats.totalAttempts}
          </p>
          <p
            className={cn(
              "text-xs",
              highContrast
                ? "text-yellow-200"
                : "text-slate-500 dark:text-slate-400",
            )}
          >
            Quiz completati
          </p>
        </div>
        <div
          className={cn(
            "p-3 rounded-lg text-center",
            highContrast
              ? "bg-black border border-yellow-400"
              : getScoreBackground(stats.averageScore, false),
          )}
        >
          <Target
            className={cn(
              "w-5 h-5 mx-auto mb-1",
              getScoreColor(stats.averageScore, highContrast),
            )}
            aria-hidden="true"
          />
          <p
            className={cn(
              "text-2xl font-bold",
              getScoreColor(stats.averageScore, highContrast),
            )}
          >
            {stats.averageScore}%
          </p>
          <p
            className={cn(
              "text-xs",
              highContrast
                ? "text-yellow-200"
                : "text-slate-500 dark:text-slate-400",
            )}
          >
            Media
          </p>
        </div>
        <div
          className={cn(
            "p-3 rounded-lg text-center",
            highContrast
              ? "bg-black border border-yellow-400"
              : getScoreBackground(stats.bestScore, false),
          )}
        >
          <Trophy
            className={cn(
              "w-5 h-5 mx-auto mb-1",
              highContrast ? "text-yellow-400" : "text-amber-500",
            )}
            aria-hidden="true"
          />
          <p
            className={cn(
              "text-2xl font-bold",
              getScoreColor(stats.bestScore, highContrast),
            )}
          >
            {stats.bestScore}%
          </p>
          <p
            className={cn(
              "text-xs",
              highContrast
                ? "text-yellow-200"
                : "text-slate-500 dark:text-slate-400",
            )}
          >
            Record
          </p>
        </div>
      </div>

      {/* Per-Subject Stats */}
      {stats.bySubject.length > 0 && (
        <div className="space-y-2">
          <h3
            className={cn(
              "text-sm font-medium",
              highContrast
                ? "text-yellow-400"
                : "text-slate-700 dark:text-slate-300",
            )}
          >
            Per materia
          </h3>
          <div className="space-y-2">
            {stats.bySubject.slice(0, 5).map((subjectStat) => (
              <div
                key={subjectStat.subject}
                className={cn(
                  "flex items-center justify-between p-2 rounded-lg",
                  highContrast
                    ? "bg-black border border-yellow-400/50"
                    : "bg-slate-50 dark:bg-slate-800/50",
                )}
              >
                <span
                  className={cn(
                    "text-sm",
                    highContrast
                      ? "text-yellow-200"
                      : "text-slate-600 dark:text-slate-300",
                  )}
                >
                  {subjectStat.subjectName}
                </span>
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "text-xs",
                      highContrast ? "text-yellow-200" : "text-slate-400",
                    )}
                  >
                    {subjectStat.attempts} quiz
                  </span>
                  <span
                    className={cn(
                      "font-bold",
                      getScoreColor(subjectStat.averageScore, highContrast),
                    )}
                  >
                    {subjectStat.averageScore}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

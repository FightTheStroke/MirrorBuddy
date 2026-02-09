"use client";

import { Calendar, Clock, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StudySessionSummary } from "@/types";
import { SUBJECT_NAMES } from "@/data/maestri";
import { useTranslations } from "next-intl";

interface RecentSessionsListProps {
  sessions: StudySessionSummary[];
  highContrast?: boolean;
  className?: string;
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return "Oggi";
  if (diffDays === 1) return "Ieri";
  if (diffDays < 7) return `${diffDays} giorni fa`;

  return date.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}

function formatDuration(minutes: number | null): string {
  if (!minutes) return "-";
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
  }
  return `${minutes}m`;
}

/**
 * Recent study sessions list with subject and duration info.
 * WCAG 2.1 AA compliant with high contrast support.
 */
export function RecentSessionsList({
  sessions,
  highContrast = false,
  className,
}: RecentSessionsListProps) {
  const t = useTranslations("settings");
  if (sessions.length === 0) {
    return (
      <section
        className={cn("space-y-3", className)}
        aria-label={t("sessioniRecenti3")}
      >
        <h2
          className={cn(
            "text-lg font-semibold",
            highContrast ? "text-yellow-400" : "text-slate-900 dark:text-white",
          )}
        >
          {t("sessioniRecenti2")}
        </h2>
        <p
          className={cn(
            "text-sm py-8 text-center",
            highContrast
              ? "text-yellow-200"
              : "text-slate-500 dark:text-slate-400",
          )}
        >
          {t("nessunaSessioneDiStudioAncora")}
        </p>
      </section>
    );
  }

  return (
    <section
      className={cn("space-y-3", className)}
      aria-label={t("sessioniRecenti1")}
    >
      <h2
        className={cn(
          "text-lg font-semibold",
          highContrast ? "text-yellow-400" : "text-slate-900 dark:text-white",
        )}
      >
        {t("sessioniRecenti")}
      </h2>
      <ul
        className={cn(
          "divide-y rounded-xl border overflow-hidden",
          highContrast
            ? "divide-yellow-400/30 border-yellow-400 bg-black"
            : "divide-slate-200 dark:divide-slate-700 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800",
        )}
      >
        {sessions.map((session) => (
          <li key={session.id} className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={cn(
                    "shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold",
                    highContrast
                      ? "bg-yellow-400 text-black"
                      : "bg-primary/10 text-primary",
                  )}
                  aria-hidden="true"
                >
                  {session.maestroName.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p
                    className={cn(
                      "font-medium truncate",
                      highContrast
                        ? "text-yellow-400"
                        : "text-slate-900 dark:text-white",
                    )}
                  >
                    {session.maestroName}
                  </p>
                  <p
                    className={cn(
                      "text-sm truncate",
                      highContrast
                        ? "text-yellow-200"
                        : "text-slate-500 dark:text-slate-400",
                    )}
                  >
                    {SUBJECT_NAMES[session.subject] || session.subject}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0 text-right">
                <div className="flex items-center gap-1">
                  <Clock
                    className={cn(
                      "w-4 h-4",
                      highContrast ? "text-yellow-400" : "text-slate-400",
                    )}
                    aria-hidden="true"
                  />
                  <span
                    className={cn(
                      "text-sm",
                      highContrast
                        ? "text-yellow-200"
                        : "text-slate-600 dark:text-slate-300",
                    )}
                  >
                    {formatDuration(session.duration)}
                  </span>
                </div>
                {session.xpEarned > 0 && (
                  <div className="flex items-center gap-1">
                    <Star
                      className={cn(
                        "w-4 h-4",
                        highContrast ? "text-yellow-400" : "text-amber-500",
                      )}
                      aria-hidden="true"
                    />
                    <span
                      className={cn(
                        "text-sm font-medium",
                        highContrast
                          ? "text-yellow-400"
                          : "text-amber-600 dark:text-amber-400",
                      )}
                    >
                      +{session.xpEarned}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Calendar
                    className={cn(
                      "w-4 h-4",
                      highContrast ? "text-yellow-400" : "text-slate-400",
                    )}
                    aria-hidden="true"
                  />
                  <span
                    className={cn(
                      "text-xs",
                      highContrast
                        ? "text-yellow-200"
                        : "text-slate-500 dark:text-slate-400",
                    )}
                  >
                    {formatDate(session.startedAt)}
                  </span>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

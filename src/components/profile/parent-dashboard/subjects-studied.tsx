"use client";

import { BookMarked } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SubjectBreakdown } from "@/types";
import { useTranslations } from "next-intl";

interface SubjectsStudiedProps {
  subjects: SubjectBreakdown[];
  highContrast?: boolean;
  className?: string;
}

const SUBJECT_COLORS = [
  { bg: "bg-blue-500", light: "bg-blue-100", text: "text-blue-600" },
  { bg: "bg-green-500", light: "bg-green-100", text: "text-green-600" },
  { bg: "bg-purple-500", light: "bg-purple-100", text: "text-purple-600" },
  { bg: "bg-amber-500", light: "bg-amber-100", text: "text-amber-600" },
  { bg: "bg-pink-500", light: "bg-pink-100", text: "text-pink-600" },
  { bg: "bg-cyan-500", light: "bg-cyan-100", text: "text-cyan-600" },
];

function formatDuration(minutes: number): string {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
  }
  return `${minutes}m`;
}

/**
 * Subjects studied breakdown with visual progress bars.
 * WCAG 2.1 AA compliant with high contrast support.
 */
export function SubjectsStudied({
  subjects,
  highContrast = false,
  className,
}: SubjectsStudiedProps) {
  const t = useTranslations("settings");
  if (subjects.length === 0) {
    return (
      <section
        className={cn("space-y-3", className)}
        aria-label={t("materieStudiate3")}
      >
        <div className="flex items-center gap-2">
          <BookMarked
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
            {t("materieStudiate2")}
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
          {t("nessunaSessioneDiStudioNegliUltimi30Giorni")}
        </p>
      </section>
    );
  }

  return (
    <section
      className={cn("space-y-4", className)}
      aria-label={t("materieStudiate1")}
    >
      <div className="flex items-center gap-2">
        <BookMarked
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
          {t("materieStudiate")}
        </h2>
        <span
          className={cn(
            "text-sm",
            highContrast
              ? "text-yellow-200"
              : "text-slate-500 dark:text-slate-400",
          )}
        >
          {t("ultimi30Giorni")}
        </span>
      </div>

      <div className="space-y-3">
        {subjects.map((subject, index) => {
          const color = SUBJECT_COLORS[index % SUBJECT_COLORS.length];
          return (
            <div key={subject.subject} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "font-medium",
                    highContrast
                      ? "text-yellow-400"
                      : "text-slate-700 dark:text-slate-200",
                  )}
                >
                  {subject.subjectName}
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-sm",
                      highContrast
                        ? "text-yellow-200"
                        : "text-slate-500 dark:text-slate-400",
                    )}
                  >
                    {formatDuration(subject.minutes)}
                  </span>
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full",
                      highContrast
                        ? "bg-yellow-400 text-black"
                        : `${color.light} ${color.text} dark:bg-opacity-20`,
                    )}
                  >
                    {subject.percentage}%
                  </span>
                </div>
              </div>
              <div
                className={cn(
                  "h-2 rounded-full overflow-hidden",
                  highContrast
                    ? "bg-yellow-400/20"
                    : "bg-slate-100 dark:bg-slate-700",
                )}
                role="progressbar"
                aria-valuenow={subject.percentage}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${subject.subjectName}: ${subject.percentage}%`}
              >
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    highContrast ? "bg-yellow-400" : color.bg,
                  )}
                  style={{ width: `${subject.percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

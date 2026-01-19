"use client";

import { MessageSquareText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { TeacherDiary, type DiaryEntry } from "../teacher-diary";

interface TeacherObservationsSectionProps {
  entries: DiaryEntry[];
  studentName: string;
  isLoading: boolean;
  highContrast?: boolean;
  className?: string;
  onTalkToMaestro?: (maestroId: string, maestroName: string) => void;
}

/**
 * Teacher observations section wrapping the TeacherDiary component.
 * Shows loading state and empty state with helpful message.
 * WCAG 2.1 AA compliant with high contrast support.
 */
export function TeacherObservationsSection({
  entries,
  studentName,
  isLoading,
  highContrast = false,
  className,
  onTalkToMaestro,
}: TeacherObservationsSectionProps) {
  if (isLoading) {
    return (
      <section
        className={cn("space-y-4", className)}
        aria-label="Osservazioni dei professori"
      >
        <div className="flex items-center gap-2">
          <MessageSquareText
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
            Osservazioni dei Professori
          </h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2
            className={cn(
              "w-8 h-8 animate-spin",
              highContrast ? "text-yellow-400" : "text-primary",
            )}
            aria-label="Caricamento osservazioni"
          />
        </div>
      </section>
    );
  }

  if (entries.length === 0) {
    return (
      <section
        className={cn("space-y-4", className)}
        aria-label="Osservazioni dei professori"
      >
        <div className="flex items-center gap-2">
          <MessageSquareText
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
            Osservazioni dei Professori
          </h2>
        </div>
        <div
          className={cn(
            "p-6 rounded-xl text-center",
            highContrast
              ? "bg-black border border-yellow-400"
              : "bg-slate-50 dark:bg-slate-800/50",
          )}
        >
          <p
            className={cn(
              "text-sm mb-2",
              highContrast
                ? "text-yellow-200"
                : "text-slate-600 dark:text-slate-400",
            )}
          >
            Nessuna osservazione ancora disponibile.
          </p>
          <p
            className={cn(
              "text-xs",
              highContrast
                ? "text-yellow-200/70"
                : "text-slate-500 dark:text-slate-500",
            )}
          >
            Le osservazioni dei maestri appariranno qui dopo alcune sessioni di
            studio.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className={className} aria-label="Osservazioni dei professori">
      <TeacherDiary
        entries={entries}
        studentName={studentName}
        isLoading={false}
        onTalkToMaestro={onTalkToMaestro}
      />
    </section>
  );
}

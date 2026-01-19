"use client";

import { Users, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface ParentHeaderProps {
  studentName: string;
  highContrast?: boolean;
  className?: string;
}

/**
 * Parent Dashboard header with welcome message and child info.
 * WCAG 2.1 AA compliant with high contrast support.
 */
export function ParentHeader({
  studentName,
  highContrast = false,
  className,
}: ParentHeaderProps) {
  return (
    <header
      className={cn(
        "flex items-center justify-between pb-4 border-b",
        highContrast
          ? "border-yellow-400"
          : "border-slate-200 dark:border-slate-700",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "p-2 rounded-xl",
            highContrast
              ? "bg-yellow-400 text-black"
              : "bg-primary/10 text-primary",
          )}
          aria-hidden="true"
        >
          <Users className="w-6 h-6" />
        </div>
        <div>
          <h1
            className={cn(
              "text-2xl font-bold",
              highContrast
                ? "text-yellow-400"
                : "text-slate-900 dark:text-white",
            )}
          >
            Dashboard Genitori
          </h1>
          <p
            className={cn(
              "text-sm",
              highContrast
                ? "text-yellow-200"
                : "text-slate-600 dark:text-slate-400",
            )}
          >
            Panoramica delle attività di studio
          </p>
        </div>
      </div>

      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg",
          highContrast
            ? "bg-yellow-400/20 border border-yellow-400"
            : "bg-slate-100 dark:bg-slate-800",
        )}
      >
        <User
          className={cn(
            "w-4 h-4",
            highContrast ? "text-yellow-400" : "text-slate-500",
          )}
          aria-hidden="true"
        />
        <span
          className={cn(
            "text-sm font-medium",
            highContrast
              ? "text-yellow-400"
              : "text-slate-700 dark:text-slate-300",
          )}
        >
          {studentName}
        </span>
      </div>
    </header>
  );
}

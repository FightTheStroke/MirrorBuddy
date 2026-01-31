"use client";

import { Sparkles } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface AIDisclosureBadgeProps {
  variant?: "compact" | "full";
  className?: string;
}

const DISCLOSURE_MESSAGE =
  "Questa risposta è generata da un'intelligenza artificiale. Verifica sempre le informazioni importanti.";

export function AIDisclosureBadge({
  variant = "compact",
  className,
}: AIDisclosureBadgeProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all duration-200",
              variant === "compact"
                ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                : "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900",
              "cursor-help focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500",
              className,
            )}
            role="button"
            aria-label="Risposta generata da intelligenza artificiale"
            tabIndex={0}
            onKeyDown={(e) => {
              // Support keyboard activation
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
              }
            }}
          >
            <Sparkles
              className={cn(
                "flex-shrink-0",
                variant === "compact" ? "w-3.5 h-3.5" : "w-4 h-4",
              )}
              aria-hidden="true"
            />
            <span className="hidden sm:inline">
              {variant === "full" ? "Risposta AI" : "AI"}
            </span>
            <span className="sm:hidden">{variant === "full" ? "AI" : ""}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-xs bg-slate-900 dark:bg-slate-950 text-white text-xs p-3 rounded-lg"
        >
          <p>{DISCLOSURE_MESSAGE}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

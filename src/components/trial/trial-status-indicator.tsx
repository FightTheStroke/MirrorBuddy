"use client";

import { MessageCircle } from "lucide-react";

interface TrialStatusIndicatorProps {
  chatCount: number;
  maxChats?: number;
  className?: string;
}

/**
 * Trial Status Indicator
 *
 * Shows remaining chats in trial mode (X/10).
 * Appears in header/sidebar during trial.
 */
export function TrialStatusIndicator({
  chatCount,
  maxChats = 10,
  className = "",
}: TrialStatusIndicatorProps) {
  const remaining = Math.max(0, maxChats - chatCount);
  const progress = (chatCount / maxChats) * 100;

  // Color based on remaining chats
  let colorClass = "text-green-600 dark:text-green-400";
  let bgClass = "bg-green-100 dark:bg-green-900/30";

  if (remaining <= 3) {
    colorClass = "text-amber-600 dark:text-amber-400";
    bgClass = "bg-amber-100 dark:bg-amber-900/30";
  }
  if (remaining === 0) {
    colorClass = "text-red-600 dark:text-red-400";
    bgClass = "bg-red-100 dark:bg-red-900/30";
  }

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${bgClass} ${className}`}
    >
      <MessageCircle className={`w-4 h-4 ${colorClass}`} />

      {/* Progress bar */}
      <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            remaining === 0
              ? "bg-red-500"
              : remaining <= 3
                ? "bg-amber-500"
                : "bg-green-500"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Counter */}
      <span className={`text-xs font-medium ${colorClass}`}>
        {remaining}/{maxChats}
      </span>
    </div>
  );
}

export default TrialStatusIndicator;

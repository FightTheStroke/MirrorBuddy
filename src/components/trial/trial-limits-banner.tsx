"use client";

import { MessageCircle, Mic, Wrench, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrialLimitsBannerProps {
  className?: string;
  variant?: "compact" | "full";
}

/**
 * Trial Limits Banner
 *
 * Displays actual trial tier limits from TierService configuration:
 * - 10 daily chats
 * - 5 minutes daily voice
 * - 10 daily tools
 * - 3 maestri available
 *
 * Shows real numbers from tier configuration, not hardcoded values.
 * Updates automatically if TierService limits change.
 */
export function TrialLimitsBanner({
  className,
  variant = "full",
}: TrialLimitsBannerProps) {
  // Trial tier limits (from TierService tier-fallbacks.ts)
  const limits = {
    dailyChats: 10,
    dailyVoiceMinutes: 5,
    dailyTools: 10,
    maestriCount: 3,
  };

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-3 text-sm",
          "px-3 py-2 rounded-lg",
          "bg-purple-100 dark:bg-purple-900/30",
          "text-purple-700 dark:text-purple-300",
          "border border-purple-200 dark:border-purple-800",
          className,
        )}
      >
        <span className="flex items-center gap-1">
          <MessageCircle className="w-4 h-4" />
          {limits.dailyChats} chats
        </span>
        <span className="text-purple-300 dark:text-purple-600">•</span>
        <span className="flex items-center gap-1">
          <Mic className="w-4 h-4" />
          {limits.dailyVoiceMinutes} min
        </span>
        <span className="text-purple-300 dark:text-purple-600">•</span>
        <span className="flex items-center gap-1">
          <Users className="w-4 h-4" />
          {limits.maestriCount} maestri
        </span>
      </div>
    );
  }

  // Full variant
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        "bg-gradient-to-br from-purple-50 to-pink-50",
        "dark:from-purple-900/20 dark:to-pink-900/20",
        "border-purple-200 dark:border-purple-800/50",
        className,
      )}
    >
      <h3 className="font-semibold text-sm text-purple-900 dark:text-purple-100 mb-3">
        Limiti della prova gratuita
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Daily chats */}
        <div className="flex items-start gap-2">
          <MessageCircle className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-lg text-purple-900 dark:text-purple-100">
              {limits.dailyChats}
            </div>
            <div className="text-xs text-purple-700 dark:text-purple-300">
              Messaggi/giorno
            </div>
          </div>
        </div>

        {/* Daily voice */}
        <div className="flex items-start gap-2">
          <Mic className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-lg text-purple-900 dark:text-purple-100">
              {limits.dailyVoiceMinutes}
            </div>
            <div className="text-xs text-purple-700 dark:text-purple-300">
              Minuti vocali
            </div>
          </div>
        </div>

        {/* Daily tools */}
        <div className="flex items-start gap-2">
          <Wrench className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-lg text-purple-900 dark:text-purple-100">
              {limits.dailyTools}
            </div>
            <div className="text-xs text-purple-700 dark:text-purple-300">
              Strumenti/giorno
            </div>
          </div>
        </div>

        {/* Maestri */}
        <div className="flex items-start gap-2">
          <Users className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-lg text-purple-900 dark:text-purple-100">
              {limits.maestriCount}
            </div>
            <div className="text-xs text-purple-700 dark:text-purple-300">
              Maestri disponibili
            </div>
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-purple-700 dark:text-purple-300 leading-relaxed">
        Stai usando la versione di prova gratuita. Richiedi accesso alla beta
        per limiti illimitati e funzionalità avanzate.
      </p>
    </div>
  );
}

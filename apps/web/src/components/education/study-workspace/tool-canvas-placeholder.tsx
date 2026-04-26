"use client";
/**
 * Tool Canvas Placeholder
 * Placeholder component for the ToolCanvas until RT-03 is integrated
 */

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAccessibilityStore } from "@/lib/accessibility";
import type { ToolCanvasPlaceholderProps } from "./types";
import { useTranslations } from "next-intl";

export function ToolCanvasPlaceholder({
  sessionId: _sessionId,
  maestroName,
  maestroAvatar: _maestroAvatar,
  isActive,
  onToolStart: _onToolStart,
  onToolComplete: _onToolComplete,
}: ToolCanvasPlaceholderProps) {
  const t = useTranslations("education");
  const { settings } = useAccessibilityStore();

  return (
    <div
      className={cn(
        "h-full flex items-center justify-center",
        settings.highContrast ? "bg-black" : "bg-slate-900",
      )}
    >
      <div className="text-center space-y-4 p-8">
        <div
          className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center mx-auto",
            settings.highContrast ? "bg-yellow-400/20" : "bg-slate-800",
          )}
        >
          {isActive ? (
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className={cn(
                "w-8 h-8 rounded-lg",
                settings.highContrast ? "bg-yellow-400" : "bg-accent-themed",
              )}
            />
          ) : (
            <div
              className={cn(
                "w-8 h-8 rounded-lg",
                settings.highContrast ? "bg-gray-600" : "bg-slate-700",
              )}
            />
          )}
        </div>
        <p
          className={cn(
            settings.highContrast ? "text-gray-400" : "text-slate-400",
          )}
        >
          {isActive
            ? `${maestroName} sta costruendo uno strumento...`
            : "In attesa che venga creato uno strumento"}
        </p>
        <p
          className={cn(
            "text-xs",
            settings.highContrast ? "text-gray-600" : "text-slate-600",
          )}
        >
          {t("ilCanvasMostraMappeMentaliQuizFlashcardEAltriStrum")}
          {t("tempoReale")}
        </p>
      </div>
    </div>
  );
}

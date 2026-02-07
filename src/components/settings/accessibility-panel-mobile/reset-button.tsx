"use client";

import { useTranslations } from "next-intl";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccessibilityStore } from "@/lib/accessibility";

interface ResetButtonProps {
  fontSizeMultiplier: number;
}

export function ResetButton({ fontSizeMultiplier }: ResetButtonProps) {
  const t = useTranslations("settings.accessibility");
  const { settings, resetSettings } = useAccessibilityStore();

  return (
    <button
      onClick={resetSettings}
      className={cn(
        "min-h-[44px] w-full flex items-center justify-center gap-2 p-4 rounded-lg transition-colors font-medium",
        settings.highContrast
          ? "bg-red-900 text-white hover:bg-red-800 border border-red-700"
          : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30",
        settings.dyslexiaFont && "tracking-wide",
      )}
      style={{
        fontSize: `${14 * fontSizeMultiplier}px`,
      }}
    >
      <RotateCcw className="w-5 h-5" />
      <span>{t("resetDefaults")}</span>
    </button>
  );
}

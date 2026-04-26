"use client";

import { cn } from "@/lib/utils";
import { useAccessibilityStore } from "@/lib/accessibility";
import { useTranslations } from "next-intl";

interface TextPreviewSectionProps {
  fontSizeMultiplier: number;
}

export function TextPreviewSection({
  fontSizeMultiplier,
}: TextPreviewSectionProps) {
  const t = useTranslations("settings");
  const { settings } = useAccessibilityStore();

  return (
    <div className="space-y-3">
      <h3
        className={cn(
          "text-base font-semibold",
          settings.highContrast
            ? "text-yellow-400"
            : "text-slate-800 dark:text-white",
          settings.dyslexiaFont && "tracking-wide",
        )}
        style={{
          fontSize: `${16 * fontSizeMultiplier}px`,
        }}
      >
        {t("anteprimaDimensioneTesto")}
      </h3>

      <div
        className={cn(
          "min-h-[100px] p-4 rounded-lg flex items-center justify-center",
          settings.highContrast
            ? "bg-gray-900 border-2 border-yellow-400"
            : "bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700",
        )}
        data-testid="text-size-preview"
      >
        <span
          className={cn(
            "text-center",
            settings.dyslexiaFont && "tracking-wide",
            settings.highContrast
              ? "text-yellow-400"
              : "text-slate-900 dark:text-white",
          )}
          style={{
            fontSize: `${16 * fontSizeMultiplier}px`,
            lineHeight: settings.largeText ? 1.8 : 1.5,
          }}
        >
          {t("abc123")}
        </span>
      </div>
    </div>
  );
}

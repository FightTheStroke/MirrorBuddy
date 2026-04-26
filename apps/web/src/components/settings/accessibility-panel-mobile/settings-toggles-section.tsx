"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useAccessibilityStore } from "@/lib/accessibility";

interface SettingsTogglesSectionProps {
  fontSizeMultiplier: number;
}

export function SettingsTogglesSection({
  fontSizeMultiplier,
}: SettingsTogglesSectionProps) {
  const t = useTranslations("settings.accessibility");
  const { settings, updateSettings } = useAccessibilityStore();

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
        {t("sectionTitle")}
      </h3>

      {/* Large Text Toggle */}
      <label
        className={cn(
          "min-h-[44px] flex items-center gap-4 p-4 rounded-lg cursor-pointer transition-colors",
          settings.highContrast
            ? "bg-gray-900 hover:bg-gray-800 border border-gray-700"
            : "bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800",
        )}
        data-testid="toggle-large-text"
      >
        <div className="flex-1">
          <span
            className={cn(
              "block font-medium",
              settings.highContrast
                ? "text-white"
                : "text-slate-900 dark:text-white",
              settings.dyslexiaFont && "tracking-wide",
            )}
            style={{
              fontSize: `${14 * fontSizeMultiplier}px`,
            }}
          >
            {t("testoGrande1")}
          </span>
        </div>
        <div
          className={cn(
            "relative w-12 h-7 rounded-full transition-colors",
            settings.largeText
              ? settings.highContrast
                ? "bg-yellow-400"
                : "bg-blue-500"
              : settings.highContrast
                ? "bg-gray-700"
                : "bg-slate-300 dark:bg-slate-600",
          )}
        >
          <input
            type="checkbox"
            checked={settings.largeText}
            onChange={(e) => updateSettings({ largeText: e.target.checked })}
            className="sr-only"
            aria-label={t("testoGrande")}
          />
          <span
            className={cn(
              "absolute top-1 left-1 w-5 h-5 rounded-full transition-transform",
              settings.largeText ? "translate-x-5" : "translate-x-0",
              settings.highContrast ? "bg-black" : "bg-white",
            )}
          />
        </div>
      </label>

      {/* High Contrast Toggle */}
      <label
        className={cn(
          "min-h-[44px] flex items-center gap-4 p-4 rounded-lg cursor-pointer transition-colors",
          settings.highContrast
            ? "bg-gray-900 hover:bg-gray-800 border border-gray-700"
            : "bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800",
        )}
      >
        <div className="flex-1">
          <span
            className={cn(
              "block font-medium",
              settings.highContrast
                ? "text-white"
                : "text-slate-900 dark:text-white",
              settings.dyslexiaFont && "tracking-wide",
            )}
            style={{
              fontSize: `${14 * fontSizeMultiplier}px`,
            }}
          >
            {t("altoContrasto1")}
          </span>
        </div>
        <div
          className={cn(
            "relative w-12 h-7 rounded-full transition-colors",
            settings.highContrast
              ? "bg-yellow-400"
              : "bg-slate-300 dark:bg-slate-600",
          )}
        >
          <input
            type="checkbox"
            checked={settings.highContrast}
            onChange={(e) => updateSettings({ highContrast: e.target.checked })}
            className="sr-only"
            aria-label={t("altoContrasto")}
          />
          <span
            className={cn(
              "absolute top-1 left-1 w-5 h-5 rounded-full transition-transform",
              settings.highContrast ? "translate-x-5" : "translate-x-0",
              settings.highContrast ? "bg-black" : "bg-white",
            )}
          />
        </div>
      </label>

      {/* Dyslexia Font Toggle */}
      <label
        className={cn(
          "min-h-[44px] flex items-center gap-4 p-4 rounded-lg cursor-pointer transition-colors",
          settings.highContrast
            ? "bg-gray-900 hover:bg-gray-800 border border-gray-700"
            : "bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800",
        )}
      >
        <div className="flex-1">
          <span
            className={cn(
              "block font-medium",
              settings.highContrast
                ? "text-white"
                : "text-slate-900 dark:text-white",
              settings.dyslexiaFont && "tracking-wide",
            )}
            style={{
              fontSize: `${14 * fontSizeMultiplier}px`,
            }}
          >
            {t("fontOpendyslexic1")}
          </span>
        </div>
        <div
          className={cn(
            "relative w-12 h-7 rounded-full transition-colors",
            settings.dyslexiaFont
              ? settings.highContrast
                ? "bg-yellow-400"
                : "bg-blue-500"
              : settings.highContrast
                ? "bg-gray-700"
                : "bg-slate-300 dark:bg-slate-600",
          )}
        >
          <input
            type="checkbox"
            checked={settings.dyslexiaFont}
            onChange={(e) => updateSettings({ dyslexiaFont: e.target.checked })}
            className="sr-only"
            aria-label={t("fontOpendyslexic")}
          />
          <span
            className={cn(
              "absolute top-1 left-1 w-5 h-5 rounded-full transition-transform",
              settings.dyslexiaFont ? "translate-x-5" : "translate-x-0",
              settings.highContrast ? "bg-black" : "bg-white",
            )}
          />
        </div>
      </label>
    </div>
  );
}

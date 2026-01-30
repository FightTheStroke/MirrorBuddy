"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { TypingHandMode } from "@/types/tools";

export interface OneHandedModeProps {
  currentMode: TypingHandMode;
  onModeChange: (mode: TypingHandMode) => void;
  disabled?: boolean;
}

export function OneHandedMode({
  currentMode,
  onModeChange,
  disabled = false,
}: OneHandedModeProps) {
  const t = useTranslations("tools.typing.oneHanded");
  const [showInfo, setShowInfo] = useState(false);

  const modes: { value: TypingHandMode; label: string; description: string }[] =
    [
      {
        value: "both",
        label: t("modes.both.label"),
        description: t("modes.both.description"),
      },
      {
        value: "left-only",
        label: t("modes.leftOnly.label"),
        description: t("modes.leftOnly.description"),
      },
      {
        value: "right-only",
        label: t("modes.rightOnly.label"),
        description: t("modes.rightOnly.description"),
      },
    ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t("title")}</h3>
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="text-sm text-primary hover:underline"
          aria-expanded={showInfo}
          aria-controls="one-handed-info"
        >
          {showInfo ? t("hideInfo") : t("showInfo")}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {modes.map((mode) => (
          <button
            key={mode.value}
            onClick={() => !disabled && onModeChange(mode.value)}
            disabled={disabled}
            className={cn(
              "p-4 rounded-xl border text-left transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-primary",
              currentMode === mode.value
                ? "bg-primary text-primary-foreground border-primary shadow-lg"
                : "bg-card hover:bg-muted border-border cursor-pointer",
              disabled && "opacity-50 cursor-not-allowed",
            )}
            aria-pressed={currentMode === mode.value}
          >
            <div className="font-semibold mb-1">{mode.label}</div>
            <div
              className={cn(
                "text-xs",
                currentMode === mode.value
                  ? "text-primary-foreground/80"
                  : "text-muted-foreground",
              )}
            >
              {mode.description}
            </div>
          </button>
        ))}
      </div>

      {showInfo && currentMode !== "both" && (
        <div
          id="one-handed-info"
          className="p-4 bg-primary/10 border border-primary/20 rounded-lg"
          role="note"
        >
          <p className="text-sm">
            <strong>{t("info.active")}</strong> {t("info.description")}
          </p>
          <p className="text-sm mt-2">{t("info.tips")}</p>
          <ul className="list-disc list-inside text-sm mt-1 space-y-1 text-muted-foreground">
            {t.raw("info.tipItems").map((tip: string, index: number) => (
              <li key={index}>{tip}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

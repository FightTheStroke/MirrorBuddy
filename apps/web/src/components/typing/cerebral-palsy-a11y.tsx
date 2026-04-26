"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export interface CerebralPalsySettings {
  adaptiveDifficulty: boolean;
  simplifiedUI: boolean;
  customShortcuts: boolean;
  timeoutExtended: boolean;
}

export function CerebralPalsyA11y({
  settings,
  onSettingsChange,
}: {
  settings: CerebralPalsySettings;
  onSettingsChange: (settings: CerebralPalsySettings) => void;
}) {
  const t = useTranslations("settings.accessibility");

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">{t("cerebralTitle")}</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {t("cerebralDesc")}
        </p>
      </div>

      <div className="space-y-4">
        <SettingCard
          title={t("cerebralAdaptiveDifficulty")}
          description={t("cerebralAdaptiveDifficultyDesc")}
          enabled={settings.adaptiveDifficulty}
          onToggle={() =>
            onSettingsChange({
              ...settings,
              adaptiveDifficulty: !settings.adaptiveDifficulty,
            })
          }
        />

        <SettingCard
          title={t("cerebralSimplifiedUI")}
          description={t("cerebralSimplifiedUIDesc")}
          enabled={settings.simplifiedUI}
          onToggle={() =>
            onSettingsChange({
              ...settings,
              simplifiedUI: !settings.simplifiedUI,
            })
          }
        />

        <SettingCard
          title={t("cerebralCustomShortcuts")}
          description={t("cerebralCustomShortcutsDesc")}
          enabled={settings.customShortcuts}
          onToggle={() =>
            onSettingsChange({
              ...settings,
              customShortcuts: !settings.customShortcuts,
            })
          }
        />

        <SettingCard
          title={t("cerebralTimeoutExtended")}
          description={t("cerebralTimeoutExtendedDesc")}
          enabled={settings.timeoutExtended}
          onToggle={() =>
            onSettingsChange({
              ...settings,
              timeoutExtended: !settings.timeoutExtended,
            })
          }
        />
      </div>
    </div>
  );
}

interface SettingCardProps {
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}

function SettingCard({
  title,
  description,
  enabled,
  onToggle,
}: SettingCardProps) {
  return (
    <div
      className={cn(
        "p-4 border rounded-lg",
        enabled ? "bg-card border-primary/50" : "bg-muted/30",
      )}
    >
      <div className="flex justify-between items-center">
        <div>
          <h4 className="font-semibold">{title}</h4>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <button
          onClick={onToggle}
          className={cn(
            "w-11 h-6 rounded-full transition-colors",
            enabled ? "bg-primary" : "bg-muted",
          )}
        >
          <span
            className={cn(
              "w-4 h-4 bg-white rounded-full block transition-transform",
              enabled ? "translate-x-6" : "translate-x-1",
            )}
          />
        </button>
      </div>
    </div>
  );
}

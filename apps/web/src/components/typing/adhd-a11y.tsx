"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export interface ADHDSettings {
  pomodoroEnabled: boolean;
  workDuration: number;
  breakDuration: number;
  distractionFreeMode: boolean;
  breakReminders: boolean;
}

export function ADHDA11y({
  settings,
  onSettingsChange,
}: {
  settings: ADHDSettings;
  onSettingsChange: (settings: ADHDSettings) => void;
}) {
  const t = useTranslations("settings.accessibility");

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">{t("adhdTitle")}</h3>
        <p className="text-sm text-muted-foreground mb-4">{t("adhdDesc")}</p>
      </div>

      <div className="space-y-4">
        <SettingCard
          title={t("pomodoroTimer")}
          description={t("pomodoroDesc")}
          enabled={settings.pomodoroEnabled}
          onToggle={() =>
            onSettingsChange({
              ...settings,
              pomodoroEnabled: !settings.pomodoroEnabled,
            })
          }
        >
          {settings.pomodoroEnabled && (
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">{t("workLabel")}</label>
                <input
                  type="number"
                  value={settings.workDuration}
                  onChange={(e) =>
                    onSettingsChange({
                      ...settings,
                      workDuration: parseInt(e.target.value),
                    })
                  }
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                  min="5"
                  max="60"
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t("breakLabel")}</label>
                <input
                  type="number"
                  value={settings.breakDuration}
                  onChange={(e) =>
                    onSettingsChange({
                      ...settings,
                      breakDuration: parseInt(e.target.value),
                    })
                  }
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                  min="1"
                  max="30"
                />
              </div>
            </div>
          )}
        </SettingCard>

        <SettingCard
          title={t("distractionFree")}
          description={t("distractionFreeDesc")}
          enabled={settings.distractionFreeMode}
          onToggle={() =>
            onSettingsChange({
              ...settings,
              distractionFreeMode: !settings.distractionFreeMode,
            })
          }
        />

        <SettingCard
          title={t("breakRemindersLabel")}
          description={t("breakRemindersDesc")}
          enabled={settings.breakReminders}
          onToggle={() =>
            onSettingsChange({
              ...settings,
              breakReminders: !settings.breakReminders,
            })
          }
        />
      </div>

      <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
        <p className="text-sm text-muted-foreground">{t("adhdInfo")}</p>
      </div>
    </div>
  );
}

interface SettingCardProps {
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}

function SettingCard({
  title,
  description,
  enabled,
  onToggle,
  children,
}: SettingCardProps) {
  return (
    <div
      className={cn(
        "p-4 border rounded-lg",
        enabled ? "bg-card border-primary/50" : "bg-muted/30",
      )}
    >
      <div className="flex justify-between items-start mb-2">
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
      {children}
    </div>
  );
}

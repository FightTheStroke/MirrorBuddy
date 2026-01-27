"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export interface MotorImpairmentSettings {
  largeClickTargets: boolean;
  keyboardNavigation: boolean;
  adjustableTimeout: boolean;
  timeoutSeconds: number;
  keyboardShortcuts: boolean;
  pauseResumeEnabled: boolean;
}

export function MotorImpairmentA11y({
  settings,
  onSettingsChange,
}: {
  settings: MotorImpairmentSettings;
  onSettingsChange: (settings: MotorImpairmentSettings) => void;
}) {
  const t = useTranslations("settings.accessibility");
  const [showShortcuts, setShowShortcuts] = useState(false);

  const toggleSetting = <K extends keyof MotorImpairmentSettings>(
    key: K,
    value?: MotorImpairmentSettings[K],
  ) => {
    onSettingsChange({
      ...settings,
      [key]: value !== undefined ? value : !settings[key],
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">{t("motorTitle")}</h3>
        <p className="text-sm text-muted-foreground mb-4">{t("motorDesc")}</p>
      </div>

      <div className="space-y-4">
        <SettingCard
          title={t("motorLargeClickTargets")}
          description={t("motorLargeClickTargetsDesc")}
          enabled={settings.largeClickTargets}
          onToggle={() => toggleSetting("largeClickTargets")}
        />

        <SettingCard
          title={t("motorKeyboardNav")}
          description={t("motorKeyboardNavDesc")}
          enabled={settings.keyboardNavigation}
          onToggle={() => toggleSetting("keyboardNavigation")}
        />

        <SettingCard
          title={t("motorAdjustableTimeout")}
          description={t("motorAdjustableTimeoutDesc")}
          enabled={settings.adjustableTimeout}
          onToggle={() => toggleSetting("adjustableTimeout")}
        >
          {settings.adjustableTimeout && (
            <div className="mt-4 space-y-2">
              <label htmlFor="timeout" className="text-sm font-medium">
                {t("motorTimeoutLabel")}
              </label>
              <input
                id="timeout"
                type="number"
                min="5"
                max="300"
                value={settings.timeoutSeconds}
                onChange={(e) =>
                  toggleSetting(
                    "timeoutSeconds",
                    parseInt(e.target.value) || 30,
                  )
                }
                className="w-24 px-3 py-2 border border-border rounded-lg bg-background"
              />
              <p className="text-xs text-muted-foreground">
                {t("motorTimeoutDisableHint")}
              </p>
            </div>
          )}
        </SettingCard>

        <SettingCard
          title={t("motorKeyboardShortcuts")}
          description={t("motorKeyboardShortcutsDesc")}
          enabled={settings.keyboardShortcuts}
          onToggle={() => toggleSetting("keyboardShortcuts")}
        >
          {settings.keyboardShortcuts && (
            <div className="mt-4 space-y-3">
              <button
                onClick={() => setShowShortcuts(!showShortcuts)}
                className="text-sm text-primary hover:underline"
              >
                {showShortcuts
                  ? t("motorHideShortcuts")
                  : t("motorShowShortcuts")}
              </button>

              {showShortcuts && (
                <div className="p-4 bg-muted/50 border border-border rounded-lg space-y-2">
                  {[
                    { keys: ["P"], action: t("motorShortcutPause") },
                    { keys: ["Esc"], action: t("motorShortcutExit") },
                    { keys: ["Tab"], action: t("motorShortcutTab") },
                    { keys: ["Enter"], action: t("motorShortcutEnter") },
                    { keys: ["H"], action: t("motorShortcutHint") },
                    { keys: ["M"], action: t("motorShortcutMute") },
                  ].map((shortcut) => (
                    <div
                      key={shortcut.action}
                      className="flex justify-between items-center"
                    >
                      <span className="text-sm">{shortcut.action}</span>
                      <div className="flex gap-1">
                        {shortcut.keys.map((key) => (
                          <kbd
                            key={key}
                            className="px-2 py-1 bg-background border border-border rounded text-sm"
                          >
                            {key}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </SettingCard>

        <SettingCard
          title={t("motorPauseResume")}
          description={t("motorPauseResumeDesc")}
          enabled={settings.pauseResumeEnabled}
          onToggle={() => toggleSetting("pauseResumeEnabled")}
        />
      </div>

      <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
        <p className="text-sm">
          <strong>Raccomandazioni:</strong> {t("motorRecommendations")}
        </p>
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
        "p-4 border rounded-lg transition-colors",
        enabled ? "bg-card border-primary/50" : "bg-muted/30 border-border",
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className="font-semibold">{title}</h4>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <button
          onClick={onToggle}
          className={cn(
            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
            enabled ? "bg-primary" : "bg-muted",
          )}
          role="switch"
          aria-checked={enabled}
        >
          <span
            className={cn(
              "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
              enabled ? "translate-x-6" : "translate-x-1",
            )}
          />
        </button>
      </div>
      {children}
    </div>
  );
}

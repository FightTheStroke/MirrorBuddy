"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export interface AuditorySettings {
  visualCues: boolean;
  captionsEnabled: boolean;
  noAudioOnlyContent: boolean;
}

export function AuditoryA11y({
  settings,
  onSettingsChange,
}: {
  settings: AuditorySettings;
  onSettingsChange: (settings: AuditorySettings) => void;
}) {
  const t = useTranslations("settings.accessibility");

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">{t("auditoryTitle")}</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {t("auditoryDesc")}
        </p>
      </div>

      <div className="space-y-4">
        <SettingCard
          title={t("auditoryVisualCues")}
          description={t("auditoryVisualCuesDesc")}
          enabled={settings.visualCues}
          onToggle={() =>
            onSettingsChange({ ...settings, visualCues: !settings.visualCues })
          }
        />

        <SettingCard
          title={t("auditoryCaptions")}
          description={t("auditoryCaptionsDesc")}
          enabled={settings.captionsEnabled}
          onToggle={() =>
            onSettingsChange({
              ...settings,
              captionsEnabled: !settings.captionsEnabled,
            })
          }
        />

        <SettingCard
          title={t("auditoryNoAudioOnly")}
          description={t("auditoryNoAudioOnlyDesc")}
          enabled={settings.noAudioOnlyContent}
          onToggle={() =>
            onSettingsChange({
              ...settings,
              noAudioOnlyContent: !settings.noAudioOnlyContent,
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

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export interface DyslexiaSettings {
  openDyslexicFont: boolean;
  extraLetterSpacing: boolean;
  increasedLineHeight: boolean;
  shortTextChunks: boolean;
  audioFeedback: boolean;
}

export function DyslexiaA11y({
  settings,
  onSettingsChange,
}: {
  settings: DyslexiaSettings;
  onSettingsChange: (settings: DyslexiaSettings) => void;
}) {
  const t = useTranslations('settings.accessibility');
  const [showInfo, setShowInfo] = useState(false);

  const toggleSetting = <K extends keyof DyslexiaSettings>(key: K) => {
    onSettingsChange({ ...settings, [key]: !settings[key] });
  };

  return (
    <div
      className={cn(
        "space-y-6",
        settings.openDyslexicFont && "font-[OpenDyslexic]",
      )}
    >
      <div>
        <h3 className="text-lg font-semibold mb-4">
          {t('dyslexiaTitle')}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          {t('dyslexiaDesc')}
        </p>
      </div>

      <div className="space-y-4">
        <SettingCard
          title={t('fontOpenDyslexic')}
          description={t('fontOpenDyslexicDesc')}
          enabled={settings.openDyslexicFont}
          onToggle={() => toggleSetting("openDyslexicFont")}
        />

        <SettingCard
          title={t('spacingExtra')}
          description={t('spacingExtraDesc')}
          enabled={settings.extraLetterSpacing}
          onToggle={() => toggleSetting("extraLetterSpacing")}
        >
          {settings.extraLetterSpacing && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-sm" style={{ letterSpacing: "0.15em" }}>
                {t('spacingExtraText')}
              </p>
            </div>
          )}
        </SettingCard>

        <SettingCard
          title={t('lineHeight')}
          description={t('lineHeightDesc')}
          enabled={settings.increasedLineHeight}
          onToggle={() => toggleSetting("increasedLineHeight")}
        >
          {settings.increasedLineHeight && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-sm" style={{ lineHeight: "1.8" }}>
                Testo con altezza riga aumentata per migliorare la leggibilità. Ogni riga ha più spazio verticale tra di essa.
              </p>
            </div>
          )}
        </SettingCard>

        <SettingCard
          title={t('shortTextChunks')}
          description={t('shortTextChunksDesc')}
          enabled={settings.shortTextChunks}
          onToggle={() => toggleSetting("shortTextChunks")}
        />

        <SettingCard
          title={t('audioFeedback')}
          description={t('audioFeedbackDesc')}
          enabled={settings.audioFeedback}
          onToggle={() => toggleSetting("audioFeedback")}
        />
      </div>

      <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="text-sm text-primary hover:underline"
        >
          {showInfo ? t('hideInfo') : t('showInfo')}
        </button>

        {showInfo && (
          <p className="text-sm mt-2 text-muted-foreground">
            {t('dyslexiaInfo')}
          </p>
        )}
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

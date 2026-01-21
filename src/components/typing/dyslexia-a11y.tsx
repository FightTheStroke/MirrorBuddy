"use client";

import { useState } from "react";
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
          Accessibilità per Dislessia
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Impostazioni ottimizzate per utenti con dislessia o difficoltà di
          lettura.
        </p>
      </div>

      <div className="space-y-4">
        <SettingCard
          title="Font OpenDyslexic"
          description="Font specializzato per facilitare la lettura"
          enabled={settings.openDyslexicFont}
          onToggle={() => toggleSetting("openDyslexicFont")}
        />

        <SettingCard
          title="Spacing extra tra lettere"
          description="Aumenta lo spazio tra le lettere per migliore leggibilità"
          enabled={settings.extraLetterSpacing}
          onToggle={() => toggleSetting("extraLetterSpacing")}
        >
          {settings.extraLetterSpacing && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-sm" style={{ letterSpacing: "0.15em" }}>
                Testo con spacing extra tra le lettere
              </p>
            </div>
          )}
        </SettingCard>

        <SettingCard
          title="Altezza riga aumentata"
          description="Aumenta l'interlinea per ridurre la fatica visiva"
          enabled={settings.increasedLineHeight}
          onToggle={() => toggleSetting("increasedLineHeight")}
        >
          {settings.increasedLineHeight && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-sm" style={{ lineHeight: "1.8" }}>
                Testo con altezza riga aumentata per migliorare la
                leggibilit&agrave;. Ogni riga ha pi&ugrave; spazio verticale tra
                di essa.
              </p>
            </div>
          )}
        </SettingCard>

        <SettingCard
          title="Testi brevi (chunks)"
          description="Divide il testo in sezioni più corte per facilitare la comprensione"
          enabled={settings.shortTextChunks}
          onToggle={() => toggleSetting("shortTextChunks")}
        />

        <SettingCard
          title="Feedback audio"
          description="Legge ad alta voce ogni tasto premuto"
          enabled={settings.audioFeedback}
          onToggle={() => toggleSetting("audioFeedback")}
        />
      </div>

      <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="text-sm text-primary hover:underline"
        >
          {showInfo ? "Nascondi info dislessia" : "Mostra info dislessia"}
        </button>

        {showInfo && (
          <p className="text-sm mt-2 text-muted-foreground">
            Queste impostazioni sono basate sulle raccomandazioni della British
            Dyslexia Association e dell&apos;International Dyslexia Association
            per migliorare l&apos;accessibilit&agrave; per utenti con dislessia.
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

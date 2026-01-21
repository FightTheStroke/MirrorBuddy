"use client";

import { cn } from "@/lib/utils";

export interface AutismSettings {
  reducedMotion: boolean;
  predictableLayouts: boolean;
  minimalUI: boolean;
}

export function AutismA11y({
  settings,
  onSettingsChange,
}: {
  settings: AutismSettings;
  onSettingsChange: (settings: AutismSettings) => void;
}) {
  return (
    <div
      className={cn("space-y-6", settings.reducedMotion && "reduced-motion")}
    >
      <div>
        <h3 className="text-lg font-semibold mb-4">Accessibilità Autismo</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Impostazioni per utenti nello spettro autistico.
        </p>
      </div>

      <div className="space-y-4">
        <SettingCard
          title="Motion ridotto"
          description="Disabilita le animazioni non necessarie"
          enabled={settings.reducedMotion}
          onToggle={() =>
            onSettingsChange({
              ...settings,
              reducedMotion: !settings.reducedMotion,
            })
          }
        />

        <SettingCard
          title="Layout prevedibili"
          description="Mantiene una struttura consistente e prevedibile"
          enabled={settings.predictableLayouts}
          onToggle={() =>
            onSettingsChange({
              ...settings,
              predictableLayouts: !settings.predictableLayouts,
            })
          }
        />

        <SettingCard
          title="UI minimalista"
          description="Rimuove elementi decorativi e distrazioni"
          enabled={settings.minimalUI}
          onToggle={() =>
            onSettingsChange({ ...settings, minimalUI: !settings.minimalUI })
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

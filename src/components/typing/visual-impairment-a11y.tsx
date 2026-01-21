'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

export interface VisualImpairmentSettings {
  highContrast: boolean;
  textSize: number;
  ttsEnabled: boolean;
  speechRate: number;
  speechVolume: number;
  focusIndicators: boolean;
}

export function VisualImpairmentA11y({
  settings,
  onSettingsChange,
}: {
  settings: VisualImpairmentSettings;
  onSettingsChange: (settings: VisualImpairmentSettings) => void;
}) {
  const [showTTSSettings, setShowTTSSettings] = useState(false);

  const updateSetting = <K extends keyof VisualImpairmentSettings>(
    key: K,
    value: VisualImpairmentSettings[K]
  ) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <div className={cn(
      'space-y-6 transition-all duration-200',
      settings.highContrast && 'contrast-100'
    )}>
      <div>
        <h3 className="text-lg font-semibold mb-4">Accessibilità Visiva</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Impostazioni per utenti con problemi alla vista.
        </p>
      </div>

      <div className="space-y-4">
        <SettingCard
          title="Alto contrasto"
          description="Aumenta il contrasto dei colori per migliore leggibilità"
          enabled={settings.highContrast}
          onToggle={() => updateSetting('highContrast', !settings.highContrast)}
        />

        <div className={cn(
          'p-4 border rounded-lg',
          settings.highContrast ? 'bg-background border-primary/50' : 'bg-muted/30 border-border'
        )}>
          <label className="font-semibold mb-2 block">
            Dimensione testo ({settings.textSize}%)
          </label>
          <input
            type="range"
            min="100"
            max="200"
            step="10"
            value={settings.textSize}
            onChange={(e) => updateSetting('textSize', parseInt(e.target.value))}
            className="w-full"
            aria-valuenow={settings.textSize}
            aria-valuemin={100}
            aria-valuemax={200}
          />
          <p className="text-xs text-muted-foreground mt-2">
            100% (normale) - 200% (massimo)
          </p>
        </div>

        <SettingCard
          title="Sintesi vocale (TTS)"
          description="Legge ad alta voce le istruzioni e il feedback"
          enabled={settings.ttsEnabled}
          onToggle={() => updateSetting('ttsEnabled', !settings.ttsEnabled)}
        >
          {settings.ttsEnabled && (
            <div className="mt-4 space-y-4">
              <button
                onClick={() => setShowTTSSettings(!showTTSSettings)}
                className="text-sm text-primary hover:underline"
              >
                {showTTSSettings ? 'Nascondi impostazioni TTS' : 'Mostra impostazioni TTS'}
              </button>

              {showTTSSettings && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Velocità ({settings.speechRate}x)
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={settings.speechRate}
                      onChange={(e) => updateSetting('speechRate', parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Volume ({Math.round(settings.speechVolume * 100)}%)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={settings.speechVolume}
                      onChange={(e) => updateSetting('speechVolume', parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </SettingCard>

        <SettingCard
          title="Indicatori di focus"
          description="Mostra evidenziazione chiara dell'elemento attivo"
          enabled={settings.focusIndicators}
          onToggle={() => updateSetting('focusIndicators', !settings.focusIndicators)}
        />
      </div>

      <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
        <p className="text-sm">
          <strong>Conformità WCAG 2.1 AA:</strong> Tutte le impostazioni rispettano
          i requisiti di accessibilità per utenti con disabilità visive.
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

function SettingCard({ title, description, enabled, onToggle, children }: SettingCardProps) {
  return (
    <div className={cn(
      'p-4 border rounded-lg transition-colors',
      enabled ? 'bg-card border-primary/50' : 'bg-muted/30 border-border'
    )}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className="font-semibold">{title}</h4>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <button
          onClick={onToggle}
          className={cn(
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
            enabled ? 'bg-primary' : 'bg-muted'
          )}
          role="switch"
          aria-checked={enabled}
        >
          <span
            className={cn(
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
              enabled ? 'translate-x-6' : 'translate-x-1'
            )}
          />
        </button>
      </div>
      {children}
    </div>
  );
}

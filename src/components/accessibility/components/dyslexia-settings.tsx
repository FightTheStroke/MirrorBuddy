/**
 * @file dyslexia-settings.tsx
 * @brief Dyslexia settings component
 */

import { TextIcon, Volume2 } from 'lucide-react';
import { useAccessibilityStore } from '@/lib/accessibility/accessibility-store';
import { Toggle } from './toggle';
import { Slider } from './slider';

export function DyslexiaSettings() {
  const { settings, updateSettings } = useAccessibilityStore();

  return (
    <div className="space-y-4">
      <Toggle
        label="Font per dislessia"
        description="Usa OpenDyslexic o font simili"
        checked={settings.dyslexiaFont}
        onChange={(v) => updateSettings({ dyslexiaFont: v })}
        icon={<TextIcon className="w-5 h-5" />}
      />

      {settings.dyslexiaFont && (
        <>
          <Toggle
            label="Spaziatura lettere extra"
            description="Aumenta lo spazio tra le lettere"
            checked={settings.extraLetterSpacing}
            onChange={(v) => updateSettings({ extraLetterSpacing: v })}
          />

          <Toggle
            label="Altezza riga aumentata"
            description="Usa 1.5x di interlinea"
            checked={settings.increasedLineHeight}
            onChange={(v) => updateSettings({ increasedLineHeight: v })}
          />
        </>
      )}

      <Slider
        label="Interlinea"
        value={settings.lineSpacing}
        onChange={(v) => updateSettings({ lineSpacing: v })}
        min={1}
        max={2}
        step={0.1}
        unit="x"
      />

      <Slider
        label="Dimensione font"
        value={settings.fontSize}
        onChange={(v) => updateSettings({ fontSize: v })}
        min={0.8}
        max={1.5}
        step={0.1}
        unit="x"
      />

      <Toggle
        label="Sintesi vocale (TTS)"
        description="Leggi il testo ad alta voce"
        checked={settings.ttsEnabled}
        onChange={(v) => updateSettings({ ttsEnabled: v })}
        icon={<Volume2 className="w-5 h-5" />}
      />

      {settings.ttsEnabled && (
        <>
          <Slider
            label="Velocità voce"
            value={settings.ttsSpeed}
            onChange={(v) => updateSettings({ ttsSpeed: v })}
            min={0.5}
            max={2}
            step={0.1}
            unit="x"
          />

          <Toggle
            label="Lettura automatica"
            description="Leggi automaticamente i nuovi contenuti"
            checked={settings.ttsAutoRead}
            onChange={(v) => updateSettings({ ttsAutoRead: v })}
          />
        </>
      )}
    </div>
  );
}


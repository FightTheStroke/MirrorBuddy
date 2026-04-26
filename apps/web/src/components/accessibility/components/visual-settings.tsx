/**
 * @file visual-settings.tsx
 * @brief Visual settings component
 */

import { Eye } from "lucide-react";
import { useAccessibilityStore } from "@/lib/accessibility";
import { Toggle } from "./toggle";
import { Slider } from "./slider";

export function VisualSettings() {
  const { settings, updateSettings } = useAccessibilityStore();

  return (
    <div className="space-y-4">
      <Toggle
        label="Alto contrasto"
        description="Aumenta il contrasto per migliore visibilità"
        checked={settings.highContrast}
        onChange={(v) => updateSettings({ highContrast: v })}
        icon={<Eye className="w-5 h-5" />}
      />

      <Toggle
        label="Testo grande"
        description="Aumenta tutte le dimensioni del 20%"
        checked={settings.largeText}
        onChange={(v) => updateSettings({ largeText: v })}
      />

      <Toggle
        label="Modalità daltonismo"
        description="Usa palette colori adatte"
        checked={settings.colorBlindMode}
        onChange={(v) => updateSettings({ colorBlindMode: v })}
      />

      <Toggle
        label="Riduci movimento"
        description="Minimizza animazioni e transizioni"
        checked={settings.reducedMotion}
        onChange={(v) => updateSettings({ reducedMotion: v })}
      />

      <Slider
        label="Moltiplicatore font"
        value={settings.fontSize}
        onChange={(v) => updateSettings({ fontSize: v })}
        min={0.8}
        max={1.5}
        step={0.1}
        unit="x"
      />
    </div>
  );
}

/**
 * @file motor-settings.tsx
 * @brief Motor settings component
 */

import { Hand } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAccessibilityStore } from '@/lib/accessibility/accessibility-store';
import { Toggle } from './toggle';

export function MotorSettings() {
  const { settings, updateSettings } = useAccessibilityStore();

  return (
    <div className="space-y-4">
      <Toggle
        label="Navigazione da tastiera"
        description="Naviga usando solo la tastiera"
        checked={settings.keyboardNavigation}
        onChange={(v) => updateSettings({ keyboardNavigation: v })}
        icon={<Hand className="w-5 h-5" />}
      />

      <Toggle
        label="Riduci movimento"
        description="Disabilita animazioni"
        checked={settings.reducedMotion}
        onChange={(v) => updateSettings({ reducedMotion: v })}
      />

      <div
        className={cn(
          'p-4 rounded-lg',
          settings.highContrast
            ? 'bg-gray-900 border border-gray-700'
            : 'bg-blue-50 dark:bg-blue-900/20'
        )}
      >
        <h4
          className={cn(
            'font-medium mb-3',
            settings.highContrast
              ? 'text-yellow-400'
              : 'text-blue-700 dark:text-blue-300'
          )}
        >
          Scorciatoie da tastiera
        </h4>
        <ul className="space-y-2 text-sm">
          {[
            { key: 'Tab', desc: 'Naviga tra gli elementi' },
            { key: '↑↓', desc: 'Seleziona opzioni' },
            { key: 'Enter', desc: 'Attiva pulsanti' },
            { key: 'Esc', desc: 'Chiudi dialoghi' },
          ].map((item) => (
            <li key={item.key} className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded">
                {item.key}
              </kbd>
              <span>{item.desc}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}


/**
 * @file presets-settings.tsx
 * @brief Presets settings component
 */

import {
  TextIcon,
  Brain,
  Eye,
  Hand,
  Puzzle,
  EarOff,
  Accessibility,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAccessibilityStore } from '@/lib/accessibility/accessibility-store';

interface PresetsSettingsProps {
  onApplyDyslexia: () => void;
  onApplyADHD: () => void;
  onApplyVisual: () => void;
  onApplyMotor: () => void;
  onApplyAutism: () => void;
  onApplyAuditory: () => void;
  onApplyCerebralPalsy: () => void;
  onReset: () => void;
}

export function PresetsSettings({
  onApplyDyslexia,
  onApplyADHD,
  onApplyVisual,
  onApplyMotor,
  onApplyAutism,
  onApplyAuditory,
  onApplyCerebralPalsy,
  onReset,
}: PresetsSettingsProps) {
  const { settings } = useAccessibilityStore();

  const presets = [
    {
      title: 'Profilo Dislessia',
      description: 'Font ottimizzato, spaziatura e TTS',
      icon: <TextIcon className="w-6 h-6" />,
      color: 'blue',
      onClick: onApplyDyslexia,
    },
    {
      title: 'Profilo ADHD',
      description: 'Focus mode, timer e pause',
      icon: <Brain className="w-6 h-6" />,
      color: 'purple',
      onClick: onApplyADHD,
    },
    {
      title: 'Profilo Autismo',
      description: 'Ambiente calmo, no distrazioni',
      icon: <Puzzle className="w-6 h-6" />,
      color: 'teal',
      onClick: onApplyAutism,
    },
    {
      title: 'Profilo Visivo',
      description: 'Alto contrasto, testo grande, TTS',
      icon: <Eye className="w-6 h-6" />,
      color: 'orange',
      onClick: onApplyVisual,
    },
    {
      title: 'Profilo Uditivo',
      description: 'Focus su comunicazione visiva',
      icon: <EarOff className="w-6 h-6" />,
      color: 'pink',
      onClick: onApplyAuditory,
    },
    {
      title: 'Profilo Motorio',
      description: 'Navigazione tastiera, no animazioni',
      icon: <Hand className="w-6 h-6" />,
      color: 'green',
      onClick: onApplyMotor,
    },
    {
      title: 'Paralisi Cerebrale',
      description: 'TTS, testo grande, navigazione facilitata',
      icon: <Accessibility className="w-6 h-6" />,
      color: 'cyan',
      onClick: onApplyCerebralPalsy,
    },
  ];

  return (
    <div className="space-y-4">
      {presets.map((preset) => (
        <button
          key={preset.title}
          onClick={preset.onClick}
          className={cn(
            'w-full flex items-center gap-4 p-4 rounded-lg text-left transition-colors',
            settings.highContrast
              ? 'bg-gray-900 border border-gray-700 hover:border-yellow-400'
              : 'bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800'
          )}
        >
          <span
            className={cn(
              'p-3 rounded-lg',
              settings.highContrast
                ? 'bg-yellow-400/20 text-yellow-400'
                : `bg-${preset.color}-100 dark:bg-${preset.color}-900/30 text-${preset.color}-600 dark:text-${preset.color}-400`
            )}
          >
            {preset.icon}
          </span>

          <div className="flex-1">
            <span
              className={cn(
                'block font-medium',
                settings.highContrast
                  ? 'text-white'
                  : 'text-slate-900 dark:text-white'
              )}
            >
              {preset.title}
            </span>
            <span
              className={cn(
                'block text-sm',
                settings.highContrast
                  ? 'text-gray-400'
                  : 'text-slate-500 dark:text-slate-400'
              )}
            >
              {preset.description}
            </span>
          </div>

          <ChevronRight
            className={cn(
              'w-5 h-5',
              settings.highContrast ? 'text-yellow-400' : 'text-slate-400'
            )}
          />
        </button>
      ))}

      <button
        onClick={onReset}
        className={cn(
          'w-full flex items-center justify-center gap-2 p-4 rounded-lg transition-colors',
          settings.highContrast
            ? 'bg-red-900 text-white hover:bg-red-800'
            : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30'
        )}
      >
        <RotateCcw className="w-5 h-5" />
        <span>Ripristina impostazioni predefinite</span>
      </button>
    </div>
  );
}


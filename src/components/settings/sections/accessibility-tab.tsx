'use client';

import { Accessibility, Settings, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Accessibility Tab
interface AccessibilitySettings {
  dyslexiaFont?: boolean;
  extraLetterSpacing?: boolean;
  increasedLineHeight?: boolean;
  highContrast?: boolean;
  largeText?: boolean;
  ttsEnabled?: boolean;
  ttsAutoRead?: boolean;
  adhdMode?: boolean;
  distractionFreeMode?: boolean;
  breakReminders?: boolean;
  reducedMotion?: boolean;
  keyboardNavigation?: boolean;
  visualFirstMode?: boolean; // For auditory disabilities - visual-first communication
}

interface AccessibilityTabProps {
  settings: AccessibilitySettings;
  onOpenModal: () => void;
  onUpdateSettings: (updates: Partial<AccessibilitySettings>) => void;
}

// Accessibility profile presets - Fix for #9
const accessibilityProfiles = [
  {
    id: 'dyslexia',
    label: 'Dislessia',
    description: 'Font OpenDyslexic, spaziatura ottimizzata',
    color: 'blue',
    icon: '📖',
    isActive: (s: AccessibilitySettings) => s.dyslexiaFont,
    toggle: (s: AccessibilitySettings) => ({ dyslexiaFont: !s.dyslexiaFont, extraLetterSpacing: !s.dyslexiaFont, increasedLineHeight: !s.dyslexiaFont }),
  },
  {
    id: 'adhd',
    label: 'ADHD',
    description: 'Timer Pomodoro (25/5 min), focus mode, notifiche pause',
    color: 'purple',
    icon: '🎯',
    isActive: (s: AccessibilitySettings) => s.adhdMode,
    toggle: (s: AccessibilitySettings) => ({ adhdMode: !s.adhdMode, distractionFreeMode: !s.adhdMode, breakReminders: !s.adhdMode }),
  },
  {
    id: 'visual',
    label: 'Visivo',
    description: 'Alto contrasto, testo grande',
    color: 'amber',
    icon: '👁️',
    isActive: (s: AccessibilitySettings) => s.highContrast || s.largeText,
    toggle: (s: AccessibilitySettings) => ({ highContrast: !(s.highContrast && s.largeText), largeText: !(s.highContrast && s.largeText) }),
  },
  {
    id: 'motor',
    label: 'Motorio',
    description: 'Navigazione tastiera, target grandi',
    color: 'green',
    icon: '🖐️',
    isActive: (s: AccessibilitySettings) => s.keyboardNavigation,
    toggle: (s: AccessibilitySettings) => ({ keyboardNavigation: !s.keyboardNavigation }),
  },
  {
    id: 'autism',
    label: 'Autismo',
    description: 'Layout prevedibili, meno stimoli',
    color: 'teal',
    icon: '🧩',
    isActive: (s: AccessibilitySettings) => s.reducedMotion && s.distractionFreeMode,
    toggle: (s: AccessibilitySettings) => ({ reducedMotion: !(s.reducedMotion && s.distractionFreeMode), distractionFreeMode: !(s.reducedMotion && s.distractionFreeMode) }),
  },
  {
    id: 'auditory',
    label: 'Uditivo',
    description: 'Comunicazione visiva, no dipendenza audio',
    color: 'rose',
    icon: '👂',
    isActive: (s: AccessibilitySettings) => s.visualFirstMode,
    toggle: (s: AccessibilitySettings) => ({ visualFirstMode: !s.visualFirstMode }),
  },
  {
    id: 'cerebral-palsy',
    label: 'Paralisi Cerebrale',
    description: 'TTS, testo grande, tastiera, spaziatura extra',
    color: 'blue',
    icon: '♿',
    isActive: (s: AccessibilitySettings) => s.ttsEnabled && s.largeText && s.keyboardNavigation,
    toggle: (s: AccessibilitySettings) => ({
      ttsEnabled: !(s.ttsEnabled && s.largeText && s.keyboardNavigation),
      largeText: !(s.ttsEnabled && s.largeText && s.keyboardNavigation),
      keyboardNavigation: !(s.ttsEnabled && s.largeText && s.keyboardNavigation),
      extraLetterSpacing: !(s.ttsEnabled && s.largeText && s.keyboardNavigation),
    }),
  },
] as const;

const profileColors: Record<string, { bg: string; bgActive: string; border: string; borderActive: string; text: string; ring: string }> = {
  blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', bgActive: 'bg-blue-100 dark:bg-blue-900/40', border: 'border-blue-200 dark:border-blue-800 hover:border-blue-400', borderActive: 'border-blue-500', text: 'text-blue-700 dark:text-blue-300', ring: 'ring-blue-500/50' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', bgActive: 'bg-purple-100 dark:bg-purple-900/40', border: 'border-purple-200 dark:border-purple-800 hover:border-purple-400', borderActive: 'border-purple-500', text: 'text-purple-700 dark:text-purple-300', ring: 'ring-purple-500/50' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', bgActive: 'bg-amber-100 dark:bg-amber-900/40', border: 'border-amber-200 dark:border-amber-800 hover:border-amber-400', borderActive: 'border-amber-500', text: 'text-amber-700 dark:text-amber-300', ring: 'ring-amber-500/50' },
  green: { bg: 'bg-green-50 dark:bg-green-900/20', bgActive: 'bg-green-100 dark:bg-green-900/40', border: 'border-green-200 dark:border-green-800 hover:border-green-400', borderActive: 'border-green-500', text: 'text-green-700 dark:text-green-300', ring: 'ring-green-500/50' },
  teal: { bg: 'bg-teal-50 dark:bg-teal-900/20', bgActive: 'bg-teal-100 dark:bg-teal-900/40', border: 'border-teal-200 dark:border-teal-800 hover:border-teal-400', borderActive: 'border-teal-500', text: 'text-teal-700 dark:text-teal-300', ring: 'ring-teal-500/50' },
  rose: { bg: 'bg-rose-50 dark:bg-rose-900/20', bgActive: 'bg-rose-100 dark:bg-rose-900/40', border: 'border-rose-200 dark:border-rose-800 hover:border-rose-400', borderActive: 'border-rose-500', text: 'text-rose-700 dark:text-rose-300', ring: 'ring-rose-500/50' },
};

export function AccessibilityTab({ settings, onOpenModal, onUpdateSettings }: AccessibilityTabProps) {
  const activeFeatures = [
    settings.dyslexiaFont && 'Font dislessia',
    settings.highContrast && 'Alto contrasto',
    settings.largeText && 'Testo grande',
    settings.ttsEnabled && 'Sintesi vocale',
    settings.adhdMode && 'Modalita ADHD',
    settings.reducedMotion && 'Animazioni ridotte',
    settings.keyboardNavigation && 'Navigazione tastiera',
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Accessibility className="w-5 h-5 text-purple-500" />
            Profili di Accessibilita
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-600 dark:text-slate-400">
            Seleziona uno o piu profili per personalizzare l&apos;esperienza in base alle tue esigenze.
          </p>

          {/* All accessibility profiles - Fix for #9 */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {accessibilityProfiles.map(profile => {
              const colors = profileColors[profile.color];
              const isActive = profile.isActive(settings);
              return (
                <button
                  key={profile.id}
                  onClick={() => onUpdateSettings(profile.toggle(settings))}
                  className={cn(
                    'text-left p-3 rounded-xl border-2 transition-all',
                    isActive
                      ? `${colors.bgActive} ${colors.borderActive} ring-2 ${colors.ring}`
                      : `${colors.bg} ${colors.border}`
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{profile.icon}</span>
                    <h4 className={cn('font-medium text-sm', colors.text)}>
                      {profile.label}
                    </h4>
                    <div className={cn(
                      'w-4 h-4 rounded-full border-2 flex items-center justify-center ml-auto',
                      isActive ? `${colors.borderActive} bg-current` : 'border-slate-300'
                    )}>
                      {isActive && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                  </div>
                  <p className={cn('text-xs opacity-80', colors.text)}>
                    {profile.description}
                  </p>
                </button>
              );
            })}
          </div>

          {activeFeatures.length > 0 && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
              <h4 className="font-medium text-green-700 dark:text-green-400 mb-2 text-sm">
                Funzionalita attive:
              </h4>
              <div className="flex flex-wrap gap-2">
                {activeFeatures.map((feature, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 bg-green-100 dark:bg-green-800/50 text-green-700 dark:text-green-300 rounded-full text-xs"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          )}

          <Button
            onClick={onOpenModal}
            variant="outline"
            className="w-full"
          >
            <Settings className="w-4 h-4 mr-2" />
            Personalizza impostazioni avanzate
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Settings,
  Eye,
  Brain,
  Hand,
  Star,
  TextIcon,
  Volume2,
  RotateCcw,
  ChevronRight,
  Puzzle,
  EarOff,
  Accessibility,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAccessibilityStore } from '@/lib/accessibility/accessibility-store';

interface AccessibilitySettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

type Category = 'dyslexia' | 'adhd' | 'visual' | 'motor' | 'presets';

const categories: Array<{ id: Category; label: string; icon: React.ReactNode; description: string }> = [
  {
    id: 'dyslexia',
    label: 'Dislessia',
    icon: <TextIcon className="w-5 h-5" />,
    description: 'Font, spaziatura e supporto TTS',
  },
  {
    id: 'adhd',
    label: 'ADHD',
    icon: <Brain className="w-5 h-5" />,
    description: 'Focus mode, timer e pause',
  },
  {
    id: 'visual',
    label: 'Visivo',
    icon: <Eye className="w-5 h-5" />,
    description: 'Contrasto e dimensioni testo',
  },
  {
    id: 'motor',
    label: 'Motorio',
    icon: <Hand className="w-5 h-5" />,
    description: 'Navigazione da tastiera',
  },
  {
    id: 'presets',
    label: 'Profili',
    icon: <Star className="w-5 h-5" />,
    description: 'Configurazioni rapide',
  },
];

export function AccessibilitySettings({ isOpen, onClose }: AccessibilitySettingsProps) {
  const [selectedCategory, setSelectedCategory] = useState<Category>('dyslexia');
  const {
    settings,
    resetSettings,
    applyDyslexiaProfile,
    applyADHDProfile,
    applyVisualImpairmentProfile,
    applyMotorImpairmentProfile,
    applyAutismProfile,
    applyAuditoryImpairmentProfile,
    applyCerebralPalsyProfile,
    shouldAnimate,
  } = useAccessibilityStore();

  const animationDuration = shouldAnimate() ? 0.3 : 0;

  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: animationDuration }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="accessibility-title"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: animationDuration }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl flex',
              settings.highContrast
                ? 'bg-black border-2 border-yellow-400'
                : 'bg-white dark:bg-slate-900'
            )}
          >
            {/* Sidebar */}
            <nav
              className={cn(
                'w-56 flex-shrink-0 border-r p-4',
                settings.highContrast
                  ? 'border-yellow-400 bg-black'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50'
              )}
              aria-label="Categorie accessibilità"
            >
              <div className="flex items-center gap-2 mb-6">
                <Settings
                  className={cn(
                    'w-6 h-6',
                    settings.highContrast ? 'text-yellow-400' : 'text-blue-500'
                  )}
                />
                <h2
                  id="accessibility-title"
                  className={cn(
                    'font-bold',
                    settings.highContrast ? 'text-yellow-400' : 'text-slate-900 dark:text-white',
                    settings.dyslexiaFont && 'tracking-wide'
                  )}
                  style={{ fontSize: `${16 * (settings.largeText ? 1.2 : 1)}px` }}
                >
                  Accessibilità
                </h2>
              </div>

              <ul className="space-y-1">
                {categories.map((cat) => (
                  <li key={cat.id}>
                    <button
                      onClick={() => setSelectedCategory(cat.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                        selectedCategory === cat.id
                          ? settings.highContrast
                            ? 'bg-yellow-400 text-black'
                            : 'bg-accent-themed text-white'
                          : settings.highContrast
                            ? 'text-white hover:bg-yellow-400/20'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700',
                        settings.dyslexiaFont && 'tracking-wide'
                      )}
                      style={{ fontSize: `${14 * (settings.largeText ? 1.2 : 1)}px` }}
                    >
                      {cat.icon}
                      <span className="font-medium">{cat.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Main content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Header */}
              <header
                className={cn(
                  'flex items-center justify-between px-6 py-4 border-b',
                  settings.highContrast
                    ? 'border-yellow-400'
                    : 'border-slate-200 dark:border-slate-700'
                )}
              >
                <div>
                  <h3
                    className={cn(
                      'font-bold',
                      settings.highContrast ? 'text-yellow-400' : 'text-slate-900 dark:text-white',
                      settings.dyslexiaFont && 'tracking-wide'
                    )}
                    style={{ fontSize: `${20 * (settings.largeText ? 1.2 : 1)}px` }}
                  >
                    {categories.find((c) => c.id === selectedCategory)?.label}
                  </h3>
                  <p
                    className={cn(
                      'text-sm',
                      settings.highContrast ? 'text-gray-300' : 'text-slate-500 dark:text-slate-400',
                      settings.dyslexiaFont && 'tracking-wide'
                    )}
                  >
                    {categories.find((c) => c.id === selectedCategory)?.description}
                  </p>
                </div>

                <button
                  onClick={onClose}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    settings.highContrast
                      ? 'text-yellow-400 hover:bg-yellow-400/20'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                  aria-label="Chiudi impostazioni"
                >
                  <X className="w-5 h-5" />
                </button>
              </header>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {selectedCategory === 'dyslexia' && <DyslexiaSettings />}
                {selectedCategory === 'adhd' && <ADHDSettings />}
                {selectedCategory === 'visual' && <VisualSettings />}
                {selectedCategory === 'motor' && <MotorSettings />}
                {selectedCategory === 'presets' && (
                  <PresetsSettings
                    onApplyDyslexia={applyDyslexiaProfile}
                    onApplyADHD={applyADHDProfile}
                    onApplyVisual={applyVisualImpairmentProfile}
                    onApplyMotor={applyMotorImpairmentProfile}
                    onApplyAutism={applyAutismProfile}
                    onApplyAuditory={applyAuditoryImpairmentProfile}
                    onApplyCerebralPalsy={applyCerebralPalsyProfile}
                    onReset={resetSettings}
                  />
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Toggle component
interface ToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon?: React.ReactNode;
}

function Toggle({ label, description, checked, onChange, icon }: ToggleProps) {
  const { settings } = useAccessibilityStore();

  return (
    <label
      className={cn(
        'flex items-center gap-4 p-4 rounded-lg cursor-pointer transition-colors',
        settings.highContrast
          ? 'bg-gray-900 hover:bg-gray-800 border border-gray-700'
          : 'bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800'
      )}
    >
      {icon && (
        <span className={settings.highContrast ? 'text-yellow-400' : 'text-blue-500'}>
          {icon}
        </span>
      )}

      <div className="flex-1">
        <span
          className={cn(
            'block font-medium',
            settings.highContrast ? 'text-white' : 'text-slate-900 dark:text-white',
            settings.dyslexiaFont && 'tracking-wide'
          )}
          style={{ fontSize: `${14 * (settings.largeText ? 1.2 : 1)}px` }}
        >
          {label}
        </span>
        <span
          className={cn(
            'block text-sm',
            settings.highContrast ? 'text-gray-400' : 'text-slate-500 dark:text-slate-400',
            settings.dyslexiaFont && 'tracking-wide'
          )}
        >
          {description}
        </span>
      </div>

      <div
        className={cn(
          'relative w-12 h-7 rounded-full transition-colors',
          checked
            ? settings.highContrast
              ? 'bg-yellow-400'
              : 'bg-accent-themed'
            : settings.highContrast
              ? 'bg-gray-700'
              : 'bg-slate-300 dark:bg-slate-600'
        )}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <span
          className={cn(
            'absolute top-1 left-1 w-5 h-5 rounded-full transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0',
            settings.highContrast ? 'bg-black' : 'bg-white'
          )}
        />
      </div>
    </label>
  );
}

// Slider component
interface SliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  unit?: string;
}

function Slider({ label, value, onChange, min, max, step, unit = '' }: SliderProps) {
  const { settings } = useAccessibilityStore();

  // Calculate discrete steps for step buttons (Fix #12)
  const stepValues: number[] = [];
  for (let v = min; v <= max; v = Math.round((v + step) * 10) / 10) {
    stepValues.push(v);
  }

  const currentIndex = stepValues.findIndex(v => Math.abs(v - value) < 0.01);
  const canDecrease = currentIndex > 0;
  const canIncrease = currentIndex < stepValues.length - 1;

  const handleDecrease = () => {
    if (canDecrease) {
      onChange(stepValues[currentIndex - 1]);
    }
  };

  const handleIncrease = () => {
    if (canIncrease) {
      onChange(stepValues[currentIndex + 1]);
    }
  };

  return (
    <div
      className={cn(
        'p-4 rounded-lg',
        settings.highContrast
          ? 'bg-gray-900 border border-gray-700'
          : 'bg-slate-50 dark:bg-slate-800/50'
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className={cn(
            'font-medium',
            settings.highContrast ? 'text-white' : 'text-slate-900 dark:text-white',
            settings.dyslexiaFont && 'tracking-wide'
          )}
          style={{ fontSize: `${14 * (settings.largeText ? 1.2 : 1)}px` }}
        >
          {label}
        </span>
      </div>

      {/* Step buttons (Fix #12) */}
      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={handleDecrease}
          disabled={!canDecrease}
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold transition-all',
            settings.highContrast
              ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600 disabled:opacity-30'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-30'
          )}
          aria-label="Diminuisci"
        >
          −
        </button>

        <span
          className={cn(
            'font-mono text-2xl min-w-[80px] text-center',
            settings.highContrast ? 'text-yellow-400' : 'text-blue-500'
          )}
        >
          {value.toFixed(1)}{unit}
        </span>

        <button
          type="button"
          onClick={handleIncrease}
          disabled={!canIncrease}
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold transition-all',
            settings.highContrast
              ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600 disabled:opacity-30'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-30'
          )}
          aria-label="Aumenta"
        >
          +
        </button>
      </div>

      {/* Step indicator dots */}
      <div className="flex justify-center gap-1.5 mt-3">
        {stepValues.map((v, i) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={cn(
              'w-2 h-2 rounded-full transition-all',
              i === currentIndex
                ? settings.highContrast ? 'bg-yellow-400 w-3' : 'bg-accent-themed w-3'
                : settings.highContrast ? 'bg-gray-600' : 'bg-slate-300 dark:bg-slate-600'
            )}
            aria-label={`${v}${unit}`}
          />
        ))}
      </div>
    </div>
  );
}

// Category-specific settings
function DyslexiaSettings() {
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

function ADHDSettings() {
  const { settings, updateSettings, adhdConfig, updateADHDConfig, adhdStats } =
    useAccessibilityStore();

  return (
    <div className="space-y-4">
      <Toggle
        label="Modalità ADHD"
        description="Attiva funzionalità per la concentrazione"
        checked={settings.adhdMode}
        onChange={(v) => updateSettings({ adhdMode: v })}
        icon={<Brain className="w-5 h-5" />}
      />

      <Toggle
        label="Modalità senza distrazioni"
        description="Nascondi elementi UI non essenziali"
        checked={settings.distractionFreeMode}
        onChange={(v) => updateSettings({ distractionFreeMode: v })}
      />

      <Toggle
        label="Promemoria pause"
        description="Ricevi notifiche per le pause"
        checked={settings.breakReminders}
        onChange={(v) => updateSettings({ breakReminders: v })}
      />

      <div
        className={cn(
          'p-4 rounded-lg',
          settings.highContrast
            ? 'bg-gray-900 border border-gray-700'
            : 'bg-slate-50 dark:bg-slate-800/50'
        )}
      >
        <h4
          className={cn(
            'font-medium mb-3',
            settings.highContrast ? 'text-yellow-400' : 'text-slate-900 dark:text-white'
          )}
        >
          Timer Sessione
        </h4>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-slate-500 dark:text-slate-400">
              Lavoro (min)
            </label>
            <input
              type="number"
              value={Math.floor(adhdConfig.workDuration / 60)}
              onChange={(e) =>
                updateADHDConfig({ workDuration: parseInt(e.target.value) * 60 })
              }
              min={5}
              max={60}
              className={cn(
                'w-full mt-1 px-3 py-2 rounded-lg border',
                settings.highContrast
                  ? 'bg-black border-yellow-400 text-white'
                  : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600'
              )}
            />
          </div>

          <div>
            <label className="text-sm text-slate-500 dark:text-slate-400">
              Pausa (min)
            </label>
            <input
              type="number"
              value={Math.floor(adhdConfig.breakDuration / 60)}
              onChange={(e) =>
                updateADHDConfig({ breakDuration: parseInt(e.target.value) * 60 })
              }
              min={3}
              max={30}
              className={cn(
                'w-full mt-1 px-3 py-2 rounded-lg border',
                settings.highContrast
                  ? 'bg-black border-yellow-400 text-white'
                  : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600'
              )}
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div
        className={cn(
          'p-4 rounded-lg',
          settings.highContrast
            ? 'bg-gray-900 border border-gray-700'
            : 'bg-slate-50 dark:bg-slate-800/50'
        )}
      >
        <h4
          className={cn(
            'font-medium mb-3',
            settings.highContrast ? 'text-yellow-400' : 'text-slate-900 dark:text-white'
          )}
        >
          Le tue statistiche
        </h4>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-500 dark:text-slate-400">Sessioni totali:</span>
            <span className="ml-2 font-medium">{adhdStats.totalSessions}</span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">Completate:</span>
            <span className="ml-2 font-medium">{adhdStats.completedSessions}</span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">Serie attuale:</span>
            <span className="ml-2 font-medium">{adhdStats.currentStreak} giorni</span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">XP totali:</span>
            <span className="ml-2 font-medium">{adhdStats.totalXPEarned}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function VisualSettings() {
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

function MotorSettings() {
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
        <h4 className={cn('font-medium mb-3', settings.highContrast ? 'text-yellow-400' : 'text-blue-700 dark:text-blue-300')}>
          Scorciatoie da tastiera
        </h4>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded">Tab</kbd>
            <span>Naviga tra gli elementi</span>
          </li>
          <li className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded">↑↓</kbd>
            <span>Seleziona opzioni</span>
          </li>
          <li className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded">Enter</kbd>
            <span>Attiva pulsanti</span>
          </li>
          <li className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded">Esc</kbd>
            <span>Chiudi dialoghi</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

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

function PresetsSettings({
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
                settings.highContrast ? 'text-white' : 'text-slate-900 dark:text-white'
              )}
            >
              {preset.title}
            </span>
            <span
              className={cn(
                'block text-sm',
                settings.highContrast ? 'text-gray-400' : 'text-slate-500 dark:text-slate-400'
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

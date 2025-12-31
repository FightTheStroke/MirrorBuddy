'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Eye,
  Type,
  Brain,
  Ear,
  Hand,
  Heart,
  Sparkles,
  Volume2,
  Sun,
  RotateCcw,
  Check,
  Settings2,
  Play,
  Pause,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Profile definitions matching accessibility-store.ts
const ACCESSIBILITY_PROFILES = [
  {
    id: 'dyslexia',
    name: 'Dislessia',
    icon: Type,
    color: 'from-blue-500 to-cyan-500',
    description: 'Font OpenDyslexic, spaziatura extra, interlinea aumentata',
    settings: {
      dyslexiaFont: true,
      extraLetterSpacing: true,
      increasedLineHeight: true,
      lineSpacing: 1.5,
      fontSize: 1.1,
    },
  },
  {
    id: 'adhd',
    name: 'ADHD',
    icon: Brain,
    color: 'from-orange-500 to-amber-500',
    description: 'Focus mode, animazioni ridotte, promemoria pause',
    settings: {
      adhdMode: true,
      distractionFreeMode: true,
      breakReminders: true,
      reducedMotion: true,
    },
  },
  {
    id: 'visual',
    name: 'Visivo',
    icon: Eye,
    color: 'from-purple-500 to-violet-500',
    description: 'Alto contrasto, testo grande, sintesi vocale',
    settings: {
      highContrast: true,
      largeText: true,
      fontSize: 1.3,
      ttsEnabled: true,
    },
  },
  {
    id: 'motor',
    name: 'Motorio',
    icon: Hand,
    color: 'from-green-500 to-emerald-500',
    description: 'Navigazione tastiera, nessuna animazione',
    settings: {
      keyboardNavigation: true,
      reducedMotion: true,
    },
  },
  {
    id: 'autism',
    name: 'Autismo',
    icon: Heart,
    color: 'from-pink-500 to-rose-500',
    description: 'UI calma, animazioni ridotte, distraction-free',
    settings: {
      reducedMotion: true,
      distractionFreeMode: true,
      lineSpacing: 1.4,
      fontSize: 1.1,
    },
  },
  {
    id: 'auditory',
    name: 'Uditivo',
    icon: Ear,
    color: 'from-teal-500 to-cyan-500',
    description: 'Comunicazione visiva, nessuna dipendenza audio',
    settings: {
      ttsEnabled: false,
      largeText: true,
      lineSpacing: 1.3,
    },
  },
  {
    id: 'cerebralPalsy',
    name: 'Paralisi Cerebrale',
    icon: Sparkles,
    color: 'from-indigo-500 to-purple-500',
    description: 'Tastiera, TTS, testo grande, spaziatura extra',
    settings: {
      keyboardNavigation: true,
      reducedMotion: true,
      ttsEnabled: true,
      largeText: true,
      fontSize: 1.2,
      lineSpacing: 1.4,
      extraLetterSpacing: true,
    },
  },
];

// Sample text for demonstration
const SAMPLE_TEXT = {
  title: 'La Fotosintesi Clorofilliana',
  content: `La fotosintesi e il processo attraverso cui le piante trasformano la luce solare in energia.
Questo processo avviene principalmente nelle foglie, dove si trova la clorofilla,
il pigmento verde che cattura la luce.

Durante la fotosintesi, la pianta assorbe anidride carbonica dall'aria e acqua dal terreno.
Utilizzando l'energia della luce, questi elementi vengono trasformati in glucosio e ossigeno.

Il glucosio serve come nutrimento per la pianta, mentre l'ossigeno viene rilasciato nell'atmosfera,
permettendo a noi e agli altri esseri viventi di respirare.`,
  quiz: 'Quale pigmento e responsabile del colore verde delle piante?',
  options: ['Clorofilla', 'Melanina', 'Carotene', 'Antocianina'],
};

// Individual toggle settings
const TOGGLE_SETTINGS = [
  { key: 'dyslexiaFont', label: 'Font Dislessia', icon: Type },
  { key: 'extraLetterSpacing', label: 'Spaziatura Lettere', icon: Type },
  { key: 'increasedLineHeight', label: 'Interlinea Alta', icon: Type },
  { key: 'highContrast', label: 'Alto Contrasto', icon: Sun },
  { key: 'largeText', label: 'Testo Grande', icon: Eye },
  { key: 'reducedMotion', label: 'Animazioni Ridotte', icon: Pause },
  { key: 'ttsEnabled', label: 'Sintesi Vocale', icon: Volume2 },
  { key: 'distractionFreeMode', label: 'Modalita Focus', icon: Brain },
];

interface ActiveSettings {
  dyslexiaFont: boolean;
  extraLetterSpacing: boolean;
  increasedLineHeight: boolean;
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
  ttsEnabled: boolean;
  distractionFreeMode: boolean;
  lineSpacing: number;
  fontSize: number;
  [key: string]: boolean | number;
}

export default function AccessibilityShowcasePage() {
  const [activeProfile, setActiveProfile] = useState<string | null>(null);
  const [settings, setSettings] = useState<ActiveSettings>({
    dyslexiaFont: false,
    extraLetterSpacing: false,
    increasedLineHeight: false,
    highContrast: false,
    largeText: false,
    reducedMotion: false,
    ttsEnabled: false,
    distractionFreeMode: false,
    lineSpacing: 1.0,
    fontSize: 1.0,
  });
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Apply profile settings
  const applyProfile = (profileId: string) => {
    const profile = ACCESSIBILITY_PROFILES.find((p) => p.id === profileId);
    if (profile) {
      setActiveProfile(profileId);
      // Create new settings with defaults, then apply profile-specific overrides
      const newSettings: ActiveSettings = {
        dyslexiaFont: false,
        extraLetterSpacing: false,
        increasedLineHeight: false,
        highContrast: false,
        largeText: false,
        reducedMotion: false,
        ttsEnabled: false,
        distractionFreeMode: false,
        lineSpacing: 1.0,
        fontSize: 1.0,
      };
      // Apply profile settings
      Object.entries(profile.settings).forEach(([key, value]) => {
        if (value !== undefined) {
          newSettings[key] = value;
        }
      });
      setSettings(newSettings);
    }
  };

  // Toggle individual setting
  const toggleSetting = (key: string) => {
    setActiveProfile(null); // Clear profile when manually toggling
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Reset all settings
  const resetSettings = () => {
    setActiveProfile(null);
    setSettings({
      dyslexiaFont: false,
      extraLetterSpacing: false,
      increasedLineHeight: false,
      highContrast: false,
      largeText: false,
      reducedMotion: false,
      ttsEnabled: false,
      distractionFreeMode: false,
      lineSpacing: 1.0,
      fontSize: 1.0,
    });
    if (isSpeaking) {
      window.speechSynthesis?.cancel();
      setIsSpeaking(false);
    }
  };

  // Text-to-Speech
  const speakText = () => {
    if (!settings.ttsEnabled) return;

    if (isSpeaking) {
      window.speechSynthesis?.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(
      SAMPLE_TEXT.title + '. ' + SAMPLE_TEXT.content
    );
    utterance.lang = 'it-IT';
    utterance.rate = 0.9;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis?.speak(utterance);
    setIsSpeaking(true);
  };

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  // Calculate dynamic styles based on settings
  const getTextStyles = (): React.CSSProperties => {
    const styles: React.CSSProperties = {};

    if (settings.dyslexiaFont) {
      styles.fontFamily = 'OpenDyslexic, sans-serif';
    }

    if (settings.extraLetterSpacing) {
      styles.letterSpacing = '0.05em';
    }

    if (settings.increasedLineHeight || settings.lineSpacing > 1.0) {
      styles.lineHeight = Math.max(1.8, settings.lineSpacing * 1.2);
    }

    if (settings.largeText || settings.fontSize > 1.0) {
      styles.fontSize = `${Math.max(1.2, settings.fontSize) * 100}%`;
    }

    return styles;
  };

  const getContainerClasses = () => {
    return cn(
      'p-6 rounded-xl border transition-all duration-300',
      settings.highContrast
        ? 'bg-black text-white border-white'
        : 'bg-white/10 text-white/90 border-white/20',
      settings.distractionFreeMode && 'ring-2 ring-purple-500/50'
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-white/80 text-sm mb-4">
          <Settings2 className="w-4 h-4" />
          Prova le impostazioni di accessibilita
        </div>

        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
          Accessibilita{' '}
          <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Personalizzata
          </span>
        </h1>

        <p className="text-white/70 max-w-2xl mx-auto">
          Seleziona un profilo o attiva singole impostazioni per vedere come cambiano i contenuti.
          Tutte le modifiche sono solo per questa demo.
        </p>
      </motion.div>

      {/* Profile Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {ACCESSIBILITY_PROFILES.map((profile, index) => {
          const Icon = profile.icon;
          const isActive = activeProfile === profile.id;

          return (
            <motion.button
              key={profile.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => applyProfile(profile.id)}
              className={cn(
                'relative p-4 rounded-xl border text-center transition-all duration-200',
                isActive
                  ? 'bg-white/20 border-white/50 ring-2 ring-white/30'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
              )}
            >
              {isActive && (
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}

              <div
                className={cn(
                  'w-10 h-10 mx-auto rounded-lg bg-gradient-to-br flex items-center justify-center mb-2',
                  profile.color
                )}
              >
                <Icon className="w-5 h-5 text-white" />
              </div>

              <span className="text-xs font-medium text-white/90 block">
                {profile.name}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Active Profile Description */}
      {activeProfile && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-white/10 rounded-lg p-4 text-center"
        >
          <p className="text-white/80 text-sm">
            <strong className="text-white">
              {ACCESSIBILITY_PROFILES.find((p) => p.id === activeProfile)?.name}:
            </strong>{' '}
            {ACCESSIBILITY_PROFILES.find((p) => p.id === activeProfile)?.description}
          </p>
        </motion.div>
      )}

      {/* Individual Toggles */}
      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-white/80">Impostazioni Singole</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetSettings}
            className="text-white/60 hover:text-white"
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Reset
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {TOGGLE_SETTINGS.map((toggle) => {
            const Icon = toggle.icon;
            const isActive = settings[toggle.key] as boolean;

            return (
              <button
                key={toggle.key}
                onClick={() => toggleSetting(toggle.key)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all',
                  isActive
                    ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                    : 'bg-white/5 text-white/60 border border-transparent hover:bg-white/10'
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="truncate">{toggle.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Preview Area */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Sample Text */}
        <motion.div
          layout={!settings.reducedMotion}
          className={getContainerClasses()}
          style={getTextStyles()}
        >
          <div className="flex items-center justify-between mb-4">
            <h2
              className={cn(
                'text-xl font-bold',
                settings.highContrast ? 'text-white' : 'text-white/90'
              )}
            >
              {SAMPLE_TEXT.title}
            </h2>

            {settings.ttsEnabled && (
              <Button
                variant="ghost"
                size="sm"
                onClick={speakText}
                className={cn(
                  'gap-1',
                  isSpeaking ? 'text-green-400' : 'text-white/60 hover:text-white'
                )}
              >
                {isSpeaking ? (
                  <>
                    <Pause className="w-4 h-4" />
                    Stop
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Leggi
                  </>
                )}
              </Button>
            )}
          </div>

          <p
            className={cn(
              'whitespace-pre-line',
              settings.highContrast ? 'text-white/90' : 'text-white/70'
            )}
          >
            {SAMPLE_TEXT.content}
          </p>
        </motion.div>

        {/* Sample Quiz */}
        <motion.div
          layout={!settings.reducedMotion}
          className={getContainerClasses()}
          style={getTextStyles()}
        >
          <h2
            className={cn(
              'text-xl font-bold mb-4',
              settings.highContrast ? 'text-white' : 'text-white/90'
            )}
          >
            Quiz di Esempio
          </h2>

          <p
            className={cn(
              'mb-4',
              settings.highContrast ? 'text-white/90' : 'text-white/70'
            )}
          >
            {SAMPLE_TEXT.quiz}
          </p>

          <div className="space-y-2">
            {SAMPLE_TEXT.options.map((option, index) => (
              <button
                key={option}
                className={cn(
                  'w-full p-3 rounded-lg text-left transition-all',
                  settings.highContrast
                    ? 'bg-white/10 hover:bg-white/20 border border-white/30 text-white'
                    : 'bg-white/5 hover:bg-white/10 border border-white/10 text-white/80',
                  'focus:outline-none focus:ring-2 focus:ring-purple-500'
                )}
                tabIndex={settings.keyboardNavigation ? 0 : -1}
              >
                <span className="font-medium mr-2">
                  {String.fromCharCode(65 + index)}.
                </span>
                {option}
              </button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Active Settings Summary */}
      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
        <h3 className="text-sm font-medium text-white/80 mb-3">Impostazioni Attive</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(settings)
            .filter(([key, value]) => {
              if (typeof value === 'boolean') return value;
              if (key === 'lineSpacing') return value > 1.0;
              if (key === 'fontSize') return value > 1.0;
              return false;
            })
            .map(([key]) => (
              <span
                key={key}
                className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs"
              >
                {key}
              </span>
            ))}
          {Object.values(settings).every(
            (v) => v === false || v === 1.0
          ) && (
            <span className="text-white/50 text-sm">Nessuna impostazione attiva</span>
          )}
        </div>
      </div>

      {/* Info Note */}
      <div className="text-center text-white/50 text-sm">
        <p>
          Nell&apos;app completa, queste impostazioni vengono salvate e applicate automaticamente
          a tutti i contenuti.
        </p>
      </div>
    </div>
  );
}

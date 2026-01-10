/**
 * Accessibility Showcase Page
 * Demo page showing accessibility profiles and settings
 */

'use client';

import { motion } from 'framer-motion';
import { Settings2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ACCESSIBILITY_PROFILES, SAMPLE_TEXT } from './profiles';
import { TOGGLE_SETTINGS } from './constants';
import { useAccessibilitySettings } from './hooks/use-accessibility-settings';
import { ProfileCards } from './components/profile-cards';
import { PreviewArea } from './components/preview-area';

export default function AccessibilityShowcasePage() {
  const {
    activeProfile,
    settings,
    isSpeaking,
    applyProfile,
    toggleSetting,
    resetSettings,
    speakText,
    getTextStyles,
  } = useAccessibilitySettings();

  const getContainerClasses = () => {
    return cn(
      'p-6 rounded-xl border transition-all duration-300',
      settings.highContrast
        ? 'bg-black text-white border-white'
        : 'bg-white/10 text-white/90 border-white/20',
      settings.distractionFreeMode && 'ring-2 ring-purple-500/50'
    );
  };

  const handleSpeak = () => {
    speakText(SAMPLE_TEXT.title + '. ' + SAMPLE_TEXT.content);
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
      <ProfileCards activeProfile={activeProfile} onProfileSelect={applyProfile} />

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
      <PreviewArea
        settings={settings}
        isSpeaking={isSpeaking}
        onSpeak={handleSpeak}
        textStyles={getTextStyles()}
        getContainerClasses={getContainerClasses}
      />

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

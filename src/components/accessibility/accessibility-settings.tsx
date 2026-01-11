'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAccessibilityStore } from '@/lib/accessibility/accessibility-store';
import {
  ACCESSIBILITY_CATEGORIES,
  type AccessibilityCategory,
} from './accessibility-categories';
import { DyslexiaSettings } from './components/dyslexia-settings';
import { ADHDSettings } from './components/adhd-settings';
import { VisualSettings } from './components/visual-settings';
import { MotorSettings } from './components/motor-settings';
import { PresetsSettings } from './components/presets-settings';

interface AccessibilitySettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AccessibilitySettings({
  isOpen,
  onClose,
}: AccessibilitySettingsProps) {
  const [selectedCategory, setSelectedCategory] =
    useState<AccessibilityCategory>('dyslexia');
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
                    settings.highContrast
                      ? 'text-yellow-400'
                      : 'text-slate-900 dark:text-white',
                    settings.dyslexiaFont && 'tracking-wide'
                  )}
                  style={{
                    fontSize: `${16 * (settings.largeText ? 1.2 : 1)}px`,
                  }}
                >
                  Accessibilità
                </h2>
              </div>

              <ul className="space-y-1">
                {ACCESSIBILITY_CATEGORIES.map((cat) => (
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
                      style={{
                        fontSize: `${14 * (settings.largeText ? 1.2 : 1)}px`,
                      }}
                    >
                      {cat.icon}
                      <span className="font-medium">{cat.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="flex-1 flex flex-col overflow-hidden">
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
                      settings.highContrast
                        ? 'text-yellow-400'
                        : 'text-slate-900 dark:text-white',
                      settings.dyslexiaFont && 'tracking-wide'
                    )}
                    style={{
                      fontSize: `${20 * (settings.largeText ? 1.2 : 1)}px`,
                    }}
                  >
                    {ACCESSIBILITY_CATEGORIES.find((c) => c.id === selectedCategory)?.label}
                  </h3>
                  <p
                    className={cn(
                      'text-sm',
                      settings.highContrast
                        ? 'text-gray-300'
                        : 'text-slate-500 dark:text-slate-400',
                      settings.dyslexiaFont && 'tracking-wide'
                    )}
                  >
                    {
                      ACCESSIBILITY_CATEGORIES.find((c) => c.id === selectedCategory)
                        ?.description
                    }
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

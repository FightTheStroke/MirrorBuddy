'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import {
  User,
  Accessibility,
  Palette,
  Bell,
  Shield,
  GraduationCap,
  Save,
  Moon,
  Sun,
  Laptop,
  Globe,
  Bot,
  DollarSign,
  TrendingUp,
  Cloud,
  Server,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AccessibilitySettings } from '@/components/accessibility/accessibility-settings';
import { useSettingsStore, type TeachingStyle } from '@/lib/stores/app-store';
import { useAccessibilityStore } from '@/lib/accessibility/accessibility-store';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';

// Teaching style options with descriptions
const TEACHING_STYLES: Array<{
  value: TeachingStyle;
  label: string;
  emoji: string;
  description: string;
  color: string;
}> = [
  {
    value: 'super_encouraging',
    label: 'Super Incoraggiante',
    emoji: '🌟',
    description: 'Sempre positivo, celebra ogni piccolo progresso',
    color: 'from-green-400 to-emerald-500',
  },
  {
    value: 'encouraging',
    label: 'Incoraggiante',
    emoji: '😊',
    description: 'Supportivo e paziente, focus sul positivo',
    color: 'from-teal-400 to-cyan-500',
  },
  {
    value: 'balanced',
    label: 'Bilanciato',
    emoji: '⚖️',
    description: 'Mix equilibrato di lodi e correzioni costruttive',
    color: 'from-blue-400 to-indigo-500',
  },
  {
    value: 'strict',
    label: 'Rigoroso',
    emoji: '📐',
    description: 'Esigente ma giusto, aspettative alte',
    color: 'from-orange-400 to-amber-500',
  },
  {
    value: 'brutal',
    label: 'Brutale',
    emoji: '🔥',
    description: 'Diretto e senza filtri, sfida costante',
    color: 'from-red-500 to-rose-600',
  },
];

type SettingsTab = 'profile' | 'accessibility' | 'appearance' | 'ai' | 'notifications' | 'privacy';

const tabs: Array<{ id: SettingsTab; label: string; icon: React.ReactNode }> = [
  { id: 'profile', label: 'Profilo', icon: <User className="w-5 h-5" /> },
  { id: 'accessibility', label: 'Accessibilita', icon: <Accessibility className="w-5 h-5" /> },
  { id: 'appearance', label: 'Aspetto', icon: <Palette className="w-5 h-5" /> },
  { id: 'ai', label: 'AI Provider', icon: <Bot className="w-5 h-5" /> },
  { id: 'notifications', label: 'Notifiche', icon: <Bell className="w-5 h-5" /> },
  { id: 'privacy', label: 'Privacy', icon: <Shield className="w-5 h-5" /> },
];

export function SettingsView() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [showAccessibilityModal, setShowAccessibilityModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { studentProfile, updateStudentProfile, appearance, updateAppearance } = useSettingsStore();
  const { settings: accessibilitySettings, updateSettings: updateAccessibilitySettings } = useAccessibilityStore();

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      // Actually sync settings to the server
      await useSettingsStore.getState().syncToServer();
    } catch (error) {
      logger.error('Failed to save settings', { error: String(error) });
    } finally {
      setIsSaving(false);
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Impostazioni
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Personalizza la tua esperienza di apprendimento
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Salvando...' : 'Salva'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-700 pb-4">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === tab.id
                ? 'bg-blue-500 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'profile' && (
          <ProfileSettings
            profile={studentProfile}
            onUpdate={updateStudentProfile}
          />
        )}

        {activeTab === 'accessibility' && (
          <AccessibilityTab
            settings={accessibilitySettings}
            onOpenModal={() => setShowAccessibilityModal(true)}
            onToggleDyslexia={() => updateAccessibilitySettings({ dyslexiaFont: !accessibilitySettings.dyslexiaFont })}
            onToggleADHD={() => updateAccessibilitySettings({ adhdMode: !accessibilitySettings.adhdMode })}
          />
        )}

        {activeTab === 'appearance' && (
          <AppearanceSettings
            appearance={appearance}
            onUpdate={updateAppearance}
          />
        )}

        {activeTab === 'ai' && <AIProviderSettings />}

        {activeTab === 'notifications' && <NotificationSettings />}

        {activeTab === 'privacy' && <PrivacySettings />}
      </motion.div>

      {/* Accessibility modal */}
      <AccessibilitySettings
        isOpen={showAccessibilityModal}
        onClose={() => setShowAccessibilityModal(false)}
      />
    </div>
  );
}

// Profile Settings
interface ProfileSettingsProps {
  profile: {
    name: string;
    gradeLevel: string;
    learningGoals: string[];
    teachingStyle: TeachingStyle;
  };
  onUpdate: (updates: Partial<ProfileSettingsProps['profile']>) => void;
}

function ProfileSettings({ profile, onUpdate }: ProfileSettingsProps) {
  const gradeLevels = [
    { value: '', label: 'Seleziona...' },
    { value: 'primary', label: 'Scuola Primaria (6-10 anni)' },
    { value: 'middle', label: 'Scuola Media (11-13 anni)' },
    { value: 'high', label: 'Scuola Superiore (14-18 anni)' },
    { value: 'university', label: 'Universita' },
    { value: 'adult', label: 'Formazione Continua' },
  ];

  const learningGoalOptions = [
    'Migliorare in matematica',
    'Imparare le lingue',
    'Preparare esami',
    'Sviluppare creativita',
    'Approfondire scienze',
    'Studiare storia e geografia',
  ];

  const toggleGoal = (goal: string) => {
    const current = profile.learningGoals || [];
    if (current.includes(goal)) {
      onUpdate({ learningGoals: current.filter(g => g !== goal) });
    } else {
      onUpdate({ learningGoals: [...current, goal] });
    }
  };

  const currentStyle = TEACHING_STYLES.find(s => s.value === (profile.teachingStyle || 'balanced'));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-500" />
              Informazioni Personali
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Nome
              </label>
              <input
                type="text"
                value={profile.name || ''}
                onChange={(e) => onUpdate({ name: e.target.value })}
                placeholder="Come ti chiami?"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Livello di istruzione
              </label>
              <select
                value={profile.gradeLevel || ''}
                onChange={(e) => onUpdate({ gradeLevel: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {gradeLevels.map(level => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-green-500" />
              Obiettivi di Apprendimento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500 mb-4">
              Seleziona gli obiettivi che vuoi raggiungere
            </p>
            <div className="space-y-2">
              {learningGoalOptions.map(goal => (
                <label
                  key={goal}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors',
                    (profile.learningGoals || []).includes(goal)
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={(profile.learningGoals || []).includes(goal)}
                    onChange={() => toggleGoal(goal)}
                    className="sr-only"
                  />
                  <div
                    className={cn(
                      'w-5 h-5 rounded border-2 flex items-center justify-center',
                      (profile.learningGoals || []).includes(goal)
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : 'border-slate-300 dark:border-slate-600'
                    )}
                  >
                    {(profile.learningGoals || []).includes(goal) && (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm font-medium">{goal}</span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Teaching Style Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">{currentStyle?.emoji || '⚖️'}</span>
            Stile dei Maestri
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-500">
            Scegli come vuoi che i maestri ti parlino e ti correggano
          </p>

          {/* Current style display */}
          <div className={cn(
            'p-4 rounded-xl bg-gradient-to-r text-white',
            currentStyle?.color || 'from-blue-400 to-indigo-500'
          )}>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{currentStyle?.emoji}</span>
              <div>
                <h4 className="font-bold text-lg">{currentStyle?.label}</h4>
                <p className="text-sm opacity-90">{currentStyle?.description}</p>
              </div>
            </div>
          </div>

          {/* Style selector */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {TEACHING_STYLES.map(style => (
              <button
                key={style.value}
                onClick={() => onUpdate({ teachingStyle: style.value })}
                className={cn(
                  'p-3 rounded-xl border-2 transition-all text-center',
                  (profile.teachingStyle || 'balanced') === style.value
                    ? 'border-slate-900 dark:border-white bg-slate-100 dark:bg-slate-800 scale-105'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                )}
              >
                <span className="text-2xl block mb-1">{style.emoji}</span>
                <span className="text-xs font-medium">{style.label}</span>
              </button>
            ))}
          </div>

          {/* Style impact preview */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
            <h5 className="text-sm font-medium mb-2">Esempio di feedback:</h5>
            <p className="text-sm text-slate-600 dark:text-slate-400 italic">
              {profile.teachingStyle === 'super_encouraging' && (
                '"Fantastico! Stai andando benissimo! Ogni errore e un passo verso il successo!"'
              )}
              {profile.teachingStyle === 'encouraging' && (
                '"Ottimo lavoro! Hai quasi ragione, prova a pensare un attimo..."'
              )}
              {(profile.teachingStyle === 'balanced' || !profile.teachingStyle) && (
                '"Buon tentativo. C\'e un errore qui - ripassa il concetto e riprova."'
              )}
              {profile.teachingStyle === 'strict' && (
                '"Sbagliato. Hai saltato un passaggio fondamentale. Torna indietro e rifai."'
              )}
              {profile.teachingStyle === 'brutal' && (
                '"No. Completamente sbagliato. Devi studiare di piu, non ci siamo proprio."'
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Accessibility Tab
interface AccessibilitySettings {
  dyslexiaFont?: boolean;
  highContrast?: boolean;
  largeText?: boolean;
  ttsEnabled?: boolean;
  adhdMode?: boolean;
  reducedMotion?: boolean;
  keyboardNavigation?: boolean;
}

interface AccessibilityTabProps {
  settings: AccessibilitySettings;
  onOpenModal: () => void;
  onToggleDyslexia: () => void;
  onToggleADHD: () => void;
}

function AccessibilityTab({ settings, onOpenModal, onToggleDyslexia, onToggleADHD }: AccessibilityTabProps) {
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
            Impostazioni di Accessibilita
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-600 dark:text-slate-400">
            Convergio e progettato per essere accessibile a tutti. Personalizza l&apos;esperienza
            in base alle tue esigenze.
          </p>

          {activeFeatures.length > 0 && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
              <h4 className="font-medium text-green-700 dark:text-green-400 mb-2">
                Funzionalita attive:
              </h4>
              <div className="flex flex-wrap gap-2">
                {activeFeatures.map((feature, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-green-100 dark:bg-green-800/50 text-green-700 dark:text-green-300 rounded-full text-sm"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          )}

          <Button
            onClick={onOpenModal}
            className="w-full py-6 text-lg font-semibold bg-purple-600 hover:bg-purple-700 text-white"
            size="lg"
          >
            <Accessibility className="w-5 h-5 mr-2" />
            Apri Pannello Accessibilita Completo
          </Button>
        </CardContent>
      </Card>

      {/* Quick toggles - clickable cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={onToggleDyslexia}
          className={cn(
            "text-left p-4 rounded-xl border-2 transition-all",
            settings.dyslexiaFont
              ? "bg-blue-100 dark:bg-blue-900/40 border-blue-500 ring-2 ring-blue-500/50"
              : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 hover:border-blue-400"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-blue-700 dark:text-blue-300">
              Supporto Dislessia
            </h4>
            <div className={cn(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center",
              settings.dyslexiaFont ? "bg-blue-500 border-blue-500" : "border-blue-300"
            )}>
              {settings.dyslexiaFont && <Check className="w-3 h-3 text-white" />}
            </div>
          </div>
          <p className="text-sm text-blue-600 dark:text-blue-400">
            Font OpenDyslexic, spaziatura ottimizzata
          </p>
        </button>

        <button
          onClick={onToggleADHD}
          className={cn(
            "text-left p-4 rounded-xl border-2 transition-all",
            settings.adhdMode
              ? "bg-purple-100 dark:bg-purple-900/40 border-purple-500 ring-2 ring-purple-500/50"
              : "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 hover:border-purple-400"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-purple-700 dark:text-purple-300">
              Supporto ADHD
            </h4>
            <div className={cn(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center",
              settings.adhdMode ? "bg-purple-500 border-purple-500" : "border-purple-300"
            )}>
              {settings.adhdMode && <Check className="w-3 h-3 text-white" />}
            </div>
          </div>
          <p className="text-sm text-purple-600 dark:text-purple-400">
            Timer Pomodoro, focus mode e promemoria
          </p>
        </button>
      </div>
    </div>
  );
}

// Appearance Settings
interface AppearanceSettingsProps {
  appearance: {
    theme: 'light' | 'dark' | 'system';
    accentColor: string;
    language: 'it' | 'en' | 'es' | 'fr' | 'de';
  };
  onUpdate: (updates: Partial<AppearanceSettingsProps['appearance']>) => void;
}

function AppearanceSettings({ appearance, onUpdate }: AppearanceSettingsProps) {
  const { theme: currentTheme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const themes: Array<{ value: 'light' | 'dark' | 'system'; label: string; icon: React.ReactNode }> = [
    { value: 'light', label: 'Chiaro', icon: <Sun className="w-5 h-5" /> },
    { value: 'dark', label: 'Scuro', icon: <Moon className="w-5 h-5" /> },
    { value: 'system', label: 'Sistema', icon: <Laptop className="w-5 h-5" /> },
  ];

  const accentColors = [
    { value: 'blue', label: 'Blu', class: 'bg-blue-500' },
    { value: 'green', label: 'Verde', class: 'bg-green-500' },
    { value: 'purple', label: 'Viola', class: 'bg-purple-500' },
    { value: 'orange', label: 'Arancione', class: 'bg-orange-500' },
    { value: 'pink', label: 'Rosa', class: 'bg-pink-500' },
  ];

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    onUpdate({ theme: newTheme });
  };

  // Show loading state during hydration
  if (!mounted) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Tema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {themes.map(theme => (
                <div
                  key={theme.value}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700"
                >
                  {theme.icon}
                  <span className="text-sm font-medium">{theme.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {themes.map(theme => (
              <button
                key={theme.value}
                onClick={() => handleThemeChange(theme.value)}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                  currentTheme === theme.value
                    ? 'border-accent-themed bg-primary/10'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                )}
              >
                {theme.icon}
                <span className="text-sm font-medium">{theme.label}</span>
              </button>
            ))}
          </div>
          {currentTheme === 'system' && (
            <p className="text-sm text-slate-500 mt-3">
              Tema corrente: {resolvedTheme === 'dark' ? 'Scuro' : 'Chiaro'} (basato sulle preferenze di sistema)
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Colore Principale</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {accentColors.map(color => (
              <button
                key={color.value}
                onClick={() => onUpdate({ accentColor: color.value })}
                className={cn(
                  'w-12 h-12 rounded-full transition-transform',
                  color.class,
                  appearance.accentColor === color.value
                    ? 'ring-4 ring-offset-2 ring-offset-background ring-slate-400 dark:ring-slate-500 scale-110'
                    : 'hover:scale-105'
                )}
                title={color.label}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-500" />
            Lingua
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 mb-4">
            Seleziona la lingua in cui i maestri ti parleranno
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { value: 'it' as const, label: 'Italiano', flag: '🇮🇹' },
              { value: 'en' as const, label: 'English', flag: '🇬🇧' },
              { value: 'es' as const, label: 'Español', flag: '🇪🇸' },
              { value: 'fr' as const, label: 'Français', flag: '🇫🇷' },
              { value: 'de' as const, label: 'Deutsch', flag: '🇩🇪' },
            ].map(lang => (
              <button
                key={lang.value}
                onClick={() => onUpdate({ language: lang.value })}
                className={cn(
                  'flex items-center gap-2 p-3 rounded-xl border-2 transition-all',
                  (appearance.language || 'it') === lang.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                )}
              >
                <span className="text-xl">{lang.flag}</span>
                <span className="text-sm font-medium">{lang.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Notification Settings
function NotificationSettings() {
  const [notifications, setNotifications] = useState({
    studyReminders: true,
    streakAlerts: true,
    achievements: true,
    weeklyReport: true,
    sound: false,
  });

  const toggleSetting = (key: keyof typeof notifications) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-amber-500" />
          Notifiche
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {[
          { key: 'studyReminders' as const, label: 'Promemoria studio', desc: 'Ricevi un promemoria per studiare' },
          { key: 'streakAlerts' as const, label: 'Avvisi streak', desc: 'Notifica quando rischi di perdere la serie' },
          { key: 'achievements' as const, label: 'Traguardi', desc: 'Notifica quando sblocchi un achievement' },
          { key: 'weeklyReport' as const, label: 'Report settimanale', desc: 'Ricevi un riepilogo dei tuoi progressi' },
          { key: 'sound' as const, label: 'Suoni', desc: 'Attiva effetti sonori' },
        ].map(item => (
          <label
            key={item.key}
            className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 cursor-pointer"
          >
            <div>
              <span className="font-medium text-slate-900 dark:text-white block">
                {item.label}
              </span>
              <span className="text-sm text-slate-500">{item.desc}</span>
            </div>
            <div
              className={cn(
                'relative w-12 h-7 rounded-full transition-colors',
                notifications[item.key] ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'
              )}
              onClick={() => toggleSetting(item.key)}
            >
              <span
                className={cn(
                  'absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform',
                  notifications[item.key] ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </div>
          </label>
        ))}
      </CardContent>
    </Card>
  );
}

// Privacy Settings
function PrivacySettings() {
  const [version, setVersion] = useState<{
    version: string;
    buildTime: string;
    environment: string;
  } | null>(null);

  useEffect(() => {
    fetch('/api/version')
      .then(res => res.json())
      .then(setVersion)
      .catch(() => null);
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-500" />
            Privacy e Sicurezza
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-600 dark:text-slate-400">
            I tuoi dati sono al sicuro. Convergio e progettato pensando alla privacy
            dei bambini e rispetta le normative COPPA e GDPR.
          </p>

          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
            <h4 className="font-medium text-green-700 dark:text-green-300 mb-2">
              I tuoi dati sono protetti
            </h4>
            <ul className="text-sm text-green-600 dark:text-green-400 space-y-1">
              <li>I dati sono memorizzati localmente sul dispositivo</li>
              <li>Nessun dato viene condiviso con terze parti</li>
              <li>Le conversazioni non vengono registrate</li>
              <li>Puoi eliminare i tuoi dati in qualsiasi momento</li>
            </ul>
          </div>

          <Button
            variant="outline"
            className="w-full text-red-600 border-red-200 hover:bg-red-50"
            onClick={async () => {
              const confirmed = window.confirm(
                'Sei sicuro di voler eliminare tutti i tuoi dati? Questa azione non può essere annullata.'
              );
              if (confirmed) {
                // Clear all localStorage data
                const keysToRemove = [];
                for (let i = 0; i < localStorage.length; i++) {
                  const key = localStorage.key(i);
                  if (key?.startsWith('convergio')) {
                    keysToRemove.push(key);
                  }
                }
                keysToRemove.forEach(key => localStorage.removeItem(key));

                // Also clear any other app-specific keys
                localStorage.removeItem('voice-session');
                localStorage.removeItem('accessibility-settings');

                // Call API to delete server-side data
                try {
                  await fetch('/api/user/data', { method: 'DELETE' });
                } catch {
                  // Server deletion optional - local is primary
                }

                // Reload to reset state
                window.location.reload();
              }
            }}
          >
            Elimina tutti i miei dati
          </Button>
        </CardContent>
      </Card>

      {/* Version Info */}
      <Card>
        <CardHeader>
          <CardTitle>Informazioni App</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Versione</span>
            <span className="font-mono">
              {version ? `v${version.version}` : 'Loading...'}
            </span>
          </div>
          {version?.environment === 'development' && (
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-slate-500">Ambiente</span>
              <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded text-xs">
                Development
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// AI Provider Settings with Cost Management
interface CostSummary {
  totalCost: number;
  currency: string;
  periodStart: string;
  periodEnd: string;
  costsByService: Array<{ serviceName: string; cost: number }>;
}

interface CostForecast {
  estimatedTotal: number;
  currency: string;
  forecastPeriodEnd: string;
}

interface EnvVarStatus {
  name: string;
  configured: boolean;
  displayValue?: string;
}

interface DetailedProviderStatus {
  activeProvider: 'azure' | 'ollama' | null;
  azure: {
    configured: boolean;
    model: string | null;
    realtimeConfigured: boolean;
    realtimeModel: string | null;
    envVars: EnvVarStatus[];
  };
  ollama: {
    configured: boolean;
    url: string;
    model: string;
    envVars: EnvVarStatus[];
  };
}

function AIProviderSettings() {
  const { preferredProvider, setPreferredProvider } = useSettingsStore();
  const [providerStatus, setProviderStatus] = useState<DetailedProviderStatus | null>(null);
  const [costs, setCosts] = useState<CostSummary | null>(null);
  const [forecast, setForecast] = useState<CostForecast | null>(null);
  const [loadingCosts, setLoadingCosts] = useState(false);
  const [costsConfigured, setCostsConfigured] = useState(true);
  const [showEnvDetails, setShowEnvDetails] = useState(false);

  // Azure Cost Config form state
  const [azureCostConfig, setAzureCostConfig] = useState({
    tenantId: '',
    clientId: '',
    clientSecret: '',
    subscriptionId: '',
  });
  const [savingCostConfig, setSavingCostConfig] = useState(false);
  const [costConfigSaved, setCostConfigSaved] = useState(false);

  // Load existing config from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('azure_cost_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setAzureCostConfig(parsed);
        setCostConfigSaved(true);
      } catch {
        // Invalid JSON, ignore
      }
    }
  }, []);

  // Save cost config to localStorage
  const saveCostConfig = async () => {
    setSavingCostConfig(true);
    try {
      localStorage.setItem('azure_cost_config', JSON.stringify(azureCostConfig));
      setCostConfigSaved(true);
      // Note: Server still needs env vars - this is for future API enhancement
      // For now, show success and inform user to also set env vars
    } finally {
      setSavingCostConfig(false);
    }
  };

  // Check provider status on mount
  useEffect(() => {
    fetch('/api/provider/status')
      .then(res => res.json())
      .then(data => setProviderStatus(data))
      .catch(() => setProviderStatus(null));
  }, []);

  // Fetch costs if Azure is the provider
  useEffect(() => {
    if (providerStatus?.activeProvider !== 'azure') return;

    let cancelled = false;

    const fetchCosts = async () => {
      try {
        const [costData, forecastData] = await Promise.all([
          fetch('/api/azure/costs?days=30').then(res => res.json()),
          fetch('/api/azure/costs?type=forecast').then(res => res.json()),
        ]);

        if (cancelled) return;

        if (costData.error && costData.configured === false) {
          setCostsConfigured(false);
        } else {
          setCosts(costData);
          setForecast(forecastData);
        }
      } catch {
        if (!cancelled) setCostsConfigured(false);
      } finally {
        if (!cancelled) setLoadingCosts(false);
      }
    };

    setLoadingCosts(true);
    fetchCosts();

    return () => { cancelled = true; };
  }, [providerStatus?.activeProvider]);

  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Provider Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-500" />
            Provider AI Attivo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {providerStatus === null ? (
            <div className="animate-pulse h-20 bg-slate-100 dark:bg-slate-800 rounded-lg" />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Azure Card */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setPreferredProvider('azure')}
                  onKeyDown={(e) => e.key === 'Enter' && setPreferredProvider('azure')}
                  className={cn(
                    'p-4 rounded-xl border-2 transition-all cursor-pointer',
                    preferredProvider === 'azure' && 'ring-2 ring-blue-500 ring-offset-2',
                    providerStatus.activeProvider === 'azure'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : providerStatus.azure.configured
                        ? 'border-slate-300 dark:border-slate-600 hover:border-blue-300'
                        : 'border-slate-200 dark:border-slate-700 opacity-60'
                  )}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Cloud className="w-6 h-6 text-blue-500" />
                    <div className="flex-1">
                      <h4 className="font-medium">Azure OpenAI</h4>
                      <p className="text-xs text-slate-500">Cloud - Chat + Voice</p>
                    </div>
                    {providerStatus.azure.configured ? (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400">
                        Configurato
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                        Non configurato
                      </span>
                    )}
                  </div>
                  {providerStatus.activeProvider === 'azure' && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-sm text-green-600 dark:text-green-400">
                        Attivo: {providerStatus.azure.model}
                      </span>
                    </div>
                  )}
                  {providerStatus.azure.realtimeConfigured && (
                    <div className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                      Voice: {providerStatus.azure.realtimeModel}
                    </div>
                  )}
                </div>

                {/* Ollama Card */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setPreferredProvider('ollama')}
                  onKeyDown={(e) => e.key === 'Enter' && setPreferredProvider('ollama')}
                  className={cn(
                    'p-4 rounded-xl border-2 transition-all cursor-pointer',
                    preferredProvider === 'ollama' && 'ring-2 ring-green-500 ring-offset-2',
                    providerStatus.activeProvider === 'ollama'
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : providerStatus.ollama.configured
                        ? 'border-slate-300 dark:border-slate-600 hover:border-green-300'
                        : 'border-slate-200 dark:border-slate-700 opacity-60'
                  )}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Server className="w-6 h-6 text-green-500" />
                    <div className="flex-1">
                      <h4 className="font-medium">Ollama</h4>
                      <p className="text-xs text-slate-500">Locale - Solo Chat</p>
                    </div>
                    {providerStatus.ollama.configured ? (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400">
                        In esecuzione
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                        Non attivo
                      </span>
                    )}
                  </div>
                  {providerStatus.activeProvider === 'ollama' && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-sm text-green-600 dark:text-green-400">
                        Attivo: {providerStatus.ollama.model}
                      </span>
                    </div>
                  )}
                  <div className="mt-1 text-xs text-slate-500">
                    URL: {providerStatus.ollama.url}
                  </div>
                </div>
              </div>

              {/* Selection Mode Indicator */}
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    Modalità selezione:
                  </span>
                  <span className={cn(
                    'px-2 py-0.5 text-xs font-medium rounded-full',
                    preferredProvider === 'auto'
                      ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      : preferredProvider === 'azure'
                        ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                        : 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                  )}>
                    {preferredProvider === 'auto' ? 'Automatica' : preferredProvider === 'azure' ? 'Azure' : 'Ollama'}
                  </span>
                </div>
                {preferredProvider !== 'auto' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPreferredProvider('auto')}
                    className="text-xs"
                  >
                    Ripristina Auto
                  </Button>
                )}
              </div>

              {/* No provider warning */}
              {!providerStatus.activeProvider && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                  <h4 className="font-medium text-amber-700 dark:text-amber-300">
                    Nessun provider configurato
                  </h4>
                  <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                    Configura Azure OpenAI nel file .env oppure avvia Ollama localmente.
                  </p>
                </div>
              )}

              {/* Environment Variables Toggle */}
              <button
                onClick={() => setShowEnvDetails(!showEnvDetails)}
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                <span>{showEnvDetails ? '▼' : '▶'}</span>
                <span>Mostra configurazione .env</span>
              </button>

              {/* Environment Variables Details */}
              {showEnvDetails && (
                <div className="space-y-4 pt-2">
                  {/* Azure env vars */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                    <h5 className="font-medium text-sm mb-3 flex items-center gap-2">
                      <Cloud className="w-4 h-4 text-blue-500" />
                      Azure OpenAI (Chat + Voice)
                    </h5>
                    <div className="space-y-2">
                      {providerStatus.azure.envVars.map((envVar) => (
                        <div key={envVar.name} className="flex items-center justify-between text-xs">
                          <code className="font-mono text-slate-600 dark:text-slate-400">
                            {envVar.name}
                          </code>
                          <div className="flex items-center gap-2">
                            {envVar.configured ? (
                              <>
                                <span className="text-green-600 dark:text-green-400">
                                  {envVar.displayValue || '****'}
                                </span>
                                <span className="w-2 h-2 rounded-full bg-green-500" />
                              </>
                            ) : (
                              <>
                                <span className="text-slate-400">Non configurato</span>
                                <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Ollama env vars */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                    <h5 className="font-medium text-sm mb-3 flex items-center gap-2">
                      <Server className="w-4 h-4 text-green-500" />
                      Ollama (Solo Chat locale)
                    </h5>
                    <div className="space-y-2">
                      {providerStatus.ollama.envVars.map((envVar) => (
                        <div key={envVar.name} className="flex items-center justify-between text-xs">
                          <code className="font-mono text-slate-600 dark:text-slate-400">
                            {envVar.name}
                          </code>
                          <div className="flex items-center gap-2">
                            <span className={envVar.configured ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}>
                              {envVar.displayValue || 'Default'}
                            </span>
                            <span className={cn(
                              'w-2 h-2 rounded-full',
                              envVar.configured ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'
                            )} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 p-2 bg-slate-100 dark:bg-slate-700 rounded text-xs">
                      <p className="text-slate-600 dark:text-slate-400">
                        Per usare Ollama, avvialo con:
                      </p>
                      <code className="block mt-1 text-green-600 dark:text-green-400 font-mono">
                        ollama serve && ollama pull llama3.2
                      </code>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Azure Costs - Only show if Azure is active */}
      {providerStatus?.activeProvider === 'azure' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              Costi Azure OpenAI
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!costsConfigured ? (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                <h4 className="font-medium text-amber-700 dark:text-amber-300 mb-2">
                  Cost Management non configurato
                </h4>
                <p className="text-sm text-amber-600 dark:text-amber-400 mb-3">
                  Per visualizzare i costi Azure, configura un Service Principal con ruolo &quot;Cost Management Reader&quot;:
                </p>

                {/* Cost Config Form */}
                <div className="space-y-3 mb-4">
                  <input
                    type="text"
                    placeholder="AZURE_TENANT_ID"
                    value={azureCostConfig.tenantId}
                    onChange={(e) => setAzureCostConfig(prev => ({...prev, tenantId: e.target.value}))}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="AZURE_CLIENT_ID"
                    value={azureCostConfig.clientId}
                    onChange={(e) => setAzureCostConfig(prev => ({...prev, clientId: e.target.value}))}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="password"
                    placeholder="AZURE_CLIENT_SECRET"
                    value={azureCostConfig.clientSecret}
                    onChange={(e) => setAzureCostConfig(prev => ({...prev, clientSecret: e.target.value}))}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="AZURE_SUBSCRIPTION_ID"
                    value={azureCostConfig.subscriptionId}
                    onChange={(e) => setAzureCostConfig(prev => ({...prev, subscriptionId: e.target.value}))}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Button
                    onClick={saveCostConfig}
                    disabled={savingCostConfig || !azureCostConfig.tenantId || !azureCostConfig.clientId || !azureCostConfig.clientSecret || !azureCostConfig.subscriptionId}
                    className="w-full"
                  >
                    {savingCostConfig ? 'Salvataggio...' : costConfigSaved ? 'Configurazione Salvata' : 'Salva Configurazione'}
                  </Button>
                </div>

                {costConfigSaved && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 mb-3">
                    <p className="text-sm text-green-700 dark:text-green-400">
                      Configurazione salvata localmente. Per attivare i costi, aggiungi anche le variabili nel file .env del server.
                    </p>
                  </div>
                )}

                <div className="bg-slate-900 dark:bg-slate-950 p-3 rounded-lg">
                  <p className="text-xs text-slate-400 mb-2">Variabili .env richieste:</p>
                  <code className="text-xs text-green-400 font-mono block leading-relaxed">
                    AZURE_TENANT_ID=...<br />
                    AZURE_CLIENT_ID=...<br />
                    AZURE_CLIENT_SECRET=...<br />
                    AZURE_SUBSCRIPTION_ID=...
                  </code>
                </div>
              </div>
            ) : loadingCosts ? (
              <div className="animate-pulse space-y-4">
                <div className="h-24 bg-slate-100 dark:bg-slate-800 rounded-lg" />
              </div>
            ) : costs ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                    <span className="text-sm text-blue-600 dark:text-blue-400">Ultimi 30 giorni</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {formatCurrency(costs.totalCost, costs.currency)}
                  </p>
                </div>
                {forecast && (
                  <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      <span className="text-sm text-green-600 dark:text-green-400">Stima fine mese</span>
                    </div>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                      {formatCurrency(forecast.estimatedTotal, forecast.currency)}
                    </p>
                  </div>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Voice availability info */}
      <Card>
        <CardHeader>
          <CardTitle>Funzionalita Voce</CardTitle>
        </CardHeader>
        <CardContent>
          {providerStatus?.azure.realtimeConfigured ? (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-3 h-3 rounded-full bg-green-500" />
                <span className="font-medium text-green-700 dark:text-green-300">
                  Voce disponibile
                </span>
              </div>
              <p className="text-sm text-green-600 dark:text-green-400">
                Azure OpenAI Realtime: {providerStatus.azure.realtimeModel}
              </p>
            </div>
          ) : (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="font-medium text-amber-700 dark:text-amber-300">
                  Voce non disponibile
                </span>
              </div>
              <p className="text-sm text-amber-600 dark:text-amber-400 mb-2">
                Le conversazioni vocali richiedono Azure OpenAI Realtime.
              </p>
              <p className="text-xs text-slate-500">
                Configura: AZURE_OPENAI_REALTIME_ENDPOINT, AZURE_OPENAI_REALTIME_API_KEY, AZURE_OPENAI_REALTIME_DEPLOYMENT
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
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
  Wrench,
  Mic,
  Volume2,
  MessageSquare,
  Radio,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Video,
  Settings,
  Undo2,
  BarChart3,
  Users,
  Heart,
  Sparkles,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AccessibilitySettings } from '@/components/accessibility/accessibility-settings';
import { useSettingsStore, type TeachingStyle } from '@/lib/stores/app-store';
import { useAccessibilityStore } from '@/lib/accessibility/accessibility-store';
import { useNotificationStore, requestPushPermission, isPushSupported } from '@/lib/stores/notification-store';
import { TelemetryDashboard } from '@/components/telemetry';
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

type SettingsTab = 'profile' | 'characters' | 'accessibility' | 'appearance' | 'ai' | 'audio' | 'notifications' | 'telemetry' | 'privacy' | 'diagnostics';

const tabs: Array<{ id: SettingsTab; label: string; icon: React.ReactNode }> = [
  { id: 'profile', label: 'Profilo', icon: <User className="w-5 h-5" /> },
  { id: 'characters', label: 'Personaggi', icon: <Users className="w-5 h-5" /> },
  { id: 'accessibility', label: 'Accessibilita', icon: <Accessibility className="w-5 h-5" /> },
  { id: 'appearance', label: 'Aspetto', icon: <Palette className="w-5 h-5" /> },
  { id: 'ai', label: 'AI Provider', icon: <Bot className="w-5 h-5" /> },
  { id: 'audio', label: 'Audio/Video', icon: <Volume2 className="w-5 h-5" /> },
  { id: 'notifications', label: 'Notifiche', icon: <Bell className="w-5 h-5" /> },
  { id: 'telemetry', label: 'Statistiche', icon: <BarChart3 className="w-5 h-5" /> },
  { id: 'privacy', label: 'Privacy', icon: <Shield className="w-5 h-5" /> },
  { id: 'diagnostics', label: 'Diagnostica', icon: <Wrench className="w-5 h-5" /> },
];

export function SettingsView() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [showAccessibilityModal, setShowAccessibilityModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const initialStateRef = useRef<{ settings: ReturnType<typeof useSettingsStore.getState>; accessibility: ReturnType<typeof useAccessibilityStore.getState>['settings'] } | null>(null);

  const { studentProfile, updateStudentProfile, appearance, updateAppearance } = useSettingsStore();
  const { settings: accessibilitySettings, updateSettings: updateAccessibilitySettings } = useAccessibilityStore();

  // Store initial state on mount for undo capability
  useEffect(() => {
    if (!initialStateRef.current) {
      initialStateRef.current = {
        settings: useSettingsStore.getState(),
        accessibility: useAccessibilityStore.getState().settings,
      };
    }
  }, []);

  // Track changes
  useEffect(() => {
    if (!initialStateRef.current) return;
    const currentSettings = useSettingsStore.getState();
    const currentAccessibility = useAccessibilityStore.getState().settings;
    const changed = JSON.stringify({
      profile: currentSettings.studentProfile,
      appearance: currentSettings.appearance,
      accessibility: currentAccessibility,
    }) !== JSON.stringify({
      profile: initialStateRef.current.settings.studentProfile,
      appearance: initialStateRef.current.settings.appearance,
      accessibility: initialStateRef.current.accessibility,
    });
    setHasChanges(changed);
  }, [studentProfile, appearance, accessibilitySettings]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      // Actually sync settings to the server
      await useSettingsStore.getState().syncToServer();
      // Update initial state after successful save
      initialStateRef.current = {
        settings: useSettingsStore.getState(),
        accessibility: useAccessibilityStore.getState().settings,
      };
      setHasChanges(false);
    } catch (error) {
      logger.error('Failed to save settings', { error: String(error) });
    } finally {
      setIsSaving(false);
    }
  }, []);

  const handleUndo = useCallback(() => {
    if (!initialStateRef.current) return;
    updateStudentProfile(initialStateRef.current.settings.studentProfile);
    updateAppearance(initialStateRef.current.settings.appearance);
    updateAccessibilitySettings(initialStateRef.current.accessibility);
    setHasChanges(false);
  }, [updateStudentProfile, updateAppearance, updateAccessibilitySettings]);

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
        <div className="flex items-center gap-2">
          <Button
            onClick={handleUndo}
            variant="outline"
            disabled={!hasChanges || isSaving}
            title="Annulla modifiche"
          >
            <Undo2 className="w-4 h-4 mr-2" />
            Annulla
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className={cn(
              hasChanges && !isSaving && 'bg-amber-500 hover:bg-amber-600 animate-pulse'
            )}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Salvando...' : hasChanges ? 'Salva Modifiche' : 'Salva'}
          </Button>
        </div>
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
                ? 'bg-accent-themed text-white'
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

        {activeTab === 'characters' && (
          <CharacterSettings
            profile={studentProfile}
            onUpdate={updateStudentProfile}
          />
        )}

        {activeTab === 'accessibility' && (
          <AccessibilityTab
            settings={accessibilitySettings}
            onOpenModal={() => setShowAccessibilityModal(true)}
            onUpdateSettings={updateAccessibilitySettings}
          />
        )}

        {activeTab === 'appearance' && (
          <AppearanceSettings
            appearance={appearance}
            onUpdate={updateAppearance}
          />
        )}

        {activeTab === 'ai' && <AIProviderSettings />}

        {activeTab === 'audio' && <AudioSettings />}

        {activeTab === 'notifications' && <NotificationSettings />}

        {activeTab === 'privacy' && <PrivacySettings />}

        {activeTab === 'telemetry' && <TelemetryDashboard />}
        {activeTab === 'diagnostics' && <DiagnosticsTab />}
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

      </div>

      {/* Teaching Style Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">{currentStyle?.emoji || '⚖️'}</span>
            Stile dei Professori
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-500">
            Scegli come vuoi che i professori ti parlino e ti correggano
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

// Character Settings (Coach & Buddy Selection)
interface CharacterSettingsProps {
  profile: {
    preferredCoach?: 'melissa' | 'roberto' | 'chiara' | 'andrea' | 'favij';
    preferredBuddy?: 'mario' | 'noemi' | 'enea' | 'bruno' | 'sofia';
    coachBorderColor?: string;
    buddyBorderColor?: string;
  };
  onUpdate: (updates: Partial<CharacterSettingsProps['profile']>) => void;
}

// Available border colors for customization
const BORDER_COLORS = [
  { name: 'Rosa', value: '#EC4899' },
  { name: 'Blu', value: '#3B82F6' },
  { name: 'Verde', value: '#10B981' },
  { name: 'Viola', value: '#8B5CF6' },
  { name: 'Arancione', value: '#F97316' },
  { name: 'Rosso', value: '#EF4444' },
  { name: 'Ambra', value: '#F59E0B' },
  { name: 'Indaco', value: '#6366F1' },
  { name: 'Ciano', value: '#06B6D4' },
  { name: 'Lime', value: '#84CC16' },
];

const COACHES = [
  {
    id: 'melissa' as const,
    name: 'Melissa',
    avatar: '/avatars/melissa.jpg',
    description: 'Giovane, intelligente, allegra, paziente, entusiasta',
    tagline: 'Entusiasta e positiva',
    color: 'from-pink-500 to-rose-500',
    bgColor: 'bg-pink-50 dark:bg-pink-900/20',
    borderColor: 'border-pink-200 dark:border-pink-800',
    activeBorder: 'border-pink-500 ring-2 ring-pink-500/50',
  },
  {
    id: 'roberto' as const,
    name: 'Roberto',
    avatar: '/avatars/roberto.png',
    description: 'Giovane, calmo, rassicurante, paziente, affidabile',
    tagline: 'Calmo e rassicurante',
    color: 'from-blue-500 to-indigo-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    activeBorder: 'border-blue-500 ring-2 ring-blue-500/50',
  },
  {
    id: 'chiara' as const,
    name: 'Chiara',
    avatar: '/avatars/chiara.png',
    description: 'Organizzata, metodica, fresca di studi, empatica',
    tagline: 'Appena laureata, ti capisce',
    color: 'from-violet-500 to-purple-500',
    bgColor: 'bg-violet-50 dark:bg-violet-900/20',
    borderColor: 'border-violet-200 dark:border-violet-800',
    activeBorder: 'border-violet-500 ring-2 ring-violet-500/50',
  },
  {
    id: 'andrea' as const,
    name: 'Andrea',
    avatar: '/avatars/andrea.png',
    description: 'Sportiva, energica, pratica, motivazionale',
    tagline: 'Energia e pause attive',
    color: 'from-orange-500 to-amber-500',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    borderColor: 'border-orange-200 dark:border-orange-800',
    activeBorder: 'border-orange-500 ring-2 ring-orange-500/50',
  },
  {
    id: 'favij' as const,
    name: 'Favij',
    avatar: '/avatars/favij.jpg',
    description: 'Gamer, rilassato, simpatico, creativo, tech-savvy',
    tagline: 'Lo studio come un gioco',
    color: 'from-red-500 to-rose-500',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800',
    activeBorder: 'border-red-500 ring-2 ring-red-500/50',
  },
];

const BUDDIES = [
  {
    id: 'mario' as const,
    name: 'Mario',
    avatar: '/avatars/mario.jpg',
    description: 'Amichevole, ironico, comprensivo, alla mano',
    tagline: 'Il tuo amico che ti capisce',
    color: 'from-emerald-500 to-teal-500',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    activeBorder: 'border-emerald-500 ring-2 ring-emerald-500/50',
  },
  {
    id: 'noemi' as const,
    name: 'Noemi',
    avatar: '/avatars/noemi.png',
    description: 'Empatica, solare, accogliente, buona ascoltatrice',
    tagline: 'La tua amica che ti ascolta',
    color: 'from-purple-500 to-violet-500',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-200 dark:border-purple-800',
    activeBorder: 'border-purple-500 ring-2 ring-purple-500/50',
  },
  {
    id: 'enea' as const,
    name: 'Enea',
    avatar: '/avatars/enea.png',
    description: 'Allegro, positivo, spiritoso, energico',
    tagline: 'Ti tira su il morale',
    color: 'from-amber-500 to-yellow-500',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    borderColor: 'border-amber-200 dark:border-amber-800',
    activeBorder: 'border-amber-500 ring-2 ring-amber-500/50',
  },
  {
    id: 'bruno' as const,
    name: 'Bruno',
    avatar: '/avatars/bruno.png',
    description: 'Riflessivo, calmo, profondo, buon ascoltatore',
    tagline: 'Ti ascolta davvero',
    color: 'from-indigo-500 to-blue-500',
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
    borderColor: 'border-indigo-200 dark:border-indigo-800',
    activeBorder: 'border-indigo-500 ring-2 ring-indigo-500/50',
  },
  {
    id: 'sofia' as const,
    name: 'Sofia',
    avatar: '/avatars/sofia.png',
    description: 'Creativa, sognatrice, profonda, artistica',
    tagline: 'Vede le cose diversamente',
    color: 'from-pink-500 to-fuchsia-500',
    bgColor: 'bg-pink-50 dark:bg-pink-900/20',
    borderColor: 'border-pink-200 dark:border-pink-800',
    activeBorder: 'border-pink-500 ring-2 ring-pink-500/50',
  },
];

function CharacterSettings({ profile, onUpdate }: CharacterSettingsProps) {
  const selectedCoach = profile.preferredCoach || 'melissa';
  const selectedBuddy = profile.preferredBuddy || 'mario';

  return (
    <div className="space-y-8">
      {/* Coach Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Il Tuo Coach di Apprendimento
          </CardTitle>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Il coach ti aiuta a sviluppare il tuo metodo di studio e diventare autonomo
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {COACHES.map((coach) => (
              <button
                key={coach.id}
                onClick={() => onUpdate({ preferredCoach: coach.id })}
                className={cn(
                  'relative flex items-start gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left',
                  coach.bgColor,
                  selectedCoach === coach.id
                    ? coach.activeBorder
                    : `${coach.borderColor} hover:scale-[1.02]`
                )}
              >
                <div className="relative flex-shrink-0">
                  <div className={cn(
                    'w-16 h-16 rounded-full overflow-hidden border-2',
                    selectedCoach === coach.id ? 'border-white shadow-lg' : 'border-slate-200 dark:border-slate-700'
                  )}>
                    <Image
                      src={coach.avatar}
                      alt={coach.name}
                      width={64}
                      height={64}
                      className="object-cover w-full h-full"
                      unoptimized
                    />
                  </div>
                  {selectedCoach === coach.id && (
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">
                    {coach.name}
                  </h3>
                  <p className={cn(
                    'text-sm font-medium bg-gradient-to-r bg-clip-text text-transparent',
                    coach.color
                  )}>
                    {coach.tagline}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {coach.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Buddy Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-500" />
            Il Tuo MirrorBuddy
          </CardTitle>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Il buddy e un amico della tua eta che capisce le tue difficolta e ti supporta
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {BUDDIES.map((buddy) => (
              <button
                key={buddy.id}
                onClick={() => onUpdate({ preferredBuddy: buddy.id })}
                className={cn(
                  'relative flex items-start gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left',
                  buddy.bgColor,
                  selectedBuddy === buddy.id
                    ? buddy.activeBorder
                    : `${buddy.borderColor} hover:scale-[1.02]`
                )}
              >
                <div className="relative flex-shrink-0">
                  <div className={cn(
                    'w-16 h-16 rounded-full overflow-hidden border-2',
                    selectedBuddy === buddy.id ? 'border-white shadow-lg' : 'border-slate-200 dark:border-slate-700'
                  )}>
                    <Image
                      src={buddy.avatar}
                      alt={buddy.name}
                      width={64}
                      height={64}
                      className="object-cover w-full h-full"
                      unoptimized
                    />
                  </div>
                  {selectedBuddy === buddy.id && (
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">
                    {buddy.name}
                  </h3>
                  <p className={cn(
                    'text-sm font-medium bg-gradient-to-r bg-clip-text text-transparent',
                    buddy.color
                  )}>
                    {buddy.tagline}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {buddy.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Color Customization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-violet-500" />
            Personalizza i Colori
          </CardTitle>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Scegli i colori dei bordi per riconoscere coach e buddy negli avatar
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Coach Border Color */}
          <div>
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              Colore bordo Coach ({COACHES.find(c => c.id === selectedCoach)?.name})
            </h4>
            <div className="flex flex-wrap gap-2">
              {BORDER_COLORS.map((color) => (
                <button
                  key={`coach-${color.value}`}
                  onClick={() => onUpdate({ coachBorderColor: color.value })}
                  className={cn(
                    'w-10 h-10 rounded-full border-2 transition-all duration-200 hover:scale-110',
                    profile.coachBorderColor === color.value
                      ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-slate-600'
                      : 'border-transparent'
                  )}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                >
                  {profile.coachBorderColor === color.value && (
                    <Check className="w-5 h-5 text-white mx-auto" />
                  )}
                </button>
              ))}
              <button
                onClick={() => onUpdate({ coachBorderColor: undefined })}
                className={cn(
                  'w-10 h-10 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 transition-all duration-200 hover:scale-110 flex items-center justify-center',
                  !profile.coachBorderColor && 'ring-2 ring-offset-2 ring-slate-400 dark:ring-slate-600'
                )}
                title="Predefinito"
              >
                <span className="text-xs text-slate-500">Auto</span>
              </button>
            </div>
          </div>

          {/* Buddy Border Color */}
          <div>
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              Colore bordo Buddy ({BUDDIES.find(b => b.id === selectedBuddy)?.name})
            </h4>
            <div className="flex flex-wrap gap-2">
              {BORDER_COLORS.map((color) => (
                <button
                  key={`buddy-${color.value}`}
                  onClick={() => onUpdate({ buddyBorderColor: color.value })}
                  className={cn(
                    'w-10 h-10 rounded-full border-2 transition-all duration-200 hover:scale-110',
                    profile.buddyBorderColor === color.value
                      ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-slate-600'
                      : 'border-transparent'
                  )}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                >
                  {profile.buddyBorderColor === color.value && (
                    <Check className="w-5 h-5 text-white mx-auto" />
                  )}
                </button>
              ))}
              <button
                onClick={() => onUpdate({ buddyBorderColor: undefined })}
                className={cn(
                  'w-10 h-10 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 transition-all duration-200 hover:scale-110 flex items-center justify-center',
                  !profile.buddyBorderColor && 'ring-2 ring-offset-2 ring-slate-400 dark:ring-slate-600'
                )}
                title="Predefinito"
              >
                <span className="text-xs text-slate-500">Auto</span>
              </button>
            </div>
          </div>

          {/* Preview */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              Anteprima
            </h4>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div
                  className="w-16 h-16 rounded-full overflow-hidden border-4 mx-auto"
                  style={{ borderColor: profile.coachBorderColor || '#3B82F6' }}
                >
                  <Image
                    src={COACHES.find(c => c.id === selectedCoach)?.avatar || '/avatars/melissa.jpg'}
                    alt="Coach"
                    width={64}
                    height={64}
                    className="object-cover w-full h-full"
                    unoptimized
                  />
                </div>
                <span className="text-xs text-slate-500 mt-1 block">Coach</span>
              </div>
              <div className="text-center">
                <div
                  className="w-16 h-16 rounded-full overflow-hidden border-4 mx-auto"
                  style={{ borderColor: profile.buddyBorderColor || '#10B981' }}
                >
                  <Image
                    src={BUDDIES.find(b => b.id === selectedBuddy)?.avatar || '/avatars/mario.jpg'}
                    alt="Buddy"
                    width={64}
                    height={64}
                    className="object-cover w-full h-full"
                    unoptimized
                  />
                </div>
                <span className="text-xs text-slate-500 mt-1 block">Buddy</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Box */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-amber-100 dark:bg-amber-800/50 rounded-full flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h4 className="font-medium text-amber-900 dark:text-amber-100">
              Il Triangolo del Supporto
            </h4>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              Il coach ti insegna il metodo, il buddy ti supporta emotivamente, e i Professori ti spiegano le materie.
              Insieme formano il tuo team di apprendimento personalizzato!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

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

function AccessibilityTab({ settings, onOpenModal, onUpdateSettings }: AccessibilityTabProps) {
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
            ].map(lang => {
              const isSelected = (appearance.language || 'it') === lang.value;
              return (
                <button
                  key={lang.value}
                  onClick={() => onUpdate({ language: lang.value })}
                  className={cn(
                    'flex items-center gap-2 p-3 rounded-xl border-2 transition-all font-medium',
                    'focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900',
                    isSelected
                      ? 'bg-accent-themed text-white border-accent-themed shadow-lg focus:ring-accent-themed'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 hover:border-accent-themed hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm hover:shadow-md focus:ring-accent-themed'
                  )}
                  aria-pressed={isSelected}
                >
                  <span className="text-xl">{lang.flag}</span>
                  <span className="text-sm">{lang.label}</span>
                  {isSelected && (
                    <Check className="w-4 h-4 ml-auto" />
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Notification Settings - Uses global notification store
function NotificationSettings() {
  const { preferences, pushPermission, updatePreferences, setPushPermission: _setPushPermission } = useNotificationStore();
  const [isRequestingPush, setIsRequestingPush] = useState(false);

  const handleRequestPush = async () => {
    setIsRequestingPush(true);
    try {
      const granted = await requestPushPermission();
      if (granted) {
        updatePreferences({ push: true });
      }
    } finally {
      setIsRequestingPush(false);
    }
  };

  const togglePreference = (key: keyof typeof preferences) => {
    updatePreferences({ [key]: !preferences[key] });
  };

  return (
    <div className="space-y-6">
      {/* Master toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-500" />
            Notifiche
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Master enable toggle */}
          <label
            className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 cursor-pointer"
          >
            <div>
              <span className="font-medium text-slate-900 dark:text-white block">
                Abilita notifiche
              </span>
              <span className="text-sm text-slate-500">Attiva o disattiva tutte le notifiche</span>
            </div>
            <div
              className={cn(
                'relative w-12 h-7 rounded-full transition-colors',
                preferences.enabled ? 'bg-accent-themed' : 'bg-slate-300 dark:bg-slate-600'
              )}
              onClick={() => togglePreference('enabled')}
            >
              <span
                className={cn(
                  'absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform',
                  preferences.enabled ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </div>
          </label>

          {/* Push notifications */}
          {isPushSupported() && (
            <label
              className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 cursor-pointer"
            >
              <div>
                <span className="font-medium text-slate-900 dark:text-white block">
                  Notifiche push
                </span>
                <span className="text-sm text-slate-500">
                  {pushPermission === 'granted'
                    ? 'Ricevi notifiche anche quando l\'app è chiusa'
                    : pushPermission === 'denied'
                    ? 'Permesso negato - controlla le impostazioni del browser'
                    : 'Abilita le notifiche push del browser'}
                </span>
              </div>
              {pushPermission !== 'granted' ? (
                <Button
                  size="sm"
                  onClick={handleRequestPush}
                  disabled={isRequestingPush || pushPermission === 'denied'}
                >
                  {isRequestingPush ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Abilita'
                  )}
                </Button>
              ) : (
                <div
                  className={cn(
                    'relative w-12 h-7 rounded-full transition-colors',
                    preferences.push ? 'bg-accent-themed' : 'bg-slate-300 dark:bg-slate-600'
                  )}
                  onClick={() => togglePreference('push')}
                >
                  <span
                    className={cn(
                      'absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform',
                      preferences.push ? 'translate-x-5' : 'translate-x-0'
                    )}
                  />
                </div>
              )}
            </label>
          )}

          {/* Sound */}
          <label
            className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 cursor-pointer"
          >
            <div>
              <span className="font-medium text-slate-900 dark:text-white block">
                Suoni
              </span>
              <span className="text-sm text-slate-500">Riproduci suoni per le notifiche</span>
            </div>
            <div
              className={cn(
                'relative w-12 h-7 rounded-full transition-colors',
                preferences.sound ? 'bg-accent-themed' : 'bg-slate-300 dark:bg-slate-600'
              )}
              onClick={() => togglePreference('sound')}
            >
              <span
                className={cn(
                  'absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform',
                  preferences.sound ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </div>
          </label>
        </CardContent>
      </Card>

      {/* Notification types */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tipi di notifiche</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'reminders' as const, label: 'Promemoria studio', desc: 'Ricevi un promemoria per studiare' },
            { key: 'streaks' as const, label: 'Avvisi streak', desc: 'Notifica quando rischi di perdere la serie' },
            { key: 'achievements' as const, label: 'Traguardi', desc: 'Notifica quando sblocchi un achievement' },
            { key: 'levelUp' as const, label: 'Livelli', desc: 'Notifica quando sali di livello' },
            { key: 'breaks' as const, label: 'Pause', desc: 'Suggerimenti per fare pause (ADHD mode)' },
            { key: 'sessionEnd' as const, label: 'Fine sessione', desc: 'Riepilogo a fine sessione di studio' },
          ].map(item => (
            <label
              key={item.key}
              className={cn(
                'flex items-center justify-between p-4 rounded-lg cursor-pointer transition-opacity',
                preferences.enabled
                  ? 'bg-slate-50 dark:bg-slate-800/50'
                  : 'bg-slate-50/50 dark:bg-slate-800/25 opacity-50'
              )}
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
                  preferences[item.key] && preferences.enabled ? 'bg-accent-themed' : 'bg-slate-300 dark:bg-slate-600'
                )}
                onClick={() => preferences.enabled && togglePreference(item.key)}
              >
                <span
                  className={cn(
                    'absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform',
                    preferences[item.key] ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </div>
            </label>
          ))}
        </CardContent>
      </Card>
    </div>
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

// Audio/Video Settings - Global device preferences
function AudioSettings() {
  const { preferredMicrophoneId, preferredOutputId, preferredCameraId, setPreferredMicrophone, setPreferredOutput, setPreferredCamera } = useSettingsStore();
  const [availableMics, setAvailableMics] = useState<MediaDeviceInfo[]>([]);
  const [availableOutputs, setAvailableOutputs] = useState<MediaDeviceInfo[]>([]);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [micTestActive, setMicTestActive] = useState(false);
  const [speakerTestActive, setSpeakerTestActive] = useState(false);
  const [camTestActive, setCamTestActive] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  // Refs for audio test
  const micStreamRef = useRef<MediaStream | null>(null);
  const micContextRef = useRef<AudioContext | null>(null);
  const micAnimationRef = useRef<number | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);

  // Refs for video test
  const videoRef = useRef<HTMLVideoElement>(null);
  const camStreamRef = useRef<MediaStream | null>(null);

  // Fetch available devices
  const refreshDevices = useCallback(async () => {
    try {
      // Request permissions first to get device labels
      await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
        .then(s => s.getTracks().forEach(t => t.stop()))
        .catch(() => {
          // Try audio only if video fails
          return navigator.mediaDevices.getUserMedia({ audio: true })
            .then(s => s.getTracks().forEach(t => t.stop()));
        });

      const devices = await navigator.mediaDevices.enumerateDevices();
      const mics = devices.filter(d => d.kind === 'audioinput');
      const outputs = devices.filter(d => d.kind === 'audiooutput');
      const cams = devices.filter(d => d.kind === 'videoinput');

      setAvailableMics(mics);
      setAvailableOutputs(outputs);
      setAvailableCameras(cams);
    } catch (error) {
      logger.error('Error fetching devices', { error });
    }
  }, []);

  useEffect(() => {
    // Use a small delay to avoid synchronous setState in effect
    const timer = setTimeout(() => {
      refreshDevices();
    }, 0);

    // Listen for device changes
    navigator.mediaDevices.addEventListener('devicechange', refreshDevices);
    return () => {
      clearTimeout(timer);
      navigator.mediaDevices.removeEventListener('devicechange', refreshDevices);
    };
  }, [refreshDevices]);

  // Start microphone test with waveform visualization
  const startMicTest = async () => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: preferredMicrophoneId
          ? { deviceId: { ideal: preferredMicrophoneId } }
          : true
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      micStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioContext = new AudioCtx();
      micContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      micAnalyserRef.current = analyser;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const canvas = waveformCanvasRef.current;
      if (!canvas) {
        logger.error('Waveform canvas not found');
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const timeDataArray = new Uint8Array(analyser.fftSize);

      const drawWaveform = () => {
        if (!micAnalyserRef.current) return;
        micAnimationRef.current = requestAnimationFrame(drawWaveform);

        // Get time domain data for waveform
        micAnalyserRef.current.getByteTimeDomainData(timeDataArray);

        // Calculate audio level (RMS)
        let sum = 0;
        for (let i = 0; i < timeDataArray.length; i++) {
          const value = (timeDataArray[i] - 128) / 128;
          sum += value * value;
        }
        const rms = Math.sqrt(sum / timeDataArray.length);
        const level = Math.min(100, rms * 400);
        setAudioLevel(level);

        // Draw waveform
        const width = canvas.width;
        const height = canvas.height;

        ctx.fillStyle = 'rgb(15, 23, 42)'; // slate-900
        ctx.fillRect(0, 0, width, height);

        ctx.lineWidth = 2;
        ctx.strokeStyle = level > 5 ? 'rgb(34, 197, 94)' : 'rgb(100, 116, 139)'; // green-500 or slate-500
        ctx.beginPath();

        const sliceWidth = width / timeDataArray.length;
        let x = 0;

        for (let i = 0; i < timeDataArray.length; i++) {
          const v = timeDataArray[i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }

          x += sliceWidth;
        }

        ctx.lineTo(width, height / 2);
        ctx.stroke();

        // Draw level bar at the bottom
        const gradient = ctx.createLinearGradient(0, 0, (width * level) / 100, 0);
        gradient.addColorStop(0, 'rgb(34, 197, 94)');    // green
        gradient.addColorStop(0.7, 'rgb(234, 179, 8)');  // yellow
        gradient.addColorStop(1, 'rgb(239, 68, 68)');    // red
        ctx.fillStyle = gradient;
        ctx.fillRect(0, height - 4, (width * level) / 100, 4);
      };

      setMicTestActive(true);
      drawWaveform();
    } catch (error) {
      logger.error('Mic test error', { error });
    }
  };

  // Stop microphone test
  const stopMicTest = () => {
    if (micAnimationRef.current) {
      cancelAnimationFrame(micAnimationRef.current);
      micAnimationRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }
    if (micContextRef.current) {
      micContextRef.current.close();
      micContextRef.current = null;
    }
    micAnalyserRef.current = null;
    setMicTestActive(false);
    setAudioLevel(0);

    // Clear canvas
    const canvas = waveformCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'rgb(30, 41, 59)'; // slate-800
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  // Start camera test
  const startCamTest = async () => {
    try {
      // Use 'ideal' instead of 'exact' so it falls back to default if device is disconnected
      const constraints: MediaStreamConstraints = {
        video: preferredCameraId
          ? { deviceId: { ideal: preferredCameraId } }
          : true
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      camStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      setCamTestActive(true);
    } catch (error) {
      logger.error('Camera test error', { error });
    }
  };

  // Stop camera test
  const stopCamTest = () => {
    if (camStreamRef.current) {
      camStreamRef.current.getTracks().forEach(t => t.stop());
      camStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCamTestActive(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMicTest();
      stopCamTest();
    };
  }, []);

  // Restart tests when device changes
  const handleMicChange = async (deviceId: string) => {
    setPreferredMicrophone(deviceId);
    if (micTestActive) {
      stopMicTest();
      // Small delay to allow cleanup
      setTimeout(() => startMicTest(), 100);
    }
  };

  const handleOutputChange = (deviceId: string) => {
    setPreferredOutput(deviceId);
    // If speaker test is active, it will use the new device on next test
  };

  const handleCamChange = async (deviceId: string) => {
    setPreferredCamera(deviceId);
    if (camTestActive) {
      stopCamTest();
      setTimeout(() => startCamTest(), 100);
    }
  };

  // Test speaker output
  const testSpeaker = async () => {
    setSpeakerTestActive(true);

    // Helper function to play fallback tone
    const playFallbackTone = () => {
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const audioContext = new AudioCtx();

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime);

        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5);

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.5);

        setTimeout(() => {
          audioContext.close();
          setSpeakerTestActive(false);
        }, 600);
      } catch (error) {
        logger.error('Fallback tone error', { error });
        setSpeakerTestActive(false);
      }
    };

    try {
      // Use Web Speech API to speak a test phrase
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance('Ciao! Il test audio funziona correttamente.');
        utterance.lang = 'it-IT';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Try to find an Italian voice
        const voices = window.speechSynthesis.getVoices();
        const italianVoice = voices.find(v => v.lang.startsWith('it')) || voices[0];
        if (italianVoice) {
          utterance.voice = italianVoice;
        }

        utterance.onend = () => {
          setSpeakerTestActive(false);
        };

        utterance.onerror = () => {
          logger.error('Speech synthesis error, falling back to tone');
          playFallbackTone();
        };

        window.speechSynthesis.speak(utterance);

        // Fallback timeout in case onend doesn't fire
        setTimeout(() => {
          setSpeakerTestActive(false);
        }, 5000);
      } else {
        // Fallback to tone if speech synthesis not available
        playFallbackTone();
      }
    } catch (error) {
      logger.error('Speaker test error', { error });
      playFallbackTone();
    }
  };

  return (
    <div className="space-y-6">
      {/* Audio Devices - Compact 2-column layout (Fix #11) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-amber-500" />
            Dispositivi Audio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Microphone */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                <Mic className="w-4 h-4 text-red-500" />
                Microfono
              </label>
              <select
                value={preferredMicrophoneId}
                onChange={(e) => handleMicChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
              >
                <option value="">Predefinito di sistema</option>
                {availableMics.map((mic) => (
                  <option key={mic.deviceId} value={mic.deviceId}>
                    {mic.label || `Microfono ${mic.deviceId.slice(0, 8)}...`}
                  </option>
                ))}
              </select>
            </div>

            {/* Output */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                <Volume2 className="w-4 h-4 text-amber-500" />
                Altoparlanti
              </label>
              <select
                value={preferredOutputId}
                onChange={(e) => handleOutputChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
              >
                <option value="">Predefinito di sistema</option>
                {availableOutputs.map((output) => (
                  <option key={output.deviceId} value={output.deviceId}>
                    {output.label || `Altoparlante ${output.deviceId.slice(0, 8)}...`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Mic waveform - compact */}
          <div className="space-y-2">
            {micTestActive && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  Parla per testare
                </span>
                <span className="text-xs font-mono text-slate-500 ml-auto">
                  {Math.round(audioLevel)}%
                </span>
              </div>
            )}
            <div className="relative">
              <canvas
                ref={waveformCanvasRef}
                width={600}
                height={60}
                className="w-full h-[60px] rounded-lg bg-slate-800 dark:bg-slate-900"
              />
              {!micTestActive && (
                <div className="absolute inset-0 flex items-center justify-center text-slate-500 dark:text-slate-400 text-xs">
                  Clicca &quot;Testa&quot; per vedere la waveform
                </div>
              )}
            </div>
          </div>

          {/* Test buttons - row */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              onClick={refreshDevices}
              variant="outline"
              size="sm"
              title="Aggiorna dispositivi"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            {!micTestActive ? (
              <Button onClick={startMicTest} variant="default" size="sm">
                <Mic className="w-4 h-4 mr-1" />
                Testa Mic
              </Button>
            ) : (
              <Button onClick={stopMicTest} variant="destructive" size="sm">
                <XCircle className="w-4 h-4 mr-1" />
                Stop
              </Button>
            )}
            <Button
              onClick={testSpeaker}
              variant="default"
              size="sm"
              disabled={speakerTestActive}
            >
              <Volume2 className="w-4 h-4 mr-1" />
              {speakerTestActive ? '...' : 'Testa'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Webcam - Better layout with larger preview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Video className="w-5 h-5 text-blue-500" />
            Webcam
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Large video preview */}
          <div className="relative aspect-video max-w-md mx-auto rounded-xl overflow-hidden bg-slate-900">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              muted
              playsInline
            />
            {!camTestActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <Video className="w-12 h-12 text-slate-600" />
                <span className="text-sm text-slate-500">Clicca &quot;Testa&quot; per vedere l&apos;anteprima</span>
              </div>
            )}
            {camTestActive && (
              <div className="absolute top-2 right-2 flex items-center gap-2 px-2 py-1 bg-black/50 rounded-full">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-xs text-white">LIVE</span>
              </div>
            )}
          </div>

          {/* Controls row */}
          <div className="flex items-center gap-4">
            <select
              value={preferredCameraId}
              onChange={(e) => handleCamChange(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
            >
              <option value="">Predefinito di sistema</option>
              {availableCameras.map((cam) => (
                <option key={cam.deviceId} value={cam.deviceId}>
                  {cam.label || `Webcam ${cam.deviceId.slice(0, 8)}...`}
                </option>
              ))}
            </select>
            <Button onClick={refreshDevices} variant="outline" size="sm" title="Aggiorna dispositivi">
              <RefreshCw className="w-4 h-4" />
            </Button>
            {!camTestActive ? (
              <Button onClick={startCamTest} variant="default" size="sm">
                <Video className="w-4 h-4 mr-1" />
                Testa
              </Button>
            ) : (
              <Button onClick={stopCamTest} variant="destructive" size="sm">
                <XCircle className="w-4 h-4 mr-1" />
                Stop
              </Button>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
            Per future funzionalità video
          </p>
        </CardContent>
      </Card>

      {/* Voice Experience Settings */}
      <VoiceExperienceSettings />

      {/* Info about Continuity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Nota per utenti Mac</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Se hai attivo <strong>Continuity Camera</strong>, macOS potrebbe selezionare automaticamente
            la webcam dell&apos;iPhone invece di quella integrata. Usa i menu sopra per scegliere il
            dispositivo corretto.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Voice Experience Settings - VAD, silence, barge-in controls
function VoiceExperienceSettings() {
  const {
    voiceVadThreshold,
    voiceSilenceDuration,
    voiceBargeInEnabled,
    setVoiceVadThreshold,
    setVoiceSilenceDuration,
    setVoiceBargeInEnabled,
  } = useSettingsStore();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-purple-500" />
          Esperienza Vocale
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          Personalizza il comportamento delle conversazioni vocali con i Professori.
        </p>

        {/* Barge-in Toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
          <div className="space-y-1">
            <div className="font-medium text-slate-900 dark:text-slate-100">
              Interruzione automatica (Barge-in)
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Permetti di interrompere il Professore mentre parla iniziando a parlare tu.
            </p>
          </div>
          <button
            onClick={() => setVoiceBargeInEnabled(!voiceBargeInEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              voiceBargeInEnabled ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-600'
            }`}
            role="switch"
            aria-checked={voiceBargeInEnabled}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                voiceBargeInEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* VAD Threshold - Discrete Steps */}
        <div className="space-y-3">
          <div className="font-medium text-slate-900 dark:text-slate-100">
            Sensibilità rilevamento voce
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 0.35, label: 'Alta', desc: 'Per voce bassa' },
              { value: 0.5, label: 'Media', desc: 'Bilanciata' },
              { value: 0.65, label: 'Bassa', desc: 'Ignora rumore' },
            ].map(({ value, label, desc }) => (
              <button
                key={value}
                onClick={() => setVoiceVadThreshold(value)}
                className={cn(
                  'p-3 rounded-xl border-2 transition-all text-center',
                  Math.abs(voiceVadThreshold - value) < 0.1
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-purple-300'
                )}
              >
                <div className="font-medium text-slate-900 dark:text-slate-100">{label}</div>
                <div className="text-xs text-slate-500">{desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Silence Duration - Discrete Steps */}
        <div className="space-y-3">
          <div className="font-medium text-slate-900 dark:text-slate-100">
            Attesa fine frase
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 350, label: 'Veloce', desc: 'Risposte rapide' },
              { value: 500, label: 'Normale', desc: 'Bilanciata' },
              { value: 700, label: 'Lento', desc: 'Frasi lunghe' },
            ].map(({ value, label, desc }) => (
              <button
                key={value}
                onClick={() => setVoiceSilenceDuration(value)}
                className={cn(
                  'p-3 rounded-xl border-2 transition-all text-center',
                  Math.abs(voiceSilenceDuration - value) < 100
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-purple-300'
                )}
              >
                <div className="font-medium text-slate-900 dark:text-slate-100">{label}</div>
                <div className="text-xs text-slate-500">{desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Reset to defaults */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={() => {
              setVoiceVadThreshold(0.5);
              setVoiceSilenceDuration(500);
              setVoiceBargeInEnabled(true);
            }}
            className="text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
          >
            Ripristina valori predefiniti
          </button>
        </div>
      </CardContent>
    </Card>
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
              {/* Clear Status Banner - Fix for #7 */}
              <div className={cn(
                'p-3 rounded-lg flex items-center gap-3',
                providerStatus.activeProvider === 'azure'
                  ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
                  : providerStatus.activeProvider === 'ollama'
                    ? 'bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800'
                    : 'bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800'
              )}>
                <div className={cn(
                  'w-3 h-3 rounded-full animate-pulse',
                  providerStatus.activeProvider === 'azure' ? 'bg-blue-500' :
                  providerStatus.activeProvider === 'ollama' ? 'bg-green-500' : 'bg-amber-500'
                )} />
                <div className="flex-1">
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {providerStatus.activeProvider === 'azure' ? 'Azure OpenAI' :
                     providerStatus.activeProvider === 'ollama' ? 'Ollama (Locale)' :
                     'Nessun provider attivo'}
                  </span>
                  <span className="text-sm text-slate-600 dark:text-slate-400 ml-2">
                    {providerStatus.activeProvider === 'azure'
                      ? `Chat + Voice (${providerStatus.azure.model})`
                      : providerStatus.activeProvider === 'ollama'
                        ? `Solo Chat (${providerStatus.ollama.model})`
                        : 'Configura un provider'}
                  </span>
                </div>
                {providerStatus.activeProvider && (
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                )}
              </div>

              <p className="text-sm text-slate-500 dark:text-slate-400">
                Clicca per selezionare il provider preferito:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Azure Card - Fix #7: Clear button styling */}
                <button
                  type="button"
                  onClick={() => setPreferredProvider('azure')}
                  className={cn(
                    'p-4 rounded-xl border-2 transition-all text-left',
                    'focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 focus:ring-blue-500',
                    'hover:shadow-md active:scale-[0.99]',
                    preferredProvider === 'azure' && 'ring-2 ring-accent-themed ring-offset-2 dark:ring-offset-slate-900',
                    providerStatus.activeProvider === 'azure'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                      : providerStatus.azure.configured
                        ? 'border-slate-300 dark:border-slate-600 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10'
                        : 'border-slate-200 dark:border-slate-700 opacity-60 cursor-not-allowed'
                  )}
                  disabled={!providerStatus.azure.configured}
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
                </button>

                {/* Ollama Card - Fix #7: Clear button styling */}
                <button
                  type="button"
                  onClick={() => setPreferredProvider('ollama')}
                  className={cn(
                    'p-4 rounded-xl border-2 transition-all text-left',
                    'focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 focus:ring-green-500',
                    'hover:shadow-md active:scale-[0.99]',
                    preferredProvider === 'ollama' && 'ring-2 ring-accent-themed ring-offset-2 dark:ring-offset-slate-900',
                    providerStatus.activeProvider === 'ollama'
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20 shadow-md'
                      : providerStatus.ollama.configured
                        ? 'border-slate-300 dark:border-slate-600 hover:border-green-400 hover:bg-green-50/50 dark:hover:bg-green-900/10'
                        : 'border-slate-200 dark:border-slate-700 opacity-60 cursor-not-allowed'
                  )}
                  disabled={!providerStatus.ollama.configured}
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
                </button>
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

      {/* Showcase Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            Modalità Showcase
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Esplora Convergio Edu senza configurare un provider AI. Demo interattive
            con contenuti statici: maestri, quiz, flashcards, mappe mentali e altro.
          </p>
          <Link href="/showcase">
            <Button variant="outline" className="w-full gap-2">
              <Sparkles className="w-4 h-4" />
              Apri Showcase
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

// Diagnostics Tab - Test all system components
type DiagnosticStatus = 'idle' | 'running' | 'success' | 'error';

interface DiagnosticResult {
  status: DiagnosticStatus;
  message?: string;
  details?: string;
}

function DiagnosticsTab() {
  const [configCheck, setConfigCheck] = useState<DiagnosticResult>({ status: 'idle' });
  const [chatTest, setChatTest] = useState<DiagnosticResult>({ status: 'idle' });
  const [voiceTest, setVoiceTest] = useState<DiagnosticResult>({ status: 'idle' });
  const [micTest, setMicTest] = useState<DiagnosticResult>({ status: 'idle' });
  const [speakerTest, setSpeakerTest] = useState<DiagnosticResult>({ status: 'idle' });

  // Waveform state
  const [waveformActive, setWaveformActive] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [availableMics, setAvailableMics] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicId, setSelectedMicId] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const waveformContextRef = useRef<AudioContext | null>(null);
  const waveformStreamRef = useRef<MediaStream | null>(null);
  const waveformAnalyserRef = useRef<AnalyserNode | null>(null);
  const waveformAnimationRef = useRef<number | null>(null);

  // Webcam test state
  const [webcamActive, setWebcamActive] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamId, setSelectedCamId] = useState<string>('');
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);

  // Fetch available microphones
  const refreshMicrophones = useCallback(async () => {
    try {
      // Request permission first to get device labels
      await navigator.mediaDevices.getUserMedia({ audio: true }).then(s => s.getTracks().forEach(t => t.stop()));
      const devices = await navigator.mediaDevices.enumerateDevices();
      const mics = devices.filter(d => d.kind === 'audioinput');
      setAvailableMics(mics);
      if (mics.length > 0 && !selectedMicId) {
        setSelectedMicId(mics[0].deviceId);
      }
    } catch (error) {
      logger.error('Error fetching microphones', { error });
    }
  }, [selectedMicId]);

  useEffect(() => {
    refreshMicrophones();
  }, [refreshMicrophones]);

  // Fetch available cameras
  const refreshCameras = useCallback(async () => {
    try {
      // Request permission first to get device labels
      await navigator.mediaDevices.getUserMedia({ video: true }).then(s => s.getTracks().forEach(t => t.stop()));
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cams = devices.filter(d => d.kind === 'videoinput');
      setAvailableCameras(cams);
      if (cams.length > 0 && !selectedCamId) {
        setSelectedCamId(cams[0].deviceId);
      }
    } catch (error) {
      logger.error('Error fetching cameras', { error });
    }
  }, [selectedCamId]);

  useEffect(() => {
    refreshCameras();
  }, [refreshCameras]);

  // Check provider configuration
  const runConfigCheck = async () => {
    setConfigCheck({ status: 'running' });
    try {
      const res = await fetch('/api/provider/status');
      const data = await res.json();

      if (data.activeProvider) {
        setConfigCheck({
          status: 'success',
          message: `Provider attivo: ${data.activeProvider}`,
          details: data.activeProvider === 'azure'
            ? `Chat: ${data.azure.model || 'N/A'}, Voice: ${data.azure.realtimeModel || 'Non configurato'}`
            : `Model: ${data.ollama.model}`,
        });
      } else {
        setConfigCheck({
          status: 'error',
          message: 'Nessun provider configurato',
          details: 'Configura Azure OpenAI o avvia Ollama',
        });
      }
    } catch (error) {
      setConfigCheck({
        status: 'error',
        message: 'Errore connessione API',
        details: String(error),
      });
    }
  };

  // Test chat API
  const runChatTest = async () => {
    setChatTest({ status: 'running' });
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Rispondi solo con "OK"' }],
          systemPrompt: 'Sei un assistente. Rispondi brevemente in italiano.',
          maxTokens: 50,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }

      const data = await res.json();
      const responseContent = data.choices?.[0]?.message?.content || data.content || 'No response';
      const provider = data.provider || 'unknown';
      const model = data.model || 'unknown';

      setChatTest({
        status: 'success',
        message: `Chat API funzionante (${provider}/${model})`,
        details: `Risposta: "${responseContent.substring(0, 80)}"`,
      });
    } catch (error) {
      setChatTest({
        status: 'error',
        message: 'Chat API non funzionante',
        details: String(error),
      });
    }
  };

  // Test voice WebSocket with full audio test
  const runVoiceTest = async () => {
    setVoiceTest({ status: 'running', message: 'Connessione in corso...' });

    // Audio playback setup
    let playbackContext: AudioContext | null = null;
    const audioQueue: Float32Array[] = [];
    let isPlaying = false;
    let audioReceived = false;

    const initPlayback = () => {
      if (!playbackContext) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        playbackContext = new AudioCtx({ sampleRate: 24000 });
      }
      return playbackContext;
    };

    const playNextAudio = () => {
      if (!playbackContext || audioQueue.length === 0) {
        isPlaying = false;
        return;
      }
      isPlaying = true;
      const samples = audioQueue.shift()!;
      const buffer = playbackContext.createBuffer(1, samples.length, 24000);
      buffer.getChannelData(0).set(samples);
      const source = playbackContext.createBufferSource();
      source.buffer = buffer;
      source.connect(playbackContext.destination);
      source.onended = () => playNextAudio();
      source.start();
    };

    const queueAudio = (base64Audio: string) => {
      initPlayback();
      if (playbackContext?.state === 'suspended') {
        playbackContext.resume();
      }
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const pcm16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768;
      }
      audioQueue.push(float32);
      audioReceived = true;
      if (!isPlaying) {
        playNextAudio();
      }
    };

    try {
      // 1. Check realtime config
      const statusRes = await fetch('/api/provider/status');
      const status = await statusRes.json();

      if (!status.azure?.realtimeConfigured) {
        setVoiceTest({
          status: 'error',
          message: 'Voice non configurato',
          details: 'Manca AZURE_OPENAI_REALTIME_ENDPOINT/KEY/DEPLOYMENT',
        });
        return;
      }

      // 2. Get proxy info
      const tokenRes = await fetch('/api/realtime/token');
      const tokenData = await tokenRes.json();

      if (!tokenData.configured || !tokenData.proxyPort) {
        setVoiceTest({
          status: 'error',
          message: 'Voice proxy non configurato',
          details: 'Verifica che il proxy WebSocket sia in esecuzione',
        });
        return;
      }

      // 3. Connect to WebSocket and do full voice test
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = window.location.hostname;
      const wsUrl = `${wsProtocol}//${wsHost}:${tokenData.proxyPort}?maestroId=diagnostics`;

      setVoiceTest({ status: 'running', message: 'Connessione WebSocket...' });

      await new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(wsUrl);
        let _sessionUpdated = false;
        let responseDone = false;
        let _transcript = '';

        const timeout = setTimeout(() => {
          ws.close();
          if (audioReceived) {
            resolve(); // Got audio, test passed even with timeout
          } else {
            reject(new Error('Timeout 20s - nessun audio ricevuto'));
          }
        }, 20000);

        ws.onopen = () => {
          setVoiceTest({ status: 'running', message: 'WebSocket connesso, attendo proxy...' });
        };

        ws.onmessage = async (event) => {
          try {
            let msgText: string;
            if (event.data instanceof Blob) {
              msgText = await event.data.text();
            } else {
              msgText = event.data;
            }

            const data = JSON.parse(msgText);

            // Wait for proxy.ready, then send session.update
            if (data.type === 'proxy.ready') {
              setVoiceTest({ status: 'running', message: 'Azure connesso, configurazione sessione...' });
              // Send session.update (Preview API format)
              ws.send(JSON.stringify({
                type: 'session.update',
                session: {
                  voice: 'alloy',
                  instructions: 'Sei un assistente di test. Rispondi brevemente in italiano con una frase.',
                  input_audio_format: 'pcm16',
                  turn_detection: {
                    type: 'server_vad',
                    threshold: 0.5,
                    prefix_padding_ms: 300,
                    silence_duration_ms: 500,
                    create_response: true
                  }
                }
              }));
            }

            if (data.type === 'session.updated') {
              _sessionUpdated = true;
              setVoiceTest({ status: 'running', message: 'Sessione configurata, invio messaggio...' });
              // Send a test message
              ws.send(JSON.stringify({
                type: 'conversation.item.create',
                item: {
                  type: 'message',
                  role: 'user',
                  content: [{ type: 'input_text', text: 'Ciao! Dimmi OK per confermare che funzioni.' }]
                }
              }));
              // Trigger response
              setTimeout(() => {
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({ type: 'response.create' }));
                  setVoiceTest({ status: 'running', message: 'Attendo risposta audio...' });
                }
              }, 100);
            }

            // Handle audio - both Preview and GA API formats
            if ((data.type === 'response.audio.delta' || data.type === 'response.output_audio.delta') && data.delta) {
              queueAudio(data.delta);
              setVoiceTest({ status: 'running', message: 'Ricevendo audio... 🔊' });
            }

            // Handle transcript - both formats
            if ((data.type === 'response.audio_transcript.delta' || data.type === 'response.output_audio_transcript.delta') && data.delta) {
              _transcript += data.delta;
            }

            if (data.type === 'response.done') {
              responseDone = true;
              clearTimeout(timeout);
              ws.close();
              resolve();
            }

            if (data.type === 'error') {
              clearTimeout(timeout);
              ws.close();
              reject(new Error(JSON.stringify(data.error)));
            }

          } catch {
            // Parse error, ignore
          }
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('Errore connessione WebSocket'));
        };

        ws.onclose = (event) => {
          clearTimeout(timeout);
          if (!audioReceived && !responseDone) {
            reject(new Error(`WebSocket chiuso: code=${event.code}, reason=${event.reason || 'none'}`));
          }
        };
      });

      // Success - audio was played!
      setVoiceTest({
        status: 'success',
        message: 'Voice funzionante! Hai sentito la risposta?',
        details: `Proxy: ${wsUrl}, Audio ricevuto e riprodotto`,
      });

    } catch (error) {
      setVoiceTest({
        status: 'error',
        message: 'Voice test fallito',
        details: String(error),
      });
    } finally {
      // Cleanup - playbackContext is set in closure so TypeScript doesn't track it
      try {
        (playbackContext as AudioContext | null)?.close();
      } catch {
        // Ignore close errors
      }
    }
  };

  // Test microphone access
  const runMicTest = async () => {
    setMicTest({ status: 'running' });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const tracks = stream.getAudioTracks();

      if (tracks.length === 0) {
        throw new Error('Nessun microfono trovato');
      }

      const track = tracks[0];
      const settings = track.getSettings();

      // Stop the stream
      stream.getTracks().forEach(t => t.stop());

      setMicTest({
        status: 'success',
        message: 'Microfono funzionante',
        details: `Device: ${track.label || settings.deviceId || 'Default'}`,
      });
    } catch (error) {
      setMicTest({
        status: 'error',
        message: 'Microfono non accessibile',
        details: error instanceof DOMException && error.name === 'NotAllowedError'
          ? 'Permesso negato - abilita il microfono nelle impostazioni del browser'
          : String(error),
      });
    }
  };

  // Test speaker with a beep
  const runSpeakerTest = async () => {
    setSpeakerTest({ status: 'running' });
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

      // Resume if suspended (autoplay policy)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      // Create a simple beep
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 440; // A4 note
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);

      await new Promise(resolve => setTimeout(resolve, 600));

      audioContext.close();

      setSpeakerTest({
        status: 'success',
        message: 'Audio riprodotto (hai sentito il beep?)',
        details: `Sample rate: ${audioContext.sampleRate}Hz`,
      });
    } catch (error) {
      setSpeakerTest({
        status: 'error',
        message: 'Riproduzione audio fallita',
        details: String(error),
      });
    }
  };

  // Start waveform visualization
  const startWaveform = async () => {
    try {
      // Use 'ideal' for graceful fallback if device becomes unavailable
      const audioConstraints: boolean | MediaTrackConstraints = selectedMicId
        ? { deviceId: { ideal: selectedMicId } }
        : true;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      waveformStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioContext = new AudioCtx();
      waveformContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      waveformAnalyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      setWaveformActive(true);

      // Draw waveform
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const timeDataArray = new Uint8Array(analyser.fftSize);

      const draw = () => {
        if (!waveformAnalyserRef.current) return;

        waveformAnimationRef.current = requestAnimationFrame(draw);

        // Get time domain data for waveform
        waveformAnalyserRef.current.getByteTimeDomainData(timeDataArray);

        // Calculate audio level (RMS)
        let sum = 0;
        for (let i = 0; i < timeDataArray.length; i++) {
          const value = (timeDataArray[i] - 128) / 128;
          sum += value * value;
        }
        const rms = Math.sqrt(sum / timeDataArray.length);
        const level = Math.min(100, rms * 400);
        setAudioLevel(level);

        // Draw waveform
        const width = canvas.width;
        const height = canvas.height;

        ctx.fillStyle = 'rgb(15, 23, 42)'; // slate-900
        ctx.fillRect(0, 0, width, height);

        ctx.lineWidth = 2;
        ctx.strokeStyle = level > 5 ? 'rgb(34, 197, 94)' : 'rgb(100, 116, 139)'; // green-500 or slate-500
        ctx.beginPath();

        const sliceWidth = width / timeDataArray.length;
        let x = 0;

        for (let i = 0; i < timeDataArray.length; i++) {
          const v = timeDataArray[i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }

          x += sliceWidth;
        }

        ctx.lineTo(width, height / 2);
        ctx.stroke();

        // Draw level bar at the bottom
        ctx.fillStyle = 'rgb(34, 197, 94)'; // green-500
        ctx.fillRect(0, height - 8, (width * level) / 100, 8);
      };

      draw();
    } catch (error) {
      logger.error('Waveform error', { error });
      setWaveformActive(false);
    }
  };

  // Stop waveform visualization
  const stopWaveform = () => {
    if (waveformAnimationRef.current) {
      cancelAnimationFrame(waveformAnimationRef.current);
      waveformAnimationRef.current = null;
    }
    if (waveformStreamRef.current) {
      waveformStreamRef.current.getTracks().forEach(t => t.stop());
      waveformStreamRef.current = null;
    }
    if (waveformContextRef.current) {
      waveformContextRef.current.close();
      waveformContextRef.current = null;
    }
    waveformAnalyserRef.current = null;
    setWaveformActive(false);
    setAudioLevel(0);

    // Clear canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'rgb(15, 23, 42)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  // Start webcam preview
  const startWebcam = async () => {
    try {
      // Use 'ideal' for graceful fallback if device becomes unavailable
      const videoConstraints: boolean | MediaTrackConstraints = selectedCamId
        ? { deviceId: { ideal: selectedCamId } }
        : true;
      const stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints });
      webcamStreamRef.current = stream;

      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play();
      }

      setWebcamActive(true);
    } catch (error) {
      logger.error('Webcam error', { error });
      setWebcamActive(false);
    }
  };

  // Stop webcam preview
  const stopWebcam = () => {
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach(t => t.stop());
      webcamStreamRef.current = null;
    }
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }
    setWebcamActive(false);
  };

  // Run all tests
  const runAllTests = async () => {
    await runConfigCheck();
    await runChatTest();
    await runVoiceTest();
    await runMicTest();
    await runSpeakerTest();
  };

  const StatusIcon = ({ status }: { status: DiagnosticStatus }) => {
    switch (status) {
      case 'running':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Radio className="w-5 h-5 text-slate-400" />;
    }
  };

  const DiagnosticCard = ({
    title,
    icon,
    result,
    onRun,
  }: {
    title: string;
    icon: React.ReactNode;
    result: DiagnosticResult;
    onRun: () => void;
  }) => (
    <div className={cn(
      'p-4 rounded-xl border-2 transition-all',
      result.status === 'success' && 'border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-700',
      result.status === 'error' && 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700',
      result.status === 'running' && 'border-blue-300 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700',
      result.status === 'idle' && 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50',
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium">{title}</span>
        </div>
        <StatusIcon status={result.status} />
      </div>
      {result.message && (
        <p className={cn(
          'text-sm',
          result.status === 'success' && 'text-green-700 dark:text-green-400',
          result.status === 'error' && 'text-red-700 dark:text-red-400',
          result.status === 'running' && 'text-blue-700 dark:text-blue-400',
        )}>
          {result.message}
        </p>
      )}
      {result.details && (
        <p className="text-xs text-slate-500 mt-1 font-mono">{result.details}</p>
      )}
      <Button
        onClick={onRun}
        disabled={result.status === 'running'}
        variant="default"
        size="sm"
        className="mt-3 w-full"
      >
        {result.status === 'running' ? 'Testing...' : result.status === 'idle' ? 'Esegui Test' : 'Ripeti Test'}
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-orange-500" />
            Diagnostica Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-600 dark:text-slate-400">
            Verifica che tutti i componenti funzionino correttamente: configurazione, chat API (con AI response), voice (con audio playback), microfono e speaker.
          </p>

          <Button onClick={runAllTests} className="w-full" size="lg">
            <Wrench className="w-4 h-4 mr-2" />
            Esegui Tutti i Test
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DiagnosticCard
          title="Configurazione"
          icon={<Server className="w-5 h-5 text-blue-500" />}
          result={configCheck}
          onRun={runConfigCheck}
        />

        <DiagnosticCard
          title="Chat API"
          icon={<MessageSquare className="w-5 h-5 text-green-500" />}
          result={chatTest}
          onRun={runChatTest}
        />

        <DiagnosticCard
          title="Voice (Test Completo)"
          icon={<Radio className="w-5 h-5 text-purple-500" />}
          result={voiceTest}
          onRun={runVoiceTest}
        />

        <DiagnosticCard
          title="Microfono"
          icon={<Mic className="w-5 h-5 text-red-500" />}
          result={micTest}
          onRun={runMicTest}
        />

        <DiagnosticCard
          title="Speaker / Audio"
          icon={<Volume2 className="w-5 h-5 text-amber-500" />}
          result={speakerTest}
          onRun={runSpeakerTest}
        />
      </div>

      {/* Live Waveform Test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-red-500" />
            Test Microfono Live (Waveform)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-600 dark:text-slate-400">
            Avvia il test per vedere la waveform del microfono in tempo reale. Parla per vedere la forma d&apos;onda.
          </p>

          {/* Microphone selector */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
              Microfono:
            </label>
            <select
              value={selectedMicId}
              onChange={(e) => setSelectedMicId(e.target.value)}
              disabled={waveformActive}
              className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {availableMics.length === 0 ? (
                <option value="">Nessun microfono trovato</option>
              ) : (
                availableMics.map((mic) => (
                  <option key={mic.deviceId} value={mic.deviceId}>
                    {mic.label || `Microfono ${mic.deviceId.slice(0, 8)}...`}
                  </option>
                ))
              )}
            </select>
            <Button
              onClick={refreshMicrophones}
              variant="outline"
              size="sm"
              disabled={waveformActive}
              title="Aggiorna lista microfoni"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          <div className="relative">
            <canvas
              ref={canvasRef}
              width={600}
              height={150}
              className="w-full h-[150px] rounded-lg bg-slate-900 border border-slate-700"
            />
            {waveformActive && (
              <div className="absolute top-2 right-2 flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-xs text-white bg-black/50 px-2 py-1 rounded">
                  LIVE
                </span>
              </div>
            )}
          </div>

          {waveformActive && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500">Livello:</span>
              <div className="flex-1 h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-75"
                  style={{ width: `${audioLevel}%` }}
                />
              </div>
              <span className="text-sm font-mono text-slate-600 dark:text-slate-400 w-12">
                {Math.round(audioLevel)}%
              </span>
            </div>
          )}

          <div className="flex gap-3">
            {!waveformActive ? (
              <Button onClick={startWaveform} className="flex-1" variant="default">
                <Mic className="w-4 h-4 mr-2" />
                Avvia Waveform
              </Button>
            ) : (
              <Button onClick={stopWaveform} className="flex-1" variant="destructive">
                <XCircle className="w-4 h-4 mr-2" />
                Stop Waveform
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Live Webcam Test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="w-5 h-5 text-blue-500" />
            Test Webcam Live
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-600 dark:text-slate-400">
            Avvia il test per vedere l&apos;anteprima della webcam selezionata. Utile per verificare che macOS non stia usando la webcam sbagliata con Continuity Camera.
          </p>

          {/* Camera selector */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
              Webcam:
            </label>
            <select
              value={selectedCamId}
              onChange={(e) => setSelectedCamId(e.target.value)}
              disabled={webcamActive}
              className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {availableCameras.length === 0 ? (
                <option value="">Nessuna webcam trovata</option>
              ) : (
                availableCameras.map((cam) => (
                  <option key={cam.deviceId} value={cam.deviceId}>
                    {cam.label || `Webcam ${cam.deviceId.slice(0, 8)}...`}
                  </option>
                ))
              )}
            </select>
            <Button
              onClick={refreshCameras}
              variant="outline"
              size="sm"
              disabled={webcamActive}
              title="Aggiorna lista webcam"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          {/* Video preview */}
          <div className="relative rounded-lg overflow-hidden bg-slate-900 aspect-video">
            <video
              ref={videoPreviewRef}
              className="w-full h-full object-cover"
              muted
              playsInline
            />
            {!webcamActive && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Video className="w-12 h-12 text-slate-600" />
              </div>
            )}
            {webcamActive && (
              <div className="absolute top-2 right-2 flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-xs text-white bg-black/50 px-2 py-1 rounded">
                  LIVE
                </span>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            {!webcamActive ? (
              <Button onClick={startWebcam} className="flex-1" variant="default">
                <Video className="w-4 h-4 mr-2" />
                Avvia Webcam
              </Button>
            ) : (
              <Button onClick={stopWebcam} className="flex-1" variant="destructive">
                <XCircle className="w-4 h-4 mr-2" />
                Stop Webcam
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Troubleshooting hints */}
      <Card>
        <CardHeader>
          <CardTitle>Risoluzione Problemi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="font-medium text-blue-700 dark:text-blue-300">Chat non funziona?</p>
            <p className="text-blue-600 dark:text-blue-400 mt-1">
              Verifica che Azure OpenAI o Ollama siano configurati. Controlla le variabili .env e i log del server.
            </p>
          </div>

          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <p className="font-medium text-purple-700 dark:text-purple-300">Voice non funziona?</p>
            <p className="text-purple-600 dark:text-purple-400 mt-1">
              La voce richiede Azure OpenAI Realtime API (AZURE_OPENAI_REALTIME_*). Ollama non supporta voice.
            </p>
          </div>

          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="font-medium text-red-700 dark:text-red-300">Microfono bloccato?</p>
            <p className="text-red-600 dark:text-red-400 mt-1">
              Clicca sull&apos;icona del lucchetto nella barra URL del browser e abilita il permesso microfono.
            </p>
          </div>

          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <p className="font-medium text-amber-700 dark:text-amber-300">Audio non si sente?</p>
            <p className="text-amber-600 dark:text-amber-400 mt-1">
              Verifica il volume del sistema. Se usi Chrome, potrebbe bloccare l&apos;audio autoplay - clicca prima sulla pagina.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Accessibility,
  Palette,
  Bell,
  Shield,
  Save,
  Undo2,
  BarChart3,
  Users,
  UserCircle,
  Bot,
  Volume2,
  Music,
  Wrench,
  Settings,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AccessibilitySettings } from '@/components/accessibility/accessibility-settings';
import { useSettingsStore } from '@/lib/stores';
import { useAccessibilityStore } from '@/lib/accessibility/accessibility-store';
import { TelemetryDashboard } from '@/components/telemetry';
import { OnboardingSettings } from '@/components/settings/onboarding-settings';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { PageHeader } from '@/components/ui/page-header';

// Import section components
import {
  ProfileSettings,
  CharacterSettings,
  AccessibilityTab,
  AppearanceSettings,
  NotificationSettings,
  PrivacySettings,
  AudioSettings,
  AmbientAudioSettings,
  AIProviderSettings,
  DiagnosticsTab,
} from './sections';

type SettingsTab = 'profile' | 'characters' | 'accessibility' | 'appearance' | 'ai' | 'audio' | 'ambient-audio' | 'notifications' | 'telemetry' | 'privacy' | 'genitori' | 'diagnostics';

const tabs: Array<{ id: SettingsTab; label: string; icon: React.ReactNode }> = [
  { id: 'profile', label: 'Profilo', icon: <User className="w-5 h-5" /> },
  { id: 'characters', label: 'Personaggi', icon: <Users className="w-5 h-5" /> },
  { id: 'accessibility', label: 'Accessibilita', icon: <Accessibility className="w-5 h-5" /> },
  { id: 'appearance', label: 'Aspetto', icon: <Palette className="w-5 h-5" /> },
  { id: 'ai', label: 'AI Provider', icon: <Bot className="w-5 h-5" /> },
  { id: 'audio', label: 'Audio/Video', icon: <Volume2 className="w-5 h-5" /> },
  { id: 'ambient-audio', label: 'Audio Ambientale', icon: <Music className="w-5 h-5" /> },
  { id: 'notifications', label: 'Notifiche', icon: <Bell className="w-5 h-5" /> },
  { id: 'telemetry', label: 'Statistiche', icon: <BarChart3 className="w-5 h-5" /> },
  { id: 'privacy', label: 'Privacy', icon: <Shield className="w-5 h-5" /> },
  { id: 'genitori', label: 'Genitori', icon: <UserCircle className="w-5 h-5" /> },
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
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-6">
      <PageHeader
        icon={Settings}
        title="Impostazioni"
        rightContent={
          <>
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
          </>
        }
      />

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

        {activeTab === 'ambient-audio' && <AmbientAudioSettings />}

        {activeTab === 'notifications' && <NotificationSettings />}

        {activeTab === 'privacy' && (
          <>
            <OnboardingSettings />
            <PrivacySettings />
          </>
        )}

        {activeTab === 'genitori' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCircle className="w-5 h-5" />
                Area Genitori
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Accedi alla dashboard dedicata ai genitori per monitorare i progressi
                e le attivita del tuo bambino in modo sicuro e rispettoso della privacy (GDPR).
              </p>
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Consenso richiesto:</strong> La dashboard genitori richiede il consenso
                  sia del genitore che dello studente per rispettare la normativa GDPR sulla
                  protezione dei dati dei minori.
                </p>
              </div>
              <Link href="/parent-dashboard">
                <Button className="w-full mt-4" size="lg">
                  <UserCircle className="w-5 h-5 mr-2" />
                  Apri Dashboard Genitori
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

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

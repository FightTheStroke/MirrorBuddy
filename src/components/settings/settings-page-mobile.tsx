"use client";

import { useState, useCallback, useRef } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/lib/stores";
import { clientLogger } from "@/lib/logger/client";
import { useAccessibilityStore } from "@/lib/accessibility/accessibility-store";
import {
  SettingsSectionsMobile,
  type SettingsSection,
} from "./settings-sections-mobile";

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
} from "./sections";

import { GoogleAccountCard } from "@/components/google-drive";
import { getUserId } from "@/lib/hooks/use-saved-materials/utils/user-id";
import { OnboardingSettings } from "@/components/settings/onboarding-settings";
import { TelemetryDashboard } from "@/components/telemetry";

interface SettingsPageMobileProps {
  onBack: () => void;
}

export function SettingsPageMobile({ onBack }: SettingsPageMobileProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const {
    studentProfile,
    updateStudentProfile,
    appearance,
    updateAppearance,
    syncToServer,
  } = useSettingsStore();

  const {
    settings: accessibilitySettings,
    updateSettings: updateAccessibilitySettings,
  } = useAccessibilityStore();

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await syncToServer();
      setHasChanges(false);
    } catch (error) {
      clientLogger.error(
        "Failed to save settings",
        { component: "SettingsPageMobile" },
        error,
      );
    } finally {
      setIsSaving(false);
    }
  }, [syncToServer]);

  // Build sections array for SettingsSectionsMobile
  const sections: SettingsSection[] = [
    {
      id: "profile",
      title: "Profilo",
      icon: "👤",
      content: (
        <ProfileSettings
          profile={studentProfile}
          onUpdate={updateStudentProfile}
        />
      ),
    },
    {
      id: "characters",
      title: "Personaggi",
      icon: "👥",
      content: (
        <CharacterSettings
          profile={studentProfile}
          onUpdate={updateStudentProfile}
        />
      ),
    },
    {
      id: "accessibility",
      title: "Accessibilita",
      icon: "♿",
      content: (
        <AccessibilityTab
          settings={accessibilitySettings}
          onOpenModal={() => {}}
          onUpdateSettings={updateAccessibilitySettings}
        />
      ),
    },
    {
      id: "appearance",
      title: "Aspetto",
      icon: "🎨",
      content: (
        <AppearanceSettings
          appearance={appearance}
          onUpdate={updateAppearance}
        />
      ),
    },
    {
      id: "audio",
      title: "Audio/Video",
      icon: "🔊",
      content: <AudioSettings />,
    },
    {
      id: "ai",
      title: "AI Provider",
      icon: "🤖",
      content: <AIProviderSettings />,
    },
    {
      id: "ambient-audio",
      title: "Audio Ambientale",
      icon: "🎵",
      content: <AmbientAudioSettings />,
    },
    {
      id: "integrations",
      title: "Integrazioni",
      icon: "☁️",
      content: <GoogleAccountCard userId={getUserId()} />,
    },
    {
      id: "notifications",
      title: "Notifiche",
      icon: "🔔",
      content: <NotificationSettings />,
    },
    {
      id: "privacy",
      title: "Privacy",
      icon: "🔒",
      content: (
        <div className="space-y-6">
          <OnboardingSettings />
          <PrivacySettings />
        </div>
      ),
    },
    {
      id: "telemetry",
      title: "Statistiche",
      icon: "📊",
      content: <TelemetryDashboard />,
    },
    {
      id: "genitori",
      title: "Genitori",
      icon: "👨‍👩‍👧",
      content: (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Dashboard Genitori</strong> - Area dedicata ai genitori per
            monitorare i progressi.
          </p>
        </div>
      ),
    },
    {
      id: "diagnostics",
      title: "Diagnostica",
      icon: "🔧",
      content: <DiagnosticsTab />,
    },
  ];

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-slate-950 pt-[env(safe-area-inset-top)]">
      {/* Sticky Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "sticky top-0 left-0 right-0 z-40",
          "bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800",
          "flex items-center justify-between px-4 py-3",
          "h-14 sm:hidden",
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="min-w-[44px] min-h-[44px] -ml-2"
          aria-label="Indietro"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <h1 className="text-lg font-semibold text-center flex-1">
          Impostazioni
        </h1>

        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          size="sm"
          className={cn(
            "min-w-[44px] min-h-[44px] -mr-2",
            hasChanges &&
              !isSaving &&
              "bg-amber-500 hover:bg-amber-600 animate-pulse",
          )}
          title={hasChanges ? "Salva modifiche" : "Nessuna modifica"}
        >
          <Save className="w-4 h-4" />
        </Button>
      </motion.header>

      {/* Scrollable Content */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 py-6 pb-20"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <SettingsSectionsMobile sections={sections} />
        </motion.div>
      </div>
    </div>
  );
}

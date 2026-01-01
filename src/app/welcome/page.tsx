'use client';

import { Suspense, useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Wifi, WifiOff, Cloud, Volume2 } from 'lucide-react';
import { useOnboardingStore, getStepIndex, getTotalSteps } from '@/lib/stores/onboarding-store';
import { useVoiceSession } from '@/lib/hooks/use-voice-session';
import { WelcomeStep } from './components/welcome-step';
import { InfoStep } from './components/info-step';
import { PrinciplesStep } from './components/principles-step';
import { MaestriStep } from './components/maestri-step';
import { ReadyStep } from './components/ready-step';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import type { VoiceSessionHandle } from '@/types';
import type { Maestro, Subject, MaestroVoice } from '@/types';
import {
  MELISSA_ONBOARDING_PROMPT,
  MELISSA_ONBOARDING_VOICE_INSTRUCTIONS,
} from '@/lib/voice/onboarding-tools';

interface VoiceConnectionInfo {
  provider: 'azure';
  proxyPort: number;
  configured: boolean;
}

/**
 * Create Melissa maestro for onboarding with specialized prompts.
 */
function createOnboardingMelissa(): Maestro {
  return {
    id: 'melissa-onboarding',
    name: 'Melissa',
    subject: 'methodology' as Subject,
    specialty: 'Learning Coach - Onboarding',
    voice: 'shimmer' as MaestroVoice,
    voiceInstructions: MELISSA_ONBOARDING_VOICE_INSTRUCTIONS,
    teachingStyle: 'scaffolding',
    avatar: '/avatars/melissa.jpg',
    color: '#EC4899',
    systemPrompt: MELISSA_ONBOARDING_PROMPT,
    greeting: 'Ciao! Sono Melissa, piacere di conoscerti! Come ti chiami?',
  };
}

function WelcomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isReplay = searchParams.get('replay') === 'true';

  const {
    hasCompletedOnboarding,
    currentStep,
    isReplayMode,
    azureAvailable,
    startReplay,
    resetOnboarding,
    addVoiceTranscript,
  } = useOnboardingStore();

  // Track if we should use Web Speech fallback (when Azure unavailable)
  const [useWebSpeechFallback, setUseWebSpeechFallback] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState<VoiceConnectionInfo | null>(null);
  const [hasCheckedAzure, setHasCheckedAzure] = useState(false);
  const lastTranscriptRef = useRef<string | null>(null);

  // ========== SINGLE VOICE SESSION FOR ALL ONBOARDING STEPS ==========
  const voiceSession = useVoiceSession({
    noiseReductionType: 'far_field',
    onError: (error) => {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[WelcomePage] Voice error', { message });
      setUseWebSpeechFallback(true);
    },
    onTranscript: (role, text) => {
      // Deduplicate transcripts
      if (lastTranscriptRef.current === text.substring(0, 50)) return;
      lastTranscriptRef.current = text.substring(0, 50);
      addVoiceTranscript(role as 'user' | 'assistant', text);
    },
  });

  // Fetch voice connection info on mount
  useEffect(() => {
    async function fetchConnectionInfo() {
      try {
        const response = await fetch('/api/realtime/token');
        const data = await response.json();
        if (data.error) {
          logger.error('[WelcomePage] Voice API error', { error: data.error });
          setHasCheckedAzure(true);
          setUseWebSpeechFallback(true);
          return;
        }
        setConnectionInfo(data as VoiceConnectionInfo);
        setHasCheckedAzure(true);
      } catch (error) {
        logger.error('[WelcomePage] Failed to get voice config', { error: String(error) });
        setHasCheckedAzure(true);
        setUseWebSpeechFallback(true);
      }
    }
    fetchConnectionInfo();
  }, []);

  // Create voice session handle to pass to children
  const voiceSessionHandle: VoiceSessionHandle = {
    isConnected: voiceSession.isConnected,
    isListening: voiceSession.isListening,
    isSpeaking: voiceSession.isSpeaking,
    isMuted: voiceSession.isMuted,
    connectionState: voiceSession.connectionState,
    connect: voiceSession.connect,
    disconnect: voiceSession.disconnect,
    toggleMute: voiceSession.toggleMute,
  };

  // Callback when Azure is unavailable - fallback to Web Speech TTS
  const handleAzureUnavailable = useCallback(() => {
    setUseWebSpeechFallback(true);
  }, []);

  // Handle replay mode
  useEffect(() => {
    if (isReplay && !isReplayMode) {
      startReplay();
    }
  }, [isReplay, isReplayMode, startReplay]);

  // DEV: Skip onboarding with ?skip=true
  const skipOnboarding = searchParams.get('skip') === 'true';
  useEffect(() => {
    if (skipOnboarding) {
      // Mark as completed and redirect
      useOnboardingStore.getState().completeOnboarding();
      router.push('/');
      return;
    }
  }, [skipOnboarding, router]);

  // Redirect if already completed and not in replay mode
  useEffect(() => {
    if (hasCompletedOnboarding && !isReplay && !isReplayMode) {
      router.push('/');
    }
  }, [hasCompletedOnboarding, isReplay, isReplayMode, router]);

  const stepIndex = getStepIndex(currentStep);
  const totalSteps = getTotalSteps();

  // Step components mapping
  const stepComponents = {
    welcome: WelcomeStep,
    info: InfoStep,
    principles: PrinciplesStep,
    maestri: MaestriStep,
    ready: ReadyStep,
  };

  const CurrentStepComponent = stepComponents[currentStep];

  // Handle reset - clears all data and restarts onboarding
  const handleReset = () => {
    if (confirm('Vuoi ricominciare da capo? Tutti i dati inseriti verranno cancellati.')) {
      voiceSession.disconnect(); // Disconnect voice before resetting
      resetOnboarding();
      setUseWebSpeechFallback(false);
      // Force page reload to reset all states
      window.location.href = '/welcome';
    }
  };

  // Determine voice mode status
  const getVoiceModeInfo = () => {
    if (!hasCheckedAzure) {
      return { label: 'Verifica...', icon: Wifi, color: 'text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800' };
    }
    if (useWebSpeechFallback || !connectionInfo) {
      return {
        label: 'Web Speech',
        icon: Volume2,
        color: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-50 dark:bg-amber-900/30',
        tooltip: 'Modalità Fallback: Azure non disponibile. Uso Web Speech API del browser per la voce.'
      };
    }
    return {
      label: 'Azure Realtime',
      icon: Cloud,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-900/30',
      tooltip: 'Azure OpenAI Realtime API: Conversazione vocale bidirezionale in tempo reale con Melissa.'
    };
  };

  const voiceMode = getVoiceModeInfo();
  const VoiceModeIcon = voiceMode.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-purple-950 dark:to-blue-950">
      {/* Progress indicator */}
      <div className="fixed top-0 left-0 right-0 z-50 px-4 py-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Benvenuto in ConvergioEdu
            </span>

            <div className="flex items-center gap-3">
              {/* Voice Mode Indicator */}
              <div
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium cursor-help',
                  voiceMode.bg, voiceMode.color
                )}
                title={voiceMode.tooltip}
              >
                <VoiceModeIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{voiceMode.label}</span>
              </div>

              {/* Step counter */}
              <span className="text-sm text-gray-500 dark:text-gray-500">
                {stepIndex + 1} / {totalSteps}
              </span>

              {/* Reset button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="h-7 px-2 text-gray-500 hover:text-red-500"
                title="Ricomincia da capo (cancella tutti i dati)"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex gap-1.5">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1.5 flex-1 rounded-full transition-all duration-300',
                  i < stepIndex
                    ? 'bg-pink-500'
                    : i === stepIndex
                      ? 'bg-pink-400'
                      : 'bg-gray-200 dark:bg-gray-700'
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Voice Mode Explanation Banner (shown when in fallback) */}
      {useWebSpeechFallback && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-16 left-0 right-0 z-40 px-4 py-2 bg-amber-50 dark:bg-amber-900/50 border-b border-amber-200 dark:border-amber-800"
        >
          <div className="max-w-2xl mx-auto flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
            <WifiOff className="w-4 h-4 flex-shrink-0" />
            <p>
              <strong>Modalità Fallback:</strong> Azure Realtime API non disponibile.
              Melissa usa Web Speech API del browser (voce sintetica, no conversazione).
            </p>
          </div>
        </motion.div>
      )}

      {/* Main content - centered single column */}
      <div className={cn(
        "pb-8 px-4 min-h-screen flex items-center justify-center",
        useWebSpeechFallback ? "pt-28" : "pt-20"
      )}>
        <div className="w-full max-w-md">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <CurrentStepComponent
                useWebSpeechFallback={useWebSpeechFallback}
                onAzureUnavailable={handleAzureUnavailable}
                voiceSession={voiceSessionHandle}
                connectionInfo={connectionInfo}
                onboardingMelissa={createOnboardingMelissa()}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default function WelcomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-purple-950 dark:to-blue-950 flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Caricamento...</div>
      </div>
    }>
      <WelcomeContent />
    </Suspense>
  );
}

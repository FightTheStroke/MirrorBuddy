"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import type { VoiceSessionHandle } from "@/types";
import { WelcomeStep } from "./components/welcome-step";
import { InfoStep } from "./components/info-step";
import { PrinciplesStep } from "./components/principles-step";
import { MaestriStep } from "./components/maestri-step";
import { ReadyStep } from "./components/ready-step";
import { LoadingState } from "./components/loading-state";
import { LandingPage } from "./components/landing-page";
import { ProgressIndicator } from "./components/progress-indicator";
import { VoiceFallbackBanner } from "./components/voice-fallback-banner";
import { useExistingUserData } from "./hooks/use-existing-user-data";
import { useVoiceConnection } from "./hooks/use-voice-connection";
import { useWelcomeVoice } from "./hooks/use-welcome-voice";
import { createOnboardingMelissa } from "./utils/create-onboarding-melissa";
import type { ExistingUserData as _ExistingUserData } from "./types";

function WelcomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isReplay = searchParams.get("replay") === "true";
  const skipOnboarding = searchParams.get("skip") === "true";

  const {
    hasCompletedOnboarding,
    currentStep,
    isReplayMode,
    startReplay,
    resetOnboarding,
  } = useOnboardingStore();

  const { existingUserData, hasCheckedExistingData } = useExistingUserData();
  const {
    connectionInfo,
    hasCheckedAzure,
    useWebSpeechFallback,
    setUseWebSpeechFallback,
  } = useVoiceConnection();
  const { voiceSession, handleAzureUnavailable } = useWelcomeVoice(
    existingUserData,
    connectionInfo,
  );

  const [showLandingPage, setShowLandingPage] = useState(true);

  const voiceSessionHandle: VoiceSessionHandle = {
    isConnected: voiceSession.isConnected,
    isListening: voiceSession.isListening,
    isSpeaking: voiceSession.isSpeaking,
    isMuted: voiceSession.isMuted,
    connectionState: voiceSession.connectionState,
    connect: voiceSession.connect,
    disconnect: voiceSession.disconnect,
    toggleMute: voiceSession.toggleMute,
    videoEnabled: false,
    toggleVideo: async () => {},
    videoStream: null,
    videoFramesSent: 0,
  };

  useEffect(() => {
    if (isReplay && !isReplayMode) {
      startReplay();
    }
  }, [isReplay, isReplayMode, startReplay]);

  useEffect(() => {
    if (skipOnboarding) {
      useOnboardingStore.getState().completeOnboarding();
      router.push("/");
      return;
    }
  }, [skipOnboarding, router]);

  useEffect(() => {
    if (hasCompletedOnboarding && !isReplay && !isReplayMode) {
      router.push("/");
    }
  }, [hasCompletedOnboarding, isReplay, isReplayMode, router]);

  const stepComponents = {
    welcome: WelcomeStep,
    info: InfoStep,
    principles: PrinciplesStep,
    maestri: MaestriStep,
    ready: ReadyStep,
  };

  const CurrentStepComponent = stepComponents[currentStep];

  const handleReset = () => {
    if (
      confirm(
        "Vuoi ricominciare da capo? Tutti i dati inseriti verranno cancellati.",
      )
    ) {
      voiceSession.disconnect();
      resetOnboarding();
      setUseWebSpeechFallback(false);
      window.location.href = "/welcome";
    }
  };

  const handleStartOnboarding = useCallback(() => {
    setShowLandingPage(false);
  }, []);

  const onboardingMelissa = createOnboardingMelissa(existingUserData);

  if (!hasCheckedExistingData) {
    return <LoadingState />;
  }

  if (showLandingPage) {
    return (
      <LandingPage
        existingUserData={existingUserData}
        onStartOnboarding={handleStartOnboarding}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-purple-950 dark:to-blue-950">
      <ProgressIndicator
        existingUserName={existingUserData?.name}
        hasCheckedAzure={hasCheckedAzure}
        useWebSpeechFallback={useWebSpeechFallback}
        connectionInfo={connectionInfo}
        onReset={handleReset}
      />

      {useWebSpeechFallback && <VoiceFallbackBanner />}

      <div
        className={cn(
          "pb-8 px-4 min-h-screen flex items-center justify-center",
          useWebSpeechFallback ? "pt-28" : "pt-20",
        )}
      >
        <div className="w-full max-w-md">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <CurrentStepComponent
                useWebSpeechFallback={useWebSpeechFallback}
                onAzureUnavailable={handleAzureUnavailable}
                existingUserData={existingUserData}
                voiceSession={voiceSessionHandle}
                connectionInfo={connectionInfo}
                onboardingMelissa={onboardingMelissa}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export function WelcomeClient() {
  return (
    <Suspense fallback={<LoadingState />}>
      <WelcomeContent />
    </Suspense>
  );
}

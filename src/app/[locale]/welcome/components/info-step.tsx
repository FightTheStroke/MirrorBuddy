"use client";

import { useState, useEffect, useRef } from "react";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import {
  useOnboardingTTS,
  ONBOARDING_SCRIPTS,
} from "@/lib/hooks/use-onboarding-tts";
import { InfoStepVoice } from "./info-step-voice";
import { InfoStepForm } from "./info-step-form";
import type { Maestro, VoiceSessionHandle } from "@/types";

interface VoiceConnectionInfo {
  provider: "azure";
  proxyPort: number;
  configured: boolean;
}

interface ExistingUserData {
  name: string;
  age?: number;
  schoolLevel?: "elementare" | "media" | "superiore";
  learningDifferences?: string[];
}

interface InfoStepProps {
  useWebSpeechFallback?: boolean;
  onAzureUnavailable?: () => void;
  existingUserData?: ExistingUserData | null;
  /** Voice session handle from parent */
  voiceSession?: VoiceSessionHandle;
  /** Connection info from parent */
  connectionInfo?: VoiceConnectionInfo | null;
  /** Melissa maestro from parent */
  onboardingMelissa?: Maestro;
}

/**
 * Step 2: Optional info collection (skippable)
 *
 * TWO MODES:
 * 1. Voice mode (default): Melissa continues conversation from step 1
 * 2. Form mode (fallback): Traditional form when Azure unavailable
 *
 * Collects:
 * - Age (optional)
 * - School level (optional)
 * - Learning differences (optional, for accessibility presets)
 */
export function InfoStep({
  useWebSpeechFallback = false,
  onAzureUnavailable,
  existingUserData,
  voiceSession,
  connectionInfo,
  onboardingMelissa,
}: InfoStepProps) {
  const {
    data,
    updateData,
    nextStep,
    prevStep,
    isReplayMode,
    isVoiceMuted,
    setVoiceMuted,
  } = useOnboardingStore();

  const [age, setAge] = useState<number | undefined>(data.age);
  const [schoolLevel, setSchoolLevel] = useState<
    "elementare" | "media" | "superiore" | undefined
  >(data.schoolLevel);
  const [selectedDifferences, setSelectedDifferences] = useState<string[]>(
    data.learningDifferences || [],
  );

  // Sync local state with store (when voice captures data)
  const prevAgeRef = useRef(data.age);
  const prevSchoolRef = useRef(data.schoolLevel);
  const prevDiffsRef = useRef(data.learningDifferences);

  useEffect(() => {
    if (data.age !== undefined && data.age !== prevAgeRef.current) {
      prevAgeRef.current = data.age;
      queueMicrotask(() => setAge(data.age));
    }
  }, [data.age]);

  useEffect(() => {
    if (data.schoolLevel && data.schoolLevel !== prevSchoolRef.current) {
      prevSchoolRef.current = data.schoolLevel;
      queueMicrotask(() => setSchoolLevel(data.schoolLevel));
    }
  }, [data.schoolLevel]);

  useEffect(() => {
    if (data.learningDifferences && data.learningDifferences.length > 0) {
      const prevSet = new Set(prevDiffsRef.current || []);
      const newSet = new Set(data.learningDifferences);
      const hasChanged =
        ![...prevSet].every((d) => newSet.has(d)) ||
        ![...newSet].every((d) => prevSet.has(d));
      if (hasChanged) {
        prevDiffsRef.current = data.learningDifferences;
        queueMicrotask(() =>
          setSelectedDifferences(data.learningDifferences || []),
        );
      }
    }
  }, [data.learningDifferences]);

  // Auto-speak Melissa's info message (only when using Web Speech fallback)
  const { isPlaying, stop } = useOnboardingTTS({
    autoSpeak: useWebSpeechFallback && !isVoiceMuted,
    text: ONBOARDING_SCRIPTS.info,
    delay: 500,
  });

  const toggleMute = () => {
    if (isPlaying) stop();
    setVoiceMuted(!isVoiceMuted);
  };

  const handleContinue = () => {
    stop();
    updateData({
      age,
      schoolLevel,
      learningDifferences: selectedDifferences,
    });
    nextStep();
  };

  const handleSkip = () => {
    stop();
    nextStep();
  };

  const handleBack = () => {
    stop();
    prevStep();
  };

  const toggleDifference = (id: string) => {
    setSelectedDifferences((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id],
    );
  };

  // Voice mode: Melissa continues conversation
  if (!useWebSpeechFallback) {
    return (
      <InfoStepVoice
        data={data}
        voiceSession={voiceSession}
        connectionInfo={connectionInfo}
        onboardingMelissa={onboardingMelissa}
        existingUserData={existingUserData}
        onAzureUnavailable={onAzureUnavailable}
        isReplayMode={isReplayMode}
        onBack={handleBack}
        onContinue={handleContinue}
        onSkip={handleSkip}
      />
    );
  }

  // Form mode: Fallback when Azure unavailable
  return (
    <InfoStepForm
      userName={data.name}
      age={age}
      schoolLevel={schoolLevel}
      selectedDifferences={selectedDifferences}
      isVoiceMuted={isVoiceMuted}
      isPlaying={isPlaying}
      isReplayMode={isReplayMode}
      onAgeChange={setAge}
      onSchoolLevelChange={setSchoolLevel}
      onDifferenceToggle={toggleDifference}
      onMuteToggle={toggleMute}
      onBack={handleBack}
      onSkip={handleSkip}
      onContinue={handleContinue}
    />
  );
}

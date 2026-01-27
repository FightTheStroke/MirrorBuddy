"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { VoiceOnboardingPanel } from "@/components/onboarding/voice-onboarding-panel";
import { WelcomeFormContent } from "./welcome-form-content";
import {
  useOnboardingTTS,
  ONBOARDING_SCRIPTS,
} from "@/lib/hooks/use-onboarding-tts";
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

interface WelcomeStepProps {
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
 * Step 1: Melissa intro + asks for student name
 *
 * TWO MODES:
 * 1. Voice mode (default): Melissa auto-starts and asks for name via voice
 * 2. Form mode (fallback): Traditional form when Azure unavailable
 *
 * Voice Integration (#61):
 * - Melissa auto-connects when page loads (no button click needed)
 * - Falls back to form + Web Speech TTS when Azure unavailable
 */
export function WelcomeStep({
  useWebSpeechFallback = false,
  onAzureUnavailable,
  existingUserData,
  voiceSession,
  connectionInfo,
  onboardingMelissa,
}: WelcomeStepProps) {
  const {
    data,
    updateData,
    nextStep,
    isReplayMode,
    isVoiceMuted,
    setVoiceMuted,
  } = useOnboardingStore();

  const [name, setName] = useState(data.name || "");
  const [error, setError] = useState("");

  // Track previous store value to detect voice-captured changes
  const prevNameRef = useRef(data.name);

  // Sync local name state with store (when voice captures name)
  useEffect(() => {
    if (data.name && data.name !== prevNameRef.current) {
      prevNameRef.current = data.name;
      queueMicrotask(() => {
        setName(data.name);
      });
    }
  }, [data.name]);

  // Auto-speak Melissa's welcome message (only when using Web Speech fallback)
  const { isPlaying, stop } = useOnboardingTTS({
    autoSpeak: useWebSpeechFallback && !isVoiceMuted,
    text: ONBOARDING_SCRIPTS.welcome,
    delay: 800,
  });

  const toggleMute = () => {
    if (isPlaying) {
      stop();
    }
    setVoiceMuted(!isVoiceMuted);
  };

  const handleContinue = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Per favore, dimmi come ti chiami!");
      return;
    }
    if (trimmedName.length < 2) {
      setError("Il nome deve avere almeno 2 caratteri");
      return;
    }
    stop();
    updateData({ name: trimmedName });
    nextStep();
  };

  // ========== VOICE MODE: Melissa auto-starts (default when Azure available) ==========
  if (!useWebSpeechFallback) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md mx-auto"
      >
        {/* Melissa voice panel - user clicks to start call */}
        {voiceSession && onboardingMelissa && (
          <VoiceOnboardingPanel
            step="welcome"
            onFallbackToWebSpeech={onAzureUnavailable}
            className="w-full"
            voiceSession={voiceSession}
            connectionInfo={connectionInfo ?? null}
            onboardingMelissa={onboardingMelissa}
            existingUserData={existingUserData}
          />
        )}

        {/* Show captured name with continue button */}
        <AnimatePresence>
          {data.name && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-4 p-4 bg-white/90 dark:bg-gray-800/90 rounded-2xl shadow-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Nome catturato
                  </p>
                  <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                    {data.name}
                  </p>
                </div>
              </div>

              <Button
                onClick={handleContinue}
                className="w-full mt-4 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white"
              >
                Continua
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {isReplayMode && (
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
            Stai rivedendo il tutorial. I tuoi dati esistenti non verranno
            modificati.
          </p>
        )}
      </motion.div>
    );
  }

  // ========== FORM MODE: Fallback when Azure unavailable ==========
  return (
    <WelcomeFormContent
      name={name}
      error={error}
      isVoiceMuted={isVoiceMuted}
      isReplayMode={isReplayMode}
      onNameChange={(value) => {
        setName(value);
        setError("");
      }}
      onContinue={handleContinue}
      onToggleMute={toggleMute}
    />
  );
}

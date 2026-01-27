"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  SkipForward,
  Check,
  Circle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { VoiceOnboardingPanel } from "@/components/onboarding/voice-onboarding-panel";
import { LEARNING_DIFFERENCES } from "./info-step-data";
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

interface InfoStepVoiceProps {
  data: {
    age?: number;
    schoolLevel?: "elementare" | "media" | "superiore";
    learningDifferences?: string[];
    name: string;
  };
  voiceSession?: VoiceSessionHandle;
  connectionInfo?: VoiceConnectionInfo | null;
  onboardingMelissa?: Maestro;
  existingUserData?: ExistingUserData | null;
  onAzureUnavailable?: () => void;
  isReplayMode: boolean;
  onBack: () => void;
  onContinue: () => void;
  onSkip: () => void;
}

/**
 * Voice mode for InfoStep - uses Melissa to continue conversation from step 1
 * Shows collected data summary with navigation buttons
 */
export function InfoStepVoice({
  data,
  voiceSession,
  connectionInfo,
  onboardingMelissa,
  existingUserData,
  onAzureUnavailable,
  isReplayMode,
  onBack,
  onContinue,
  onSkip,
}: InfoStepVoiceProps) {
  const t = useTranslations("welcome.welcomeForm");

  // Check if we have enough data to show continue button
  const hasData =
    data.age ||
    data.schoolLevel ||
    (data.learningDifferences && data.learningDifferences.length > 0);

  // Get readable label for school level
  const getSchoolLevelLabel = (level?: string) => {
    if (!level) return "...";
    return level === "elementare"
      ? t("schoolElementary")
      : level === "media"
        ? t("schoolMiddle")
        : t("schoolHigh");
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-md mx-auto"
    >
      {/* Melissa continues conversation (already connected from step 1) */}
      {voiceSession && onboardingMelissa && (
        <VoiceOnboardingPanel
          step="info"
          onFallbackToWebSpeech={onAzureUnavailable}
          className="w-full"
          voiceSession={voiceSession}
          connectionInfo={connectionInfo ?? null}
          onboardingMelissa={onboardingMelissa}
          existingUserData={existingUserData}
        />
      )}

      {/* Show collected data summary with navigation */}
      <AnimatePresence>
        {hasData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mt-4 p-4 bg-white/90 dark:bg-gray-800/90 rounded-2xl shadow-lg space-y-3"
          >
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">
              {t("collectedData")}
            </h3>

            <div className="space-y-2">
              {/* Age */}
              <div className="flex items-center gap-2 text-sm">
                {data.age ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Circle className="w-4 h-4 text-gray-300" />
                )}
                <span
                  className={
                    data.age
                      ? "text-gray-800 dark:text-gray-200"
                      : "text-gray-400"
                  }
                >
                  {t("age")}: {data.age ? `${data.age} ${t("years")}` : "..."}
                </span>
              </div>

              {/* School */}
              <div className="flex items-center gap-2 text-sm">
                {data.schoolLevel ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Circle className="w-4 h-4 text-gray-300" />
                )}
                <span
                  className={
                    data.schoolLevel
                      ? "text-gray-800 dark:text-gray-200"
                      : "text-gray-400"
                  }
                >
                  {t("school")}: {getSchoolLevelLabel(data.schoolLevel)}
                </span>
              </div>

              {/* Differences */}
              <div className="flex items-center gap-2 text-sm">
                {data.learningDifferences &&
                data.learningDifferences.length > 0 ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Circle className="w-4 h-4 text-gray-300" />
                )}
                <span
                  className={
                    data.learningDifferences?.length
                      ? "text-gray-800 dark:text-gray-200"
                      : "text-gray-400"
                  }
                >
                  {t("learningDifferences")}:{" "}
                  {data.learningDifferences?.length
                    ? data.learningDifferences
                        .map(
                          (d) =>
                            LEARNING_DIFFERENCES.find((ld) => ld.id === d)
                              ?.label,
                        )
                        .join(", ")
                    : t("optional")}
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={onBack} variant="outline" className="flex-1">
                <ArrowLeft className="mr-2 w-4 h-4" />
                Indietro
              </Button>
              <Button
                onClick={onContinue}
                className="flex-1 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white"
              >
                Continua
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation when no data captured yet */}
      {!hasData && (
        <div className="mt-4 flex gap-2">
          <Button onClick={onBack} variant="outline" className="flex-1">
            <ArrowLeft className="mr-2 w-4 h-4" />
            Indietro
          </Button>
          <Button onClick={onSkip} variant="ghost" className="text-gray-500">
            <SkipForward className="mr-2 w-4 h-4" />
            Salta
          </Button>
        </div>
      )}

      {isReplayMode && (
        <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-4">
          {t("replayModeMessage")}
        </p>
      )}
    </motion.div>
  );
}

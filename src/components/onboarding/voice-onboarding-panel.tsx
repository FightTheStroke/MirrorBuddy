"use client";

/**
 * VoiceOnboardingPanel - Unified voice experience with Melissa
 *
 * REFACTORED: Now receives voice session from parent (welcome/page.tsx) to maintain
 * a single persistent connection across all onboarding steps.
 *
 * When voice is active:
 * - Shows large Melissa avatar with speaking animation
 * - Integrated transcript (last messages)
 * - Checklist of captured data
 * - Mute/Hangup controls
 *
 * When voice is not active:
 * - Compact "Call Melissa" button
 *
 * Related: #61 Onboarding Voice Integration
 */

import { useEffect, useCallback, useState, useRef, useMemo } from "react";
import { useTranslations } from "next-intl";
import { logger } from "@/lib/logger";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import type { Maestro, VoiceSessionHandle } from "@/types";
import type { ExistingUserDataForPrompt } from "@/lib/voice/onboarding-tools";
import { CallButton } from "./voice-onboarding-panel/call-button";
import { ConnectingState } from "./voice-onboarding-panel/connecting-state";
import { ConnectedState } from "./voice-onboarding-panel/connected-state";

interface VoiceConnectionInfo {
  provider: "azure";
  proxyPort: number;
  configured: boolean;
}

export interface VoiceOnboardingPanelProps {
  className?: string;
  onFallbackToWebSpeech?: () => void;
  /** Which step we're on - affects what data we show */
  step?: "welcome" | "info";
  /** Voice session handle from parent - maintains single connection */
  voiceSession: VoiceSessionHandle;
  /** Connection info from parent */
  connectionInfo: VoiceConnectionInfo | null;
  /** Melissa maestro config from parent */
  onboardingMelissa: Maestro;
  /** Existing user data for returning users - Melissa will acknowledge them */
  existingUserData?: ExistingUserDataForPrompt | null;
}

export function VoiceOnboardingPanel({
  className,
  onFallbackToWebSpeech: _onFallbackToWebSpeech,
  step = "welcome",
  voiceSession,
  connectionInfo,
  onboardingMelissa,
  existingUserData: _existingUserData,
}: VoiceOnboardingPanelProps) {
  const tOnboarding = useTranslations("onboarding");
  const tVoice = useTranslations("voice");
  const { data, voiceTranscript, clearVoiceTranscript } = useOnboardingStore();
  const hasInitializedRef = useRef(false);
  const hasAttemptedConnectionRef = useRef(false);

  const [configError, setConfigError] = useState<string | null>(null);
  const [isVoiceActive, setIsVoiceActive] = useState(false);

  // Destructure voice session
  const {
    isConnected,
    isListening,
    isSpeaking,
    isMuted,
    connectionState,
    connect,
    disconnect,
    toggleMute,
  } = voiceSession;

  // Clear transcript only on first mount of welcome step
  useEffect(() => {
    if (!hasInitializedRef.current && step === "welcome") {
      hasInitializedRef.current = true;
      clearVoiceTranscript();
    }
  }, [clearVoiceTranscript, step]);

  // Connect when voice is activated (only if not already connected)
  useEffect(() => {
    const startConnection = async () => {
      // Skip if already connected or already attempted
      if (isConnected) return;
      if (!isVoiceActive) return;
      if (hasAttemptedConnectionRef.current) return;
      if (!connectionInfo) return;
      if (connectionState !== "idle") return;

      hasAttemptedConnectionRef.current = true;
      setConfigError(null);

      try {
        logger.debug("[VoiceOnboardingPanel] Connecting to voice session...");
        await connect(onboardingMelissa, connectionInfo);
      } catch (error) {
        logger.error("[VoiceOnboardingPanel] Connection failed", {
          error: String(error),
        });
        if (error instanceof DOMException && error.name === "NotAllowedError") {
          setConfigError(tVoice("microphoneUnauthorized"));
        } else {
          setConfigError(tVoice("connectionError"));
        }
        hasAttemptedConnectionRef.current = false;
      }
    };

    startConnection();
  }, [
    isVoiceActive,
    connectionInfo,
    isConnected,
    connectionState,
    connect,
    onboardingMelissa,
    tVoice,
  ]);

  const handleStartCall = useCallback(() => {
    setIsVoiceActive(true);
    hasAttemptedConnectionRef.current = false;
  }, []);

  const handleEndCall = useCallback(() => {
    setIsVoiceActive(false);
    disconnect();
    hasAttemptedConnectionRef.current = false;
  }, [disconnect]);

  // Get last 4 transcript entries
  const recentTranscript = voiceTranscript.slice(-4);

  // Memoize checklist to avoid recreation on every render
  const checklist = useMemo(() => {
    if (step === "welcome") {
      return [
        {
          key: "name",
          label: tOnboarding("checklist.nameLabel"),
          value: data.name,
          required: true,
        },
      ];
    }
    return [
      {
        key: "name",
        label: tOnboarding("checklist.nameLabel"),
        value: data.name,
        required: true,
      },
      {
        key: "age",
        label: tOnboarding("checklist.ageLabel"),
        value: data.age ? `${data.age} ${tOnboarding("ageYears")}` : null,
        required: false,
      },
      {
        key: "school",
        label: tOnboarding("checklist.schoolLabel"),
        value: data.schoolLevel
          ? data.schoolLevel === "elementare"
            ? tOnboarding("checklist.schoolElementary")
            : data.schoolLevel === "media"
              ? tOnboarding("checklist.schoolMiddle")
              : tOnboarding("checklist.schoolHigh")
          : null,
        required: false,
      },
      {
        key: "differences",
        label: tOnboarding("checklist.differencesLabel"),
        value: data.learningDifferences?.length
          ? tOnboarding("checklist.differencesCount", {
              count: data.learningDifferences.length,
            })
          : null,
        required: false,
      },
    ];
  }, [
    step,
    data.name,
    data.age,
    data.schoolLevel,
    data.learningDifferences,
    tOnboarding,
  ]);

  // If Azure is not available, show nothing (form mode will be used)
  if (!connectionInfo) {
    return null;
  }

  // ========== NOT CONNECTED - Show call button ==========
  if (!isConnected && (!isVoiceActive || connectionState === "idle")) {
    return <CallButton onClick={handleStartCall} className={className} />;
  }

  // ========== CONNECTING ==========
  if (isVoiceActive && !isConnected && connectionState === "connecting") {
    return (
      <ConnectingState
        configError={configError}
        onCancel={() => {
          setIsVoiceActive(false);
          setConfigError(null);
        }}
        className={className}
      />
    );
  }

  // ========== CONNECTED - Full voice experience ==========
  return (
    <ConnectedState
      isSpeaking={isSpeaking}
      isListening={isListening}
      isMuted={isMuted}
      recentTranscript={recentTranscript}
      checklist={checklist}
      onMute={toggleMute}
      onHangup={handleEndCall}
      className={className}
    />
  );
}

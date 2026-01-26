"use client";

/**
 * @file character-voice-panel.tsx
 * @brief Unified voice panel component for all character types
 */

import { useEffect } from "react";
import Image from "next/image";
import {
  X,
  Phone,
  PhoneOff,
  Volume2,
  VolumeX,
  RotateCcw,
  Mic,
  MicOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AudioDeviceSelector } from "@/components/conversation/components/audio-device-selector";
import { cn } from "@/lib/utils";
import { useAccessibilityStore } from "@/lib/accessibility/accessibility-store";
import type { UnifiedCharacter, VoiceState, HeaderActions } from "../types";
import { createVerticalGradientStyle } from "../utils/gradient-utils";
import { AuraRings } from "./aura-rings";

interface CharacterVoicePanelProps {
  character: UnifiedCharacter;
  voiceState: VoiceState;
  ttsEnabled: boolean;
  actions: HeaderActions;
}

export function CharacterVoicePanel({
  character,
  voiceState,
  ttsEnabled,
  actions,
}: CharacterVoicePanelProps) {
  const {
    isActive,
    isConnected,
    isListening,
    isSpeaking,
    isMuted,
    inputLevel,
    outputLevel,
    connectionState,
    configError,
  } = voiceState;

  const gradientStyle = createVerticalGradientStyle(character.color);
  const { updateSettings } = useAccessibilityStore();

  const statusText = configError
    ? configError
    : connectionState === "connecting"
      ? "Connessione..."
      : isConnected && isSpeaking
        ? `${character.name} sta parlando...`
        : isConnected && isListening
          ? "In ascolto..."
          : isConnected
            ? "Connesso"
            : "Avvio chiamata...";

  // Escape key handler
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") actions.onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [actions]);

  const handleTTSToggle = () => {
    if (ttsEnabled) actions.onStopTTS();
    else updateSettings({ ttsEnabled: true });
  };

  const buttonBg = "bg-white/30 hover:bg-white/40";
  const buttonBgMuted = "bg-red-500/60 hover:bg-red-500/70";
  const iconColor = "text-white";

  return (
    <div
      className="relative w-28 sm:w-72 lg:w-64 flex flex-col p-4 sm:p-5 rounded-2xl h-full min-h-[120px] text-white"
      style={gradientStyle}
    >
      {/* Top bar: Always render both buttons */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={actions.onClearChat}
          className={cn("rounded-full h-8 w-8", buttonBg, iconColor)}
          aria-label="Nuova conversazione"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={actions.onClose}
          className={cn("rounded-full h-8 w-8", buttonBg, iconColor)}
          aria-label="Chiudi (Esc)"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Center: Name and status */}
      <div className="flex flex-col items-center gap-1.5 mb-4">
        <h2 className="text-lg sm:text-xl font-bold text-center">
          {character.name}
        </h2>
        <p
          className={cn(
            "text-xs sm:text-sm text-center",
            configError ? "text-red-200" : "text-white/90",
          )}
        >
          {statusText}
        </p>
      </div>

      {/* Avatar with AuraRings */}
      <div className="flex-1 flex items-center justify-center my-4">
        <div className="relative">
          <AuraRings
            isVoiceActive={isActive}
            isConnected={isConnected}
            isSpeaking={isSpeaking}
            isMuted={isMuted}
            outputLevel={outputLevel}
            inputLevel={inputLevel}
          />
          <div className="relative z-10">
            <Image
              src={character.avatar}
              alt={character.name}
              width={80}
              height={80}
              className={cn(
                "w-20 h-20 rounded-full border-4 object-cover",
                isConnected ? "border-white shadow-2xl" : "border-white/50",
              )}
            />
            {isConnected && (
              <span className="absolute bottom-0 right-0 w-5 h-5 bg-green-400 border-2 border-white rounded-full animate-pulse z-20" />
            )}
          </div>
        </div>
      </div>

      {/* Bottom: Audio controls */}
      <div className="flex flex-col items-center gap-3 mt-auto">
        <div className="flex items-center gap-2">
          <AudioDeviceSelector compact />

          <Button
            variant="ghost"
            size="icon"
            onClick={actions.onToggleMute}
            disabled={!isActive || !isConnected}
            className={cn(
              "rounded-full h-10 w-10",
              !isActive && "opacity-40",
              isMuted ? buttonBgMuted : buttonBg,
              iconColor,
            )}
            aria-label={isMuted ? "Attiva microfono" : "Disattiva microfono"}
          >
            {isMuted ? (
              <MicOff className="w-5 h-5" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleTTSToggle}
            className={cn(
              "rounded-full h-10 w-10",
              !ttsEnabled && "opacity-60",
              buttonBg,
              iconColor,
            )}
            aria-label={
              ttsEnabled ? "Ferma lettura vocale" : "Attiva lettura vocale"
            }
          >
            {ttsEnabled ? (
              <Volume2 className="w-5 h-5" />
            ) : (
              <VolumeX className="w-5 h-5" />
            )}
          </Button>
        </div>

        <Button
          variant={isActive ? "destructive" : "default"}
          size="icon"
          onClick={actions.onVoiceCall}
          disabled={!!configError && !isActive}
          className={cn(
            "rounded-full h-14 w-14",
            isActive
              ? "bg-red-500 hover:bg-red-600 animate-pulse"
              : "bg-green-500 hover:bg-green-600",
            configError && !isActive && "opacity-40",
          )}
          aria-label={isActive ? "Termina chiamata" : "Avvia chiamata"}
        >
          {isActive ? (
            <PhoneOff className="w-7 h-7" />
          ) : (
            <Phone className="w-7 h-7" />
          )}
        </Button>

        {isConnected && (
          <p className="text-xs text-white/80 text-center mt-2">
            {isMuted ? "Microfono disattivato" : "Parla ora..."}
          </p>
        )}
      </div>
    </div>
  );
}

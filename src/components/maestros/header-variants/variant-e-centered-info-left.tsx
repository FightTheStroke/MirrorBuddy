"use client";

/**
 * VARIANTE E: Avatar Centrato + Info Sinistra (Migliorata)
 *
 * - Avatar al centro con aura animata dinamica
 * - Nome e stato a sinistra
 * - Controlli audio a destra
 * - X in alto a destra (con Esc)
 * - Device selector e reload in alto a sinistra
 */

import Image from "next/image";
import { motion } from "framer-motion";
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
import type { Maestro } from "@/types";
import { useEffect } from "react";
import { useTranslations } from "next-intl";

interface HeaderVariantProps {
  maestro: Maestro;
  isVoiceActive: boolean;
  isConnected: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  isMuted: boolean;
  inputLevel: number;
  outputLevel: number;
  configError: string | null;
  ttsEnabled: boolean;
  onVoiceCall: () => void;
  onToggleMute: () => void;
  onStopTTS: () => void;
  onClearChat: () => void;
  onClose: () => void;
}

export function HeaderVariantE(props: HeaderVariantProps) {
  const t = useTranslations("chat");
  const {
    maestro,
    isVoiceActive,
    isConnected,
    isListening,
    isSpeaking,
    isMuted,
    inputLevel,
    outputLevel,
    configError,
    ttsEnabled,
    onVoiceCall,
    onToggleMute,
    onStopTTS,
    onClearChat,
    onClose,
  } = props;

  const statusText = !isVoiceActive
    ? maestro.specialty
    : configError
      ? configError
      : isConnected && isSpeaking
        ? `${maestro.displayName} sta parlando...`
        : isConnected && isListening
          ? "In ascolto..."
          : isConnected
            ? "Connesso"
            : "Connessione...";

  // Handle Esc key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // Calculate aura intensity based on voice activity
  const getAuraIntensity = () => {
    if (!isVoiceActive || !isConnected) return 0;
    if (isSpeaking) return outputLevel;
    if (isListening && !isMuted) return inputLevel;
    return 0.1; // Subtle pulse when connected but silent
  };

  const auraIntensity = getAuraIntensity();

  return (
    <div
      className="relative p-4 sm:p-5 rounded-t-2xl text-white min-h-[120px]"
      style={{
        background: `linear-gradient(180deg, ${maestro.color}, ${maestro.color}dd)`,
      }}
    >
      {/* Top bar: Left controls and Right close button */}
      <div className="absolute top-3 left-4 right-4 flex items-center justify-between z-10">
        {/* Left: Device selector and reload */}
        <div className="flex items-center gap-2">
          <AudioDeviceSelector compact />
          <Button
            variant="ghost"
            size="icon"
            onClick={onClearChat}
            className="rounded-full h-8 w-8 text-white/80 hover:text-white hover:bg-white/20"
            aria-label={t("nuovaConversazione")}
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>

        {/* Right: Close button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="rounded-full h-8 w-8 text-white/80 hover:text-white hover:bg-white/20"
          aria-label={t("chiudiEsc")}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Main content area - centered vertically */}
      <div className="flex items-center gap-6 pt-8 min-h-[80px]">
        {/* Left: Name and status */}
        <div className="flex flex-col gap-1.5 min-w-0 flex-shrink-0 justify-center">
          <h2 className="text-xl sm:text-2xl font-bold">
            {maestro.displayName}
          </h2>
          <p className="text-sm text-white/80">{statusText}</p>
        </div>

        {/* Center: Avatar with animated aura - vertically centered */}
        <div className="flex-1 flex justify-center items-center">
          <div className="relative">
            {/* Animated aura rings - dynamic based on voice */}
            {isVoiceActive && isConnected && (
              <>
                {/* Outer ring - most subtle */}
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-white/20"
                  animate={{
                    scale: isSpeaking
                      ? [1, 1.15 + auraIntensity * 0.1, 1]
                      : [1, 1.08, 1],
                    opacity: [0.2, 0.4 + auraIntensity * 0.3, 0.2],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: isSpeaking ? 0.8 : 2,
                    ease: "easeInOut",
                  }}
                  style={{
                    width: "100px",
                    height: "100px",
                    margin: "-10px",
                  }}
                />
                {/* Middle ring */}
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-white/30"
                  animate={{
                    scale: isSpeaking
                      ? [1, 1.12 + auraIntensity * 0.08, 1]
                      : [1, 1.06, 1],
                    opacity: [0.3, 0.5 + auraIntensity * 0.4, 0.3],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: isSpeaking ? 0.7 : 1.8,
                    ease: "easeInOut",
                  }}
                  style={{
                    width: "90px",
                    height: "90px",
                    margin: "-5px",
                  }}
                />
                {/* Inner ring - most visible */}
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-white/40"
                  animate={{
                    scale: isSpeaking
                      ? [1, 1.08 + auraIntensity * 0.06, 1]
                      : [1, 1.04, 1],
                    opacity: [0.4, 0.6 + auraIntensity * 0.3, 0.4],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: isSpeaking ? 0.6 : 1.5,
                    ease: "easeInOut",
                  }}
                  style={{
                    width: "85px",
                    height: "85px",
                    margin: "-2.5px",
                  }}
                />
              </>
            )}

            {/* Avatar - static, no movement */}
            <div className="relative z-10">
              <Image
                src={maestro.avatar}
                alt={maestro.displayName}
                width={80}
                height={80}
                className={cn(
                  "w-20 h-20 rounded-full border-4 object-cover",
                  isConnected ? "border-white shadow-2xl" : "border-white/50",
                )}
              />
              <span
                className={cn(
                  "absolute bottom-0 right-0 w-5 h-5 border-2 border-white rounded-full z-20",
                  isVoiceActive && isConnected
                    ? "bg-green-400 animate-pulse"
                    : "bg-green-400",
                )}
              />
            </div>
          </div>
        </div>

        {/* Right: Audio controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Mute and TTS buttons - same size, close together */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleMute}
              disabled={!isVoiceActive || !isConnected}
              className={cn(
                "rounded-full h-10 w-10 text-white",
                !isVoiceActive && "opacity-40",
                isMuted
                  ? "bg-red-500/40 hover:bg-red-500/50"
                  : "bg-white/20 hover:bg-white/30",
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
              onClick={ttsEnabled ? onStopTTS : undefined}
              disabled={!ttsEnabled}
              className={cn(
                "rounded-full h-10 w-10 text-white",
                !ttsEnabled && "opacity-40",
                "bg-white/20 hover:bg-white/30",
              )}
              aria-label={
                ttsEnabled
                  ? "Disattiva lettura vocale"
                  : "Lettura vocale disattivata"
              }
            >
              {ttsEnabled ? (
                <Volume2 className="w-5 h-5" />
              ) : (
                <VolumeX className="w-5 h-5" />
              )}
            </Button>
          </div>

          {/* Call button - green when inactive, red when active (iPhone style) */}
          <Button
            variant={isVoiceActive ? "destructive" : "default"}
            size="icon"
            onClick={onVoiceCall}
            disabled={!!configError && !isVoiceActive}
            className={cn(
              "rounded-full h-12 w-12",
              isVoiceActive
                ? "bg-red-500 hover:bg-red-600 animate-pulse"
                : "bg-green-500 hover:bg-green-600",
              configError && !isVoiceActive && "opacity-40",
            )}
            aria-label={isVoiceActive ? "Termina chiamata" : "Avvia chiamata"}
          >
            {isVoiceActive ? (
              <PhoneOff className="w-6 h-6" />
            ) : (
              <Phone className="w-6 h-6" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

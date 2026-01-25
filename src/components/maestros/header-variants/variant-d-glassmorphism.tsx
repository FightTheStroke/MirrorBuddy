"use client";

/**
 * VARIANTE D: Glassmorphism Modern
 *
 * Design moderno con effetti glass e blur.
 * Avatar al centro-sinistra, controlli raggruppati con stile glass.
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

const VISUALIZER_BARS = [9, 13, 7, 15, 11, 14, 8, 12, 10];

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

export function HeaderVariantD(props: HeaderVariantProps) {
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

  return (
    <div
      className="relative p-5 sm:p-6 rounded-t-2xl text-white min-h-[110px] overflow-hidden"
      style={{
        background: `linear-gradient(145deg, ${maestro.color}, ${maestro.color}bb)`,
      }}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white blur-3xl translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white blur-3xl -translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="relative flex items-center gap-5">
        {/* Avatar with animated ring */}
        <div className="relative flex-shrink-0">
          <motion.div
            className="absolute -inset-2 rounded-full border-2 border-white/30"
            animate={{
              scale: isConnected && isSpeaking ? [1, 1.1, 1] : 1,
              opacity: isConnected ? [0.3, 0.6, 0.3] : 0.2,
            }}
            transition={{ repeat: Infinity, duration: isSpeaking ? 0.6 : 2 }}
          />
          <motion.div
            animate={{ scale: isSpeaking ? [1, 1.04, 1] : 1 }}
            transition={{ repeat: Infinity, duration: 0.8 }}
          >
            <Image
              src={maestro.avatar}
              alt={maestro.displayName}
              width={72}
              height={72}
              className={cn(
                "w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full border-3 object-cover",
                isConnected ? "border-white shadow-xl" : "border-white/60",
              )}
            />
          </motion.div>
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 w-5 h-5 border-2 border-white rounded-full",
              isVoiceActive && isConnected
                ? "bg-green-400 animate-pulse"
                : "bg-green-400",
            )}
          />
        </div>

        {/* Info section */}
        <div className="flex-shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold">{maestro.displayName}</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm">
              Professore
            </span>
          </div>
          <p className="text-sm text-white/80">{statusText}</p>
        </div>

        {/* Center: Visualizer in glass card */}
        <div className="flex-1 flex justify-center">
          <div className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20">
            <div className="flex items-center gap-1 h-8">
              {VISUALIZER_BARS.map((offset, i) => {
                const base = 8;
                const variance = 1 + (offset % 4) * 0.1;
                const style =
                  !isVoiceActive || !isConnected
                    ? { height: base, opacity: 0.3 }
                    : isSpeaking
                      ? {
                          height: base + outputLevel * variance * 24,
                          opacity: 0.7 + outputLevel * 0.3,
                        }
                      : isListening && !isMuted
                        ? {
                            height: base + inputLevel * variance * 28,
                            opacity: 0.6 + inputLevel * 0.4,
                          }
                        : { height: base, opacity: 0.35 };

                return (
                  <motion.div
                    key={i}
                    initial={false}
                    animate={style}
                    transition={{ duration: 0.04 }}
                    className="w-1.5 rounded-full bg-white"
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Controls in glass groups */}
        <div className="flex items-center gap-3">
          {/* Audio controls */}
          <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10">
            <AudioDeviceSelector compact />
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleMute}
              disabled={!isVoiceActive || !isConnected}
              className={cn(
                "rounded-lg h-9 w-9 text-white",
                !isVoiceActive && "opacity-40",
                isMuted && "bg-red-500/40",
              )}
            >
              {isMuted ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Call button - standalone */}
          <Button
            variant={isVoiceActive ? "destructive" : "ghost"}
            size="icon"
            onClick={onVoiceCall}
            disabled={!!configError && !isVoiceActive}
            className={cn(
              "rounded-xl h-12 w-12 shadow-lg",
              isVoiceActive
                ? "bg-red-500 hover:bg-red-600 animate-pulse shadow-red-500/30"
                : "bg-white/20 hover:bg-white/30 backdrop-blur-md",
              configError && !isVoiceActive && "opacity-40",
            )}
          >
            {isVoiceActive ? (
              <PhoneOff className="w-5 h-5" />
            ) : (
              <Phone className="w-5 h-5" />
            )}
          </Button>

          {/* Secondary controls */}
          <div className="flex items-center gap-1 p-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10">
            <Button
              variant="ghost"
              size="icon"
              onClick={ttsEnabled ? onStopTTS : undefined}
              disabled={!ttsEnabled}
              className={cn(
                "rounded-lg h-9 w-9 text-white/80 hover:text-white",
                !ttsEnabled && "opacity-40",
              )}
            >
              {ttsEnabled ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClearChat}
              className="rounded-lg h-9 w-9 text-white/80 hover:text-white"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-lg h-9 w-9 text-white/80 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

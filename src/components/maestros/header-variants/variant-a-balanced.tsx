"use client";

/**
 * VARIANTE A: Layout Bilanciato
 *
 * Avatar a sinistra, info + visualizer al centro, controlli a destra.
 * Design pulito e simmetrico.
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

const VISUALIZER_BARS = [8, 12, 6, 14, 10, 8, 12];

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

export function HeaderVariantA(props: HeaderVariantProps) {
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
      className="flex items-center gap-4 p-4 sm:p-5 rounded-t-2xl text-white min-h-[100px]"
      style={{
        background: `linear-gradient(135deg, ${maestro.color}, ${maestro.color}cc)`,
      }}
    >
      {/* Left: Avatar */}
      <motion.div
        className="relative flex-shrink-0"
        animate={{ scale: isSpeaking ? [1, 1.08, 1] : 1 }}
        transition={{ repeat: Infinity, duration: 1.2 }}
      >
        <Image
          src={maestro.avatar}
          alt={maestro.displayName}
          width={72}
          height={72}
          className={cn(
            "w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full border-3 object-cover transition-all",
            isConnected
              ? "border-white shadow-xl shadow-white/20"
              : "border-white/40",
          )}
        />
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 w-4 h-4 border-2 border-white rounded-full",
            isVoiceActive && isConnected
              ? "bg-green-400 animate-pulse"
              : "bg-green-400",
          )}
        />
      </motion.div>

      {/* Center: Info + Visualizer */}
      <div className="flex-1 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg sm:text-xl font-bold">
            {maestro.displayName}
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/20">
            Professore
          </span>
        </div>
        <p className="text-sm text-white/80">{statusText}</p>

        {/* Visualizer - transparent background */}
        <div className="flex items-center gap-1.5 h-8 mt-1">
          {VISUALIZER_BARS.map((offset, i) => {
            const base = 8;
            const variance = 1 + (offset % 3) * 0.15;
            const style =
              !isVoiceActive || !isConnected
                ? { height: base, opacity: 0.2 }
                : isSpeaking
                  ? {
                      height: base + outputLevel * variance * 24,
                      opacity: 0.5 + outputLevel * 0.5,
                    }
                  : isListening && !isMuted
                    ? {
                        height: base + inputLevel * variance * 28,
                        opacity: 0.4 + inputLevel * 0.6,
                      }
                    : { height: base, opacity: 0.25 };

            return (
              <motion.div
                key={i}
                initial={false}
                animate={style}
                transition={{ duration: 0.05 }}
                className={cn(
                  "w-2 rounded-full",
                  isSpeaking && isConnected ? "bg-white" : "bg-white/60",
                )}
              />
            );
          })}
        </div>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-2">
        <AudioDeviceSelector compact />

        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleMute}
          disabled={!isVoiceActive || !isConnected}
          className={cn(
            "rounded-full h-10 w-10 text-white",
            !isVoiceActive && "opacity-40",
            isMuted ? "bg-red-500/30" : "bg-white/20 hover:bg-white/30",
          )}
        >
          {isMuted ? (
            <MicOff className="w-5 h-5" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
        </Button>

        <Button
          variant={isVoiceActive ? "destructive" : "ghost"}
          size="icon"
          onClick={onVoiceCall}
          disabled={!!configError && !isVoiceActive}
          className={cn(
            "rounded-full h-10 w-10",
            isVoiceActive
              ? "bg-red-500 hover:bg-red-600 animate-pulse"
              : "bg-white/20 hover:bg-white/30",
            configError && !isVoiceActive && "opacity-40",
          )}
        >
          {isVoiceActive ? (
            <PhoneOff className="w-5 h-5" />
          ) : (
            <Phone className="w-5 h-5" />
          )}
        </Button>

        <div className="w-px h-8 bg-white/20 mx-1" />

        <Button
          variant="ghost"
          size="icon"
          onClick={ttsEnabled ? onStopTTS : undefined}
          disabled={!ttsEnabled}
          className={cn(
            "rounded-full h-10 w-10 text-white hover:bg-white/20",
            !ttsEnabled && "opacity-40",
          )}
        >
          {ttsEnabled ? (
            <Volume2 className="w-5 h-5" />
          ) : (
            <VolumeX className="w-5 h-5" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClearChat}
          className="rounded-full h-10 w-10 text-white hover:bg-white/20"
        >
          <RotateCcw className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="rounded-full h-10 w-10 text-white hover:bg-white/20"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}

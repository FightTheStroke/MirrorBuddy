"use client";

import { motion } from "framer-motion";
import { PhoneOff, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AudioDeviceSelector } from "@/components/conversation/components/audio-device-selector";
import { cn } from "@/lib/utils";
import type { Maestro } from "@/types";
import { useTranslations } from "next-intl";

const VISUALIZER_BAR_OFFSETS = [8, 12, 6, 14, 10];

interface FloatingControlsBarProps {
  maestro: Maestro;
  isConnected: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  isMuted: boolean;
  inputLevel: number;
  outputLevel: number;
  onToggleMute: () => void;
  onVoiceCall: () => void;
}

export function FloatingControlsBar({
  maestro,
  isConnected,
  isListening,
  isSpeaking,
  isMuted,
  inputLevel,
  outputLevel,
  onToggleMute,
  onVoiceCall,
}: FloatingControlsBarProps) {
  const t = useTranslations("chat");
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="sticky top-0 z-20 mx-2 sm:mx-4 mt-2 mb-2"
    >
      <div
        className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 rounded-lg shadow-lg backdrop-blur-md border"
        style={{
          background: `linear-gradient(to right, ${maestro.color}ee, ${maestro.color}dd)`,
          borderColor: `${maestro.color}80`,
        }}
      >
        {/* Audio visualizer */}
        {isConnected && (
          <div className="flex items-center gap-1.5 h-8 px-2 bg-white/20 rounded">
            {VISUALIZER_BAR_OFFSETS.map((offset, i) => {
              const baseHeight = 6;
              const variance = 1 + (offset % 3) * 0.15;

              const getBarStyle = () => {
                if (isSpeaking) {
                  const level = outputLevel * variance;
                  return {
                    height: baseHeight + level * 20,
                    opacity: 0.4 + level * 0.6,
                  };
                }
                if (isListening && !isMuted) {
                  const level = inputLevel * variance;
                  return {
                    height: baseHeight + level * 24,
                    opacity: 0.3 + level * 0.7,
                  };
                }
                return { height: baseHeight, opacity: 0.2 };
              };

              const style = getBarStyle();

              return (
                <motion.div
                  key={i}
                  initial={false}
                  animate={{
                    height: style.height,
                    opacity: style.opacity,
                    scaleY: isSpeaking || (isListening && !isMuted) ? 1 : 0.8,
                  }}
                  transition={{ duration: 0.06, ease: "easeOut" }}
                  className={cn(
                    "w-1.5 rounded-full",
                    isSpeaking
                      ? "bg-white"
                      : isListening && !isMuted
                        ? "bg-white/80"
                        : "bg-white/30",
                  )}
                />
              );
            })}
          </div>
        )}

        {/* Status */}
        {isConnected && (
          <div className="flex items-center gap-1.5 text-xs text-white/90">
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                isSpeaking
                  ? "bg-white animate-pulse"
                  : isListening && !isMuted
                    ? "bg-white/80"
                    : "bg-white/50",
              )}
            />
            <span className="hidden sm:inline">
              {isSpeaking
                ? `${maestro.displayName} sta parlando`
                : isListening && !isMuted
                  ? "In ascolto..."
                  : isMuted
                    ? "Microfono disattivato"
                    : "Connesso"}
            </span>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-2 ml-auto">
          <AudioDeviceSelector compact />

          {isConnected && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleMute}
              aria-label={isMuted ? "Attiva microfono" : "Disattiva microfono"}
              className={cn(
                "rounded-full px-3 py-1.5 text-white transition-colors",
                isMuted
                  ? "bg-white/20 hover:bg-white/30"
                  : "bg-white/30 hover:bg-white/40",
              )}
            >
              {isMuted ? (
                <>
                  <MicOff className="w-4 h-4 mr-1.5" />
                  <span className="text-xs hidden sm:inline">{t("muto")}</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 mr-1.5" />
                  <span className="text-xs hidden sm:inline">{t("microfono")}</span>
                </>
              )}
            </Button>
          )}

          <Button
            variant="destructive"
            size="sm"
            onClick={onVoiceCall}
            className="rounded-full px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white"
          >
            <PhoneOff className="w-4 h-4 mr-1.5" />
            <span className="text-xs hidden sm:inline">{t("termina")}</span>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

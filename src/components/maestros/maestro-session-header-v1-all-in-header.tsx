"use client";

/**
 * PROPOSTA 1: Tutto nell'header
 *
 * Espande l'header con tutti i controlli audio quando la chiamata è attiva.
 * Rimuove il VoicePanel laterale per massimizzare lo spazio centrale.
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
import { AudioVisualizer } from "./audio-visualizer";
import { getStatusText, getMuteStatusText } from "./maestro-header-utils";
import { cn } from "@/lib/utils";
import type { Maestro } from "@/types";

const VISUALIZER_BAR_OFFSETS = [8, 12, 6, 14, 10];

interface MaestroSessionHeaderV1Props {
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

export function MaestroSessionHeaderV1({
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
}: MaestroSessionHeaderV1Props) {
  return (
    <div
      className="flex flex-col gap-2 sm:gap-3 p-2 sm:p-4 rounded-t-2xl text-white"
      style={{
        background: `linear-gradient(to right, ${maestro.color}, ${maestro.color}dd)`,
      }}
    >
      {/* Top row: Avatar, info, action buttons */}
      <div className="flex items-start gap-2 sm:gap-4">
        <motion.div
          className="relative flex-shrink-0"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          <Image
            src={maestro.avatar}
            alt={maestro.displayName}
            width={56}
            height={56}
            className={cn(
              "w-10 h-10 sm:w-14 sm:h-14 rounded-full border-2 object-cover transition-all",
              isConnected ? "border-white shadow-lg" : "border-white/30",
              isSpeaking && "animate-pulse",
            )}
          />
          <motion.span
            className={cn(
              "absolute bottom-0 right-0 w-4 h-4 border-2 border-white rounded-full",
              isVoiceActive && isConnected
                ? "bg-green-400 animate-pulse"
                : "bg-green-400",
            )}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3 }}
          />
        </motion.div>

        <div className="flex-1 min-w-0 pr-1 sm:pr-0">
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            <h2 className="text-base sm:text-xl font-bold truncate">
              {maestro.displayName}
            </h2>
            <span className="text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-medium bg-white/20 whitespace-nowrap">
              Professore
            </span>
          </div>
          <p className="text-xs sm:text-sm text-white/80 truncate">
            {isVoiceActive && isConnected
              ? "In chiamata vocale"
              : maestro.specialty}
          </p>
          {!isVoiceActive && (
            <p className="text-xs text-white/70 mt-1 whitespace-normal break-words line-clamp-2 sm:line-clamp-none">
              {maestro.greeting}
            </p>
          )}
          {isVoiceActive && (
            <p
              className={cn(
                "text-xs mt-1",
                configError ? "text-red-200" : "text-white/60",
              )}
            >
              {getStatusText(
                configError,
                isConnected,
                isSpeaking,
                isListening,
                maestro.displayName,
              )}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {/* Voice Call Button */}
          <Button
            variant={isVoiceActive ? "destructive" : "ghost"}
            size="icon"
            onClick={onVoiceCall}
            disabled={!!configError && !isVoiceActive}
            aria-label={
              configError && !isVoiceActive
                ? `Voce non disponibile: ${configError}`
                : isVoiceActive
                  ? "Termina chiamata"
                  : "Avvia chiamata vocale"
            }
            title={configError && !isVoiceActive ? configError : undefined}
            className={cn(
              "text-white hover:bg-white/20 transition-all h-8 w-8 sm:h-10 sm:w-10",
              isVoiceActive && "bg-red-500 hover:bg-red-600 animate-pulse",
              configError && !isVoiceActive && "opacity-50 cursor-not-allowed",
            )}
          >
            {isVoiceActive ? (
              <PhoneOff className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : (
              <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
          </Button>

          {/* TTS toggle - hidden on mobile */}
          <Button
            variant="ghost"
            size="icon"
            onClick={ttsEnabled ? onStopTTS : undefined}
            disabled={!ttsEnabled}
            className="hidden sm:flex text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10"
            aria-label={
              ttsEnabled
                ? "Disattiva lettura vocale"
                : "Lettura vocale disattivata"
            }
          >
            {ttsEnabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </Button>

          {/* Clear chat - hidden on mobile */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClearChat}
            className="hidden sm:flex text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10"
            aria-label="Nuova conversazione"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>

          {/* Close */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10"
            aria-label="Chiudi"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Voice controls row - shown only when voice is active */}
      {isVoiceActive && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="flex items-center gap-2 sm:gap-3 pt-2 border-t border-white/20"
        >
          {/* Audio visualizer */}
          <AudioVisualizer
            isConnected={isConnected}
            isSpeaking={isSpeaking}
            isListening={isListening}
            isMuted={isMuted}
            inputLevel={inputLevel}
            outputLevel={outputLevel}
            barOffsets={VISUALIZER_BAR_OFFSETS}
          />

          {/* Audio device selector */}
          <AudioDeviceSelector compact />

          {/* Mute button */}
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
                  <span className="text-xs hidden sm:inline">Muto</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 mr-1.5" />
                  <span className="text-xs hidden sm:inline">Microfono</span>
                </>
              )}
            </Button>
          )}

          {/* Status text */}
          {isConnected && (
            <p
              className="text-xs text-white/60 ml-auto"
              aria-live="polite"
              role="status"
            >
              {getMuteStatusText(isMuted)}
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}

"use client";

/**
 * PROPOSTA 4: Header compatto + floating controls
 *
 * Header sempre compatto, controlli audio come floating bar sopra la chat quando la chiamata è attiva.
 * I controlli fluttuano sopra il contenuto per massimizzare lo spazio.
 */

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { X, Phone, PhoneOff, Volume2, VolumeX, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FloatingControlsBar } from "./components/floating-controls-bar";
import { cn } from "@/lib/utils";
import type { Maestro } from "@/types";

interface MaestroSessionHeaderV4Props {
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

export function MaestroSessionHeaderV4({
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
}: MaestroSessionHeaderV4Props) {
  return (
    <>
      {/* Compact header - always minimal */}
      <div
        className="flex items-start gap-2 sm:gap-4 p-2 sm:p-4 rounded-t-2xl text-white relative z-10"
        style={{
          background: `linear-gradient(to right, ${maestro.color}, ${maestro.color}dd)`,
        }}
      >
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
        </div>

        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
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

          <Button
            variant="ghost"
            size="icon"
            onClick={onClearChat}
            className="hidden sm:flex text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10"
            aria-label="Nuova conversazione"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>

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

      {/* Floating controls bar - shown only when voice is active */}
      <AnimatePresence>
        {isVoiceActive && (
          <FloatingControlsBar
            maestro={maestro}
            isConnected={isConnected}
            isListening={isListening}
            isSpeaking={isSpeaking}
            isMuted={isMuted}
            inputLevel={inputLevel}
            outputLevel={outputLevel}
            onToggleMute={onToggleMute}
            onVoiceCall={onVoiceCall}
          />
        )}
      </AnimatePresence>
    </>
  );
}

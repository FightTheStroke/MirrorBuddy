"use client";

/**
 * @file character-header.tsx
 * @brief Unified header component for all character types (Maestri, Coach, Buddy)
 */

import Image from "next/image";
import { motion } from "framer-motion";
import { X, Phone, Volume2, VolumeX, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UnifiedCharacter, VoiceState, HeaderActions } from "../types";
import { createGradientStyle } from "../utils/gradient-utils";

interface CharacterHeaderProps {
  character: UnifiedCharacter;
  voiceState: VoiceState;
  ttsEnabled: boolean;
  actions: HeaderActions;
}

export function CharacterHeader({
  character,
  voiceState,
  ttsEnabled,
  actions,
}: CharacterHeaderProps) {
  const gradientStyle = createGradientStyle(character.color);
  const { isActive, isConnected, configError } = voiceState;

  return (
    <div
      className="flex items-center gap-1 xs:gap-2 sm:gap-4 px-2 xs:px-3 sm:px-4 py-1.5 xs:py-2 sm:py-3 rounded-t-2xl text-white min-h-[48px] sm:min-h-[64px]"
      style={gradientStyle}
    >
      {/* Avatar with status indicator */}
      <motion.div
        className="relative flex-shrink-0"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
      >
        <Image
          src={character.avatar}
          alt={character.name}
          width={56}
          height={56}
          className="w-8 h-8 xs:w-9 xs:h-9 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full border-2 border-white/30 object-cover"
        />
        <motion.span
          className={cn(
            "absolute bottom-0 right-0 w-2 h-2 xs:w-2.5 xs:h-2.5 sm:w-3 sm:h-3 border-2 border-white rounded-full bg-green-400",
            isActive && isConnected && "animate-pulse",
          )}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3 }}
        />
      </motion.div>

      {/* Character info - compact on mobile */}
      <div className="flex-1 min-w-0">
        {/* Name + Badge inline on mobile */}
        <div className="flex items-center gap-1 flex-wrap">
          <h2 className="text-sm xs:text-base sm:text-xl font-bold truncate">
            {character.name}
          </h2>
          <span className="text-xs px-1 xs:px-1.5 sm:px-2 py-0.5 rounded-full font-medium bg-white/20 whitespace-nowrap flex-shrink-0">
            {character.badge}
          </span>
        </div>

        {/* Specialty / Voice status - single line */}
        <p className="text-xs xs:text-xs sm:text-sm text-white/80 truncate leading-tight">
          {isActive && isConnected ? "In chiamata vocale" : character.specialty}
        </p>

        {/* Greeting - hidden on mobile, single line on sm+ */}
        <p className="hidden xs:block text-xs sm:text-sm text-white/70 line-clamp-1 leading-tight">
          {character.greeting}
        </p>
      </div>

      {/* Action buttons - compact on mobile */}
      <div className="flex items-center gap-0.5 xs:gap-1 sm:gap-2 flex-shrink-0">
        {/* Phone button only visible when NOT in call */}
        {!isActive && (
          <Button
            variant="ghost"
            size="icon"
            onClick={actions.onVoiceCall}
            disabled={!!configError}
            aria-label={
              configError
                ? `Voce non disponibile: ${configError}`
                : "Avvia chiamata vocale"
            }
            title={configError ? configError : undefined}
            className={cn(
              "text-white hover:bg-white/20 transition-all h-8 w-8 xs:h-9 xs:w-9 sm:h-10 sm:w-10 rounded-lg",
              configError && "opacity-50 cursor-not-allowed",
            )}
          >
            <Phone className="w-4 h-4 xs:w-4 xs:h-4 sm:w-5 sm:h-5" />
          </Button>
        )}

        {/* TTS button - hidden on mobile */}
        <Button
          variant="ghost"
          size="icon"
          onClick={ttsEnabled ? actions.onStopTTS : undefined}
          disabled={!ttsEnabled}
          className="hidden xs:flex text-white hover:bg-white/20 h-8 w-8 xs:h-9 xs:w-9 sm:h-10 sm:w-10 rounded-lg"
          aria-label={
            ttsEnabled
              ? "Disattiva lettura vocale"
              : "Lettura vocale disattivata"
          }
        >
          {ttsEnabled ? (
            <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
          ) : (
            <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" />
          )}
        </Button>

        {/* History button */}
        {actions.onOpenHistory && (
          <Button
            variant="ghost"
            size="icon"
            onClick={actions.onOpenHistory}
            className="text-white hover:bg-white/20 h-8 w-8 xs:h-9 xs:w-9 sm:h-10 sm:w-10 rounded-lg"
            aria-label="Storico conversazioni"
          >
            <History className="w-4 h-4 xs:w-4 xs:h-4 sm:w-5 sm:h-5" />
          </Button>
        )}

        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={actions.onClose}
          className="text-white hover:bg-white/20 h-8 w-8 xs:h-9 xs:w-9 sm:h-10 sm:w-10 rounded-lg"
          aria-label="Chiudi"
        >
          <X className="w-4 h-4 xs:w-4 xs:h-4 sm:w-5 sm:h-5" />
        </Button>
      </div>
    </div>
  );
}

"use client";

/**
 * Header minimale per Proposta 2
 *
 * Quando la chiamata è attiva, mostra solo info base.
 * Tutti i controlli sono nel VoicePanel laterale.
 */

import Image from "next/image";
import { motion } from "framer-motion";
import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Maestro } from "@/types";

interface MaestroSessionHeaderProposal2Props {
  maestro: Maestro;
  isVoiceActive: boolean;
  isConnected: boolean;
  configError: string | null;
  onVoiceCall: () => void;
  onClose: () => void;
}

export function MaestroSessionHeaderProposal2({
  maestro,
  isVoiceActive,
  isConnected,
  configError,
  onVoiceCall,
  onClose: _onClose,
}: MaestroSessionHeaderProposal2Props) {
  return (
    <div
      className="flex items-start gap-2 sm:gap-4 p-2 sm:p-4 rounded-t-2xl text-white"
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
          className="w-10 h-10 sm:w-14 sm:h-14 rounded-full border-2 border-white/30 object-cover"
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

      {/* Minimal controls - only voice call button when NOT in call, nothing when in call (all controls in panel) */}
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        {/* Voice Call Button - only shown when NOT in call (all controls are in panel when active) */}
        {!isVoiceActive && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onVoiceCall}
            disabled={!!configError}
            aria-label={
              configError
                ? `Voce non disponibile: ${configError}`
                : "Avvia chiamata vocale"
            }
            title={configError || undefined}
            className={cn(
              "text-white hover:bg-white/20 transition-all h-8 w-8 sm:h-10 sm:w-10",
              configError && "opacity-50 cursor-not-allowed",
            )}
          >
            <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
        )}
        {/* When voice is active, all controls (including close) are in the voice panel */}
      </div>
    </div>
  );
}

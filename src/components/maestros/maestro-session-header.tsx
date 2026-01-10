'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { X, Phone, PhoneOff, Volume2, VolumeX, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Maestro } from '@/types';

interface MaestroSessionHeaderProps {
  maestro: Maestro;
  isVoiceActive: boolean;
  isConnected: boolean;
  configError: string | null;
  ttsEnabled: boolean;
  onVoiceCall: () => void;
  onStopTTS: () => void;
  onClearChat: () => void;
  onClose: () => void;
}

export function MaestroSessionHeader({
  maestro,
  isVoiceActive,
  isConnected,
  configError,
  ttsEnabled,
  onVoiceCall,
  onStopTTS,
  onClearChat,
  onClose,
}: MaestroSessionHeaderProps) {
  return (
    <div
      className="flex items-start gap-2 sm:gap-4 p-2 sm:p-4 rounded-t-2xl text-white"
      style={{ background: `linear-gradient(to right, ${maestro.color}, ${maestro.color}dd)` }}
    >
      <motion.div
        className="relative flex-shrink-0"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      >
        <Image
          src={maestro.avatar}
          alt={maestro.name}
          width={56}
          height={56}
          className="w-10 h-10 sm:w-14 sm:h-14 rounded-full border-2 border-white/30 object-cover"
        />
        <motion.span
          className={cn(
            "absolute bottom-0 right-0 w-4 h-4 border-2 border-white rounded-full",
            isVoiceActive && isConnected ? "bg-green-400 animate-pulse" : "bg-green-400"
          )}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3 }}
        />
      </motion.div>
      <div className="flex-1 min-w-0 pr-1 sm:pr-0">
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
          <h2 className="text-base sm:text-xl font-bold truncate">{maestro.name}</h2>
          <span className="text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-medium bg-white/20 whitespace-nowrap">
            Professore
          </span>
        </div>
        <p className="text-xs sm:text-sm text-white/80 truncate">
          {isVoiceActive && isConnected ? 'In chiamata vocale' : maestro.specialty}
        </p>
        <p className="text-xs text-white/70 mt-1 whitespace-normal break-words line-clamp-2 sm:line-clamp-none">{maestro.greeting}</p>
      </div>

      {/* Action buttons - hide some on mobile */}
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        {/* Voice Call Button */}
        <Button
          variant={isVoiceActive ? 'destructive' : 'ghost'}
          size="icon"
          onClick={onVoiceCall}
          disabled={!!configError && !isVoiceActive}
          aria-label={
            configError && !isVoiceActive
              ? `Voce non disponibile: ${configError}`
              : isVoiceActive
                ? 'Termina chiamata'
                : 'Avvia chiamata vocale'
          }
          title={configError && !isVoiceActive ? configError : undefined}
          className={cn(
            'text-white hover:bg-white/20 transition-all h-8 w-8 sm:h-10 sm:w-10',
            isVoiceActive && 'bg-red-500 hover:bg-red-600 animate-pulse',
            configError && !isVoiceActive && 'opacity-50 cursor-not-allowed'
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
          aria-label={ttsEnabled ? 'Disattiva lettura vocale' : 'Lettura vocale disattivata'}
        >
          {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
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
  );
}

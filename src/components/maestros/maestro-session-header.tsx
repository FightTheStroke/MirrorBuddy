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
      className="flex items-center gap-4 p-4 rounded-t-2xl text-white"
      style={{ background: `linear-gradient(to right, ${maestro.color}, ${maestro.color}dd)` }}
    >
      <motion.div
        className="relative"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      >
        <Image
          src={maestro.avatar}
          alt={maestro.name}
          width={56}
          height={56}
          className="rounded-full border-2 border-white/30 object-cover"
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
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold truncate">{maestro.name}</h2>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-white/20">
            Professore
          </span>
        </div>
        <p className="text-sm text-white/80 truncate">
          {isVoiceActive && isConnected ? 'In chiamata vocale' : maestro.specialty}
        </p>
      </div>

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
          'text-white hover:bg-white/20 transition-all',
          isVoiceActive && 'bg-red-500 hover:bg-red-600 animate-pulse',
          configError && !isVoiceActive && 'opacity-50 cursor-not-allowed'
        )}
      >
        {isVoiceActive ? (
          <PhoneOff className="w-5 h-5" />
        ) : (
          <Phone className="w-5 h-5" />
        )}
      </Button>

      {/* TTS toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={ttsEnabled ? onStopTTS : undefined}
        disabled={!ttsEnabled}
        className="text-white hover:bg-white/20"
        aria-label={ttsEnabled ? 'Disattiva lettura vocale' : 'Lettura vocale disattivata'}
      >
        {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
      </Button>

      {/* Clear chat */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onClearChat}
        className="text-white hover:bg-white/20"
        aria-label="Nuova conversazione"
      >
        <RotateCcw className="w-4 h-4" />
      </Button>

      {/* Close */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="text-white hover:bg-white/20"
        aria-label="Chiudi"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}

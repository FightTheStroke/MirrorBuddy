'use client';

/**
 * @file character-header.tsx
 * @brief Unified header component for all character types (Maestri, Coach, Buddy)
 */

import Image from 'next/image';
import { motion } from 'framer-motion';
import { X, Phone, PhoneOff, Volume2, VolumeX, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { UnifiedCharacter, VoiceState, HeaderActions } from '../types';
import { createGradientStyle } from '../utils/gradient-utils';

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
      className="flex items-start gap-2 sm:gap-4 p-2 sm:p-4 rounded-t-2xl text-white"
      style={gradientStyle}
    >
      {/* Avatar with status indicator */}
      <motion.div
        className="relative flex-shrink-0"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      >
        <Image
          src={character.avatar}
          alt={character.name}
          width={56}
          height={56}
          className="w-10 h-10 sm:w-14 sm:h-14 rounded-full border-2 border-white/30 object-cover"
        />
        <motion.span
          className={cn(
            'absolute bottom-0 right-0 w-3 h-3 sm:w-4 sm:h-4 border-2 border-white rounded-full bg-green-400',
            isActive && isConnected && 'animate-pulse'
          )}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3 }}
        />
      </motion.div>

      {/* Character info with greeting */}
      <div className="flex-1 min-w-0 pr-1 sm:pr-0">
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
          <h2 className="text-base sm:text-xl font-bold truncate">{character.name}</h2>
          <span className="text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-medium bg-white/20 whitespace-nowrap">
            {character.badge}
          </span>
        </div>
        <p className="text-xs sm:text-sm text-white/80 truncate">
          {isActive && isConnected ? 'In chiamata vocale' : character.specialty}
        </p>
        <p className="text-xs text-white/70 mt-1 whitespace-normal break-words line-clamp-2 sm:line-clamp-none">
          {character.greeting}
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        <Button
          variant={isActive ? 'destructive' : 'ghost'}
          size="icon"
          onClick={actions.onVoiceCall}
          disabled={!!configError && !isActive}
          aria-label={
            configError && !isActive
              ? `Voce non disponibile: ${configError}`
              : isActive
                ? 'Termina chiamata'
                : 'Avvia chiamata vocale'
          }
          title={configError && !isActive ? configError : undefined}
          className={cn(
            'text-white hover:bg-white/20 transition-all h-8 w-8 sm:h-10 sm:w-10',
            isActive && 'bg-red-500 hover:bg-red-600 animate-pulse',
            configError && !isActive && 'opacity-50 cursor-not-allowed'
          )}
        >
          {isActive ? (
            <PhoneOff className="w-4 h-4 sm:w-5 sm:h-5" />
          ) : (
            <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={ttsEnabled ? actions.onStopTTS : undefined}
          disabled={!ttsEnabled}
          className="hidden sm:flex text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10"
          aria-label={ttsEnabled ? 'Disattiva lettura vocale' : 'Lettura vocale disattivata'}
        >
          {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={actions.onClearChat}
          className="hidden sm:flex text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10"
          aria-label="Nuova conversazione"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={actions.onClose}
          className="text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10"
          aria-label="Chiudi"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

'use client';

/**
 * PROPOSTA 1: Tutto nell'header su una singola riga
 * 
 * Tutti i controlli audio sono su una singola riga orizzontale nell'header.
 * Rimuove il VoicePanel laterale per massimizzare lo spazio centrale.
 */

import Image from 'next/image';
import { motion } from 'framer-motion';
import { X, Phone, PhoneOff, Volume2, VolumeX, RotateCcw, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AudioDeviceSelector } from '@/components/conversation/components/audio-device-selector';
import { cn } from '@/lib/utils';
import type { Maestro } from '@/types';

const VISUALIZER_BAR_OFFSETS = [8, 12, 6, 14, 10];

interface MaestroSessionHeaderProposal1Props {
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

export function MaestroSessionHeaderProposal1({
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
}: MaestroSessionHeaderProposal1Props) {
  const getStatusText = () => {
    if (configError) return configError;
    if (isConnected && isSpeaking) return `${maestro.name} sta parlando...`;
    if (isConnected && isListening) return 'In ascolto...';
    if (isConnected) return 'Connesso';
    return 'Avvio chiamata...';
  };

  // When NOT in voice call: show normal header with greeting
  if (!isVoiceActive) {
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
            className="absolute bottom-0 right-0 w-4 h-4 border-2 border-white rounded-full bg-green-400"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3 }}
          />
        </motion.div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base sm:text-xl font-bold truncate">{maestro.name}</h2>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-white/20">
              Professore
            </span>
          </div>
          <p className="text-xs sm:text-sm text-white/80 truncate">{maestro.specialty}</p>
          <p className="text-xs text-white/70 mt-1 line-clamp-2">{maestro.greeting}</p>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onVoiceCall}
            disabled={!!configError}
            aria-label={configError ? `Voce non disponibile: ${configError}` : 'Avvia chiamata'}
            className={cn(
              'text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10',
              configError && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={ttsEnabled ? onStopTTS : undefined}
            disabled={!ttsEnabled}
            className="hidden sm:flex text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10"
          >
            {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClearChat}
            className="hidden sm:flex text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  // When IN voice call: everything on ONE row
  return (
    <div
      className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-t-2xl text-white"
      style={{ background: `linear-gradient(to right, ${maestro.color}, ${maestro.color}dd)` }}
    >
      {/* Avatar */}
      <motion.div
        className="relative flex-shrink-0"
        animate={{ scale: isSpeaking ? [1, 1.05, 1] : 1 }}
        transition={{ repeat: Infinity, duration: 1.5 }}
      >
        <Image
          src={maestro.avatar}
          alt={maestro.name}
          width={48}
          height={48}
          className={cn(
            'w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 object-cover transition-all',
            isConnected ? 'border-white shadow-lg' : 'border-white/50',
            isSpeaking && 'border-white shadow-lg shadow-white/30'
          )}
        />
        {isConnected && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white/50 rounded-full animate-pulse" />
        )}
      </motion.div>

      {/* Name and status */}
      <div className="flex flex-col min-w-0 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <h2 className="text-sm sm:text-base font-bold truncate">{maestro.name}</h2>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 hidden sm:inline">
            Professore
          </span>
        </div>
        <p className={cn(
          "text-[10px] sm:text-xs truncate",
          configError ? "text-red-200" : "text-white/70"
        )}>
          {getStatusText()}
        </p>
      </div>

      {/* Audio visualizer */}
      {isConnected && (
        <div className="flex items-center gap-1 h-8 px-2 bg-white/10 rounded-lg flex-shrink-0">
          {VISUALIZER_BAR_OFFSETS.map((offset, i) => {
            const baseHeight = 6;
            const variance = 1 + (offset % 3) * 0.15;
            
            const getBarStyle = () => {
              if (isSpeaking) {
                const level = outputLevel * variance;
                return { height: baseHeight + level * 18, opacity: 0.4 + level * 0.6 };
              }
              if (isListening && !isMuted) {
                const level = inputLevel * variance;
                return { height: baseHeight + level * 22, opacity: 0.3 + level * 0.7 };
              }
              return { height: baseHeight, opacity: 0.2 };
            };

            const style = getBarStyle();

            return (
              <motion.div
                key={i}
                initial={false}
                animate={{ height: style.height, opacity: style.opacity }}
                transition={{ duration: 0.06, ease: 'easeOut' }}
                className={cn(
                  "w-1.5 rounded-full",
                  isSpeaking 
                    ? "bg-gradient-to-t from-white/60 to-white" 
                    : isListening && !isMuted 
                      ? "bg-gradient-to-t from-white/40 to-white/90" 
                      : "bg-white/20"
                )}
              />
            );
          })}
        </div>
      )}

      {/* Device selector */}
      <div className="flex-shrink-0">
        <AudioDeviceSelector compact />
      </div>

      {/* Mute button */}
      {isConnected && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleMute}
          className={cn(
            'rounded-full px-2 sm:px-3 py-1 text-white transition-colors flex-shrink-0',
            isMuted ? 'bg-white/20 hover:bg-white/30' : 'bg-white/30 hover:bg-white/40'
          )}
        >
          {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          <span className="text-xs ml-1.5 hidden sm:inline">
            {isMuted ? 'Muto' : 'Microfono'}
          </span>
        </Button>
      )}

      {/* Spacer */}
      <div className="flex-1 min-w-0" />

      {/* Status text */}
      <p className="text-xs text-white/60 hidden lg:block flex-shrink-0">
        {isMuted ? 'Microfono disattivato' : 'Parla ora...'}
      </p>

      {/* Action buttons */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <Button
          variant="destructive"
          size="icon"
          onClick={onVoiceCall}
          className="bg-red-500 hover:bg-red-600 text-white h-8 w-8 sm:h-9 sm:w-9 animate-pulse"
        >
          <PhoneOff className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={ttsEnabled ? onStopTTS : undefined}
          disabled={!ttsEnabled}
          className="hidden sm:flex text-white hover:bg-white/20 h-8 w-8"
        >
          {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClearChat}
          className="hidden sm:flex text-white hover:bg-white/20 h-8 w-8"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white hover:bg-white/20 h-8 w-8"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

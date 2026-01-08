'use client';

/**
 * PROPOSTA 1: Tutto nell'header su una singola riga unificata
 * 
 * Layout sempre identico - stessa struttura in ogni stato.
 * Gli elementi cambiano stato ma non posizione.
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
    if (!isVoiceActive) return maestro.specialty;
    if (configError) return configError;
    if (isConnected && isSpeaking) return `${maestro.name} sta parlando...`;
    if (isConnected && isListening) return 'In ascolto...';
    if (isConnected) return 'Connesso';
    return 'Connessione...';
  };

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
            isSpeaking && 'shadow-lg shadow-white/30'
          )}
        />
        <span className={cn(
          "absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full transition-colors",
          isVoiceActive && isConnected ? "bg-green-400 animate-pulse" : "bg-green-400"
        )} />
      </motion.div>

      {/* Name and status */}
      <div className="flex flex-col min-w-0 mr-2">
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

      {/* Audio visualizer - always visible, animated only when active */}
      <div className="flex items-center gap-1 h-8 px-2 bg-white/10 rounded-lg flex-shrink-0">
        {VISUALIZER_BAR_OFFSETS.map((offset, i) => {
          const baseHeight = 6;
          const variance = 1 + (offset % 3) * 0.15;
          
          const getBarStyle = () => {
            if (!isVoiceActive || !isConnected) {
              return { height: baseHeight, opacity: 0.15 };
            }
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
                isSpeaking && isConnected
                  ? "bg-gradient-to-t from-white/60 to-white" 
                  : isListening && !isMuted && isConnected
                    ? "bg-gradient-to-t from-white/40 to-white/90" 
                    : "bg-white/30"
              )}
            />
          );
        })}
      </div>

      {/* Device selector - always visible */}
      <div className="flex-shrink-0">
        <AudioDeviceSelector compact />
      </div>

      {/* Mute button - always visible, disabled when not in call */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleMute}
        disabled={!isVoiceActive || !isConnected}
        className={cn(
          'rounded-full h-9 w-9 text-white transition-all flex-shrink-0',
          !isVoiceActive && 'opacity-40',
          isVoiceActive && isMuted && 'bg-white/20 hover:bg-white/30',
          isVoiceActive && !isMuted && 'bg-white/30 hover:bg-white/40'
        )}
      >
        {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      </Button>

      {/* Spacer */}
      <div className="flex-1 min-w-0" />

      {/* Phone/EndCall button - same position, changes icon */}
      <Button
        variant={isVoiceActive ? 'destructive' : 'ghost'}
        size="icon"
        onClick={onVoiceCall}
        disabled={!!configError && !isVoiceActive}
        className={cn(
          'rounded-full h-9 w-9 transition-all flex-shrink-0',
          isVoiceActive 
            ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
            : 'text-white hover:bg-white/20',
          configError && !isVoiceActive && 'opacity-40'
        )}
      >
        {isVoiceActive ? <PhoneOff className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
      </Button>

      {/* TTS button - always visible */}
      <Button
        variant="ghost"
        size="icon"
        onClick={ttsEnabled ? onStopTTS : undefined}
        disabled={!ttsEnabled}
        className={cn(
          'rounded-full h-9 w-9 text-white hover:bg-white/20 flex-shrink-0',
          !ttsEnabled && 'opacity-40'
        )}
      >
        {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
      </Button>

      {/* Clear chat button - always visible */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onClearChat}
        className="rounded-full h-9 w-9 text-white hover:bg-white/20 flex-shrink-0"
      >
        <RotateCcw className="w-4 h-4" />
      </Button>

      {/* Close button - always visible */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="rounded-full h-9 w-9 text-white hover:bg-white/20 flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}

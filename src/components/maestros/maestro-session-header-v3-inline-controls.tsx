'use client';

/**
 * PROPOSTA 3: Header minimale + controlli inline
 * 
 * Header sempre compatto, controlli audio come barra sottile sotto l'header quando la chiamata è attiva.
 * Massima compattezza per massimizzare lo spazio centrale.
 */

import Image from 'next/image';
import { motion } from 'framer-motion';
import { X, Phone, PhoneOff, Volume2, VolumeX, RotateCcw, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AudioDeviceSelector } from '@/components/conversation/components/audio-device-selector';
import { cn } from '@/lib/utils';
import type { Maestro } from '@/types';

const VISUALIZER_BAR_OFFSETS = [8, 12, 6, 14, 10];

interface MaestroSessionHeaderV3Props {
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

export function MaestroSessionHeaderV3({
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
}: MaestroSessionHeaderV3Props) {
  return (
    <>
      {/* Compact header - always minimal */}
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
            className={cn(
              'w-10 h-10 sm:w-14 sm:h-14 rounded-full border-2 object-cover transition-all',
              isConnected ? 'border-white shadow-lg' : 'border-white/30',
              isSpeaking && 'animate-pulse'
            )}
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
          {!isVoiceActive && (
            <p className="text-xs text-white/70 mt-1 whitespace-normal break-words line-clamp-2 sm:line-clamp-none">
              {maestro.greeting}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
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

      {/* Inline controls bar - shown only when voice is active */}
      {isVoiceActive && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700"
        >
          {/* Audio visualizer - compact */}
          {isConnected && (
            <div className="flex items-center gap-1 h-6 px-2 bg-slate-200 dark:bg-slate-700 rounded">
              {VISUALIZER_BAR_OFFSETS.map((offset, i) => {
                const baseHeight = 4;
                const variance = 1 + (offset % 3) * 0.15;
                
                const getBarStyle = () => {
                  if (isSpeaking) {
                    const level = outputLevel * variance;
                    return {
                      height: baseHeight + level * 16,
                      opacity: 0.4 + level * 0.6,
                    };
                  }
                  if (isListening && !isMuted) {
                    const level = inputLevel * variance;
                    return {
                      height: baseHeight + level * 20,
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
                    transition={{ duration: 0.06, ease: 'easeOut' }}
                    className={cn(
                      "w-1 rounded-full",
                      isSpeaking 
                        ? "bg-green-500" 
                        : isListening && !isMuted 
                          ? "bg-blue-500" 
                          : "bg-slate-400"
                    )}
                  />
                );
              })}
            </div>
          )}

          {/* Status indicator */}
          {isConnected && (
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
              <div className={cn(
                "w-2 h-2 rounded-full",
                isSpeaking ? "bg-green-500 animate-pulse" : 
                isListening && !isMuted ? "bg-blue-500" : 
                "bg-slate-400"
              )} />
              <span className="hidden sm:inline">
                {isSpeaking ? `${maestro.name} sta parlando` : 
                 isListening && !isMuted ? 'In ascolto...' : 
                 isMuted ? 'Microfono disattivato' : 'Connesso'}
              </span>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-1.5 ml-auto">
            <AudioDeviceSelector compact />

            {isConnected && (
              <Button
                variant={isMuted ? 'destructive' : 'outline'}
                size="sm"
                onClick={onToggleMute}
                aria-label={isMuted ? 'Attiva microfono' : 'Disattiva microfono'}
                className="h-7 px-2 text-xs"
              >
                {isMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                <span className="ml-1 hidden sm:inline">Mute</span>
              </Button>
            )}

            <Button
              variant="destructive"
              size="sm"
              onClick={onVoiceCall}
              className="h-7 px-2 text-xs"
            >
              <PhoneOff className="w-3 h-3" />
              <span className="ml-1 hidden sm:inline">Termina</span>
            </Button>
          </div>
        </motion.div>
      )}
    </>
  );
}

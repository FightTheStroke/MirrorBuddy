'use client';

/**
 * VARIANTE C: Compact Pro
 * 
 * Design compatto ma elegante con gruppi di controlli ben definiti.
 * Stile "pro" con bordi sottili e spaziatura precisa.
 */

import Image from 'next/image';
import { motion } from 'framer-motion';
import { X, Phone, PhoneOff, Volume2, VolumeX, RotateCcw, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AudioDeviceSelector } from '@/components/conversation/components/audio-device-selector';
import { cn } from '@/lib/utils';
import type { Maestro } from '@/types';

const VISUALIZER_BARS = [8, 11, 7, 13, 9, 12, 8, 10];

interface HeaderVariantProps {
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

export function HeaderVariantC(props: HeaderVariantProps) {
  const {
    maestro, isVoiceActive, isConnected, isListening, isSpeaking, isMuted,
    inputLevel, outputLevel, configError, ttsEnabled,
    onVoiceCall, onToggleMute, onStopTTS, onClearChat, onClose,
  } = props;

  const statusText = !isVoiceActive ? maestro.specialty
    : configError ? configError
    : isConnected && isSpeaking ? `${maestro.name} sta parlando...`
    : isConnected && isListening ? 'In ascolto...'
    : isConnected ? 'Connesso' : 'Connessione...';

  return (
    <div
      className="p-4 sm:p-5 rounded-t-2xl text-white min-h-[100px]"
      style={{ background: `linear-gradient(135deg, ${maestro.color}ee, ${maestro.color}cc)` }}
    >
      <div className="flex items-center gap-4">
        {/* Avatar with glow effect */}
        <motion.div
          className="relative flex-shrink-0"
          animate={{ scale: isSpeaking ? [1, 1.06, 1] : 1 }}
          transition={{ repeat: Infinity, duration: 1 }}
        >
          <div className={cn(
            "absolute inset-0 rounded-full blur-md transition-opacity",
            isConnected && isSpeaking ? "opacity-60" : "opacity-0"
          )} style={{ background: 'white' }} />
          <Image
            src={maestro.avatar}
            alt={maestro.name}
            width={64}
            height={64}
            className={cn(
              'w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 object-cover relative',
              isConnected ? 'border-white' : 'border-white/50'
            )}
          />
          <span className={cn(
            "absolute -bottom-0.5 -right-0.5 w-4 h-4 border-2 border-white rounded-full",
            isVoiceActive && isConnected ? "bg-green-400 animate-pulse" : "bg-green-400"
          )} />
        </motion.div>

        {/* Info */}
        <div className="flex-shrink-0 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold truncate">{maestro.name}</h2>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/20 font-medium">PRO</span>
          </div>
          <p className="text-sm text-white/80 truncate">{statusText}</p>
        </div>

        {/* Visualizer group */}
        <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm">
          <div className="flex items-center gap-1 h-8">
            {VISUALIZER_BARS.map((offset, i) => {
              const base = 6;
              const variance = 1 + (offset % 4) * 0.1;
              const style = !isVoiceActive || !isConnected
                ? { height: base, opacity: 0.25 }
                : isSpeaking
                  ? { height: base + outputLevel * variance * 22, opacity: 0.6 + outputLevel * 0.4 }
                  : isListening && !isMuted
                    ? { height: base + inputLevel * variance * 26, opacity: 0.5 + inputLevel * 0.5 }
                    : { height: base, opacity: 0.3 };

              return (
                <motion.div
                  key={i}
                  initial={false}
                  animate={style}
                  transition={{ duration: 0.04 }}
                  className="w-1.5 rounded-full bg-white"
                />
              );
            })}
          </div>
          
          <div className="w-px h-6 bg-white/30" />
          
          <AudioDeviceSelector compact />
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Voice controls group */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-full bg-black/20 backdrop-blur-sm">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleMute}
            disabled={!isVoiceActive || !isConnected}
            className={cn(
              'rounded-full h-9 w-9 text-white',
              !isVoiceActive && 'opacity-40',
              isMuted && 'bg-red-500/50'
            )}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>

          <Button
            variant={isVoiceActive ? 'destructive' : 'ghost'}
            size="icon"
            onClick={onVoiceCall}
            disabled={!!configError && !isVoiceActive}
            className={cn(
              'rounded-full h-10 w-10',
              isVoiceActive ? 'bg-red-500 hover:bg-red-600' : 'hover:bg-white/20',
              configError && !isVoiceActive && 'opacity-40'
            )}
          >
            {isVoiceActive ? <PhoneOff className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
          </Button>
        </div>

        {/* Secondary controls */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={ttsEnabled ? onStopTTS : undefined}
            disabled={!ttsEnabled} className={cn('rounded-full h-9 w-9 text-white/80 hover:text-white hover:bg-white/10', !ttsEnabled && 'opacity-40')}>
            {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={onClearChat} className="rounded-full h-9 w-9 text-white/80 hover:text-white hover:bg-white/10">
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-9 w-9 text-white/80 hover:text-white hover:bg-white/10">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

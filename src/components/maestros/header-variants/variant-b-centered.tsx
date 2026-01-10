'use client';

/**
 * VARIANTE B: Avatar Centrato
 * 
 * Avatar grande al centro con visualizer circolare attorno.
 * Controlli distribuiti simmetricamente ai lati.
 */

import Image from 'next/image';
import { motion } from 'framer-motion';
import { X, Phone, PhoneOff, Volume2, VolumeX, RotateCcw, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AudioDeviceSelector } from '@/components/conversation/components/audio-device-selector';
import { cn } from '@/lib/utils';
import type { Maestro } from '@/types';

const VISUALIZER_BARS = [10, 14, 8, 16, 12, 14, 10];

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

export function HeaderVariantB(props: HeaderVariantProps) {
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
      className="flex items-center justify-between p-4 sm:p-5 rounded-t-2xl text-white min-h-[110px]"
      style={{ background: `linear-gradient(180deg, ${maestro.color}, ${maestro.color}dd)` }}
    >
      {/* Left controls */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={ttsEnabled ? onStopTTS : undefined}
          disabled={!ttsEnabled} className={cn('rounded-full h-10 w-10 text-white hover:bg-white/20', !ttsEnabled && 'opacity-40')}>
          {ttsEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={onClearChat} className="rounded-full h-10 w-10 text-white hover:bg-white/20">
          <RotateCcw className="w-5 h-5" />
        </Button>
        <AudioDeviceSelector compact />
      </div>

      {/* Center: Avatar with ring visualizer */}
      <div className="flex flex-col items-center gap-2">
        <div className="relative">
          {/* Pulsing ring visualizer */}
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={{
              scale: isVoiceActive && isConnected ? (isSpeaking ? [1, 1.15, 1] : [1, 1.08, 1]) : 1,
              opacity: isVoiceActive && isConnected ? [0.3, 0.6, 0.3] : 0.2,
            }}
            transition={{ repeat: Infinity, duration: isSpeaking ? 0.8 : 1.5 }}
            style={{ 
              background: `radial-gradient(circle, transparent 60%, ${isVoiceActive ? 'white' : 'transparent'} 100%)`,
              width: '90px', height: '90px', margin: '-5px'
            }}
          />
          
          <motion.div
            animate={{ scale: isSpeaking ? [1, 1.05, 1] : 1 }}
            transition={{ repeat: Infinity, duration: 1 }}
          >
            <Image
              src={maestro.avatar}
              alt={maestro.name}
              width={80}
              height={80}
              className={cn(
                'w-20 h-20 rounded-full border-4 object-cover transition-all relative z-10',
                isConnected ? 'border-white shadow-2xl' : 'border-white/50'
              )}
            />
          </motion.div>
          
          <span className={cn(
            "absolute bottom-0 right-0 w-5 h-5 border-2 border-white rounded-full z-20",
            isVoiceActive && isConnected ? "bg-green-400 animate-pulse" : "bg-green-400"
          )} />
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-2">
            <h2 className="text-lg font-bold">{maestro.name}</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/20">Professore</span>
          </div>
          <p className="text-sm text-white/80">{statusText}</p>
        </div>

        {/* Horizontal visualizer below name */}
        <div className="flex items-center justify-center gap-1 h-6">
          {VISUALIZER_BARS.map((offset, i) => {
            const base = 6;
            const variance = 1 + (offset % 3) * 0.12;
            const style = !isVoiceActive || !isConnected
              ? { height: base, opacity: 0.2 }
              : isSpeaking
                ? { height: base + outputLevel * variance * 18, opacity: 0.5 + outputLevel * 0.5 }
                : isListening && !isMuted
                  ? { height: base + inputLevel * variance * 22, opacity: 0.4 + inputLevel * 0.6 }
                  : { height: base, opacity: 0.25 };

            return (
              <motion.div
                key={i}
                initial={false}
                animate={style}
                transition={{ duration: 0.05 }}
                className="w-1.5 rounded-full bg-white"
              />
            );
          })}
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleMute}
          disabled={!isVoiceActive || !isConnected}
          className={cn(
            'rounded-full h-10 w-10 text-white',
            !isVoiceActive && 'opacity-40',
            isMuted ? 'bg-red-500/40' : 'bg-white/20 hover:bg-white/30'
          )}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </Button>

        <Button
          variant={isVoiceActive ? 'destructive' : 'ghost'}
          size="icon"
          onClick={onVoiceCall}
          disabled={!!configError && !isVoiceActive}
          className={cn(
            'rounded-full h-12 w-12',
            isVoiceActive ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-white/20 hover:bg-white/30',
            configError && !isVoiceActive && 'opacity-40'
          )}
        >
          {isVoiceActive ? <PhoneOff className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
        </Button>

        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-10 w-10 text-white hover:bg-white/20">
          <X className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}

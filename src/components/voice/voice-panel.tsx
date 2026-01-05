'use client';

/**
 * VoicePanel - Shared side panel for voice calls
 *
 * Used by both MaestroSession and CharacterChatView for consistent voice UI.
 * ChatGPT-style design with voice-reactive orbs instead of waveforms.
 */

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Mic, MicOff, PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AudioDeviceSelector } from '@/components/conversation/components/audio-device-selector';
import { VoiceOrb } from '@/components/voice/voice-orb';
import { cn } from '@/lib/utils';

export interface VoicePanelCharacter {
  name: string;
  avatar?: string;
  specialty?: string;
  color: string; // Hex color like '#3B82F6' or tailwind gradient like 'from-purple-500 to-indigo-600'
}

export interface VoicePanelProps {
  character: VoicePanelCharacter;
  isConnected: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  isMuted: boolean;
  inputLevel: number;
  outputLevel: number;
  connectionState: string;
  configError: string | null;
  onToggleMute: () => void;
  onEndCall: () => void;
}

/**
 * Extract hex color from string (handles both hex and tailwind gradient)
 */
function extractColor(color: string): string {
  if (color.startsWith('#')) return color;
  // Default blue for gradient strings
  return '#3B82F6';
}

export function VoicePanel({
  character,
  isConnected,
  isListening,
  isSpeaking,
  isMuted,
  inputLevel,
  outputLevel,
  connectionState,
  configError,
  onToggleMute,
  onEndCall,
}: VoicePanelProps) {
  const getStatusText = () => {
    if (configError) return configError;
    if (connectionState === 'connecting') return 'Connessione...';
    if (isConnected && isSpeaking) return `${character.name} sta parlando...`;
    if (isConnected && isListening) return 'In ascolto...';
    if (isConnected) return 'Connesso';
    return 'Avvio chiamata...';
  };

  const orbColor = extractColor(character.color);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="w-72 flex flex-col items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950"
    >
      {/* Top section: Avatar or Orb */}
      <div className="flex flex-col items-center gap-3">
        {/* Main visualization area */}
        <div className="relative">
          {isConnected ? (
            // Voice-reactive orb when connected
            <div className="relative">
              <VoiceOrb
                level={outputLevel}
                isActive={isSpeaking}
                color={orbColor}
                glowColor={orbColor}
                size={140}
              />
              {/* Small avatar overlay in center */}
              {character.avatar && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <Image
                    src={character.avatar}
                    alt={character.name}
                    width={50}
                    height={50}
                    className="rounded-full border-2 border-white/30 object-cover"
                  />
                </div>
              )}
            </div>
          ) : (
            // Static avatar when not connected
            <motion.div
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              {character.avatar ? (
                <Image
                  src={character.avatar}
                  alt={character.name}
                  width={100}
                  height={100}
                  className="rounded-full border-4 border-white/20 object-cover"
                />
              ) : (
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center text-white text-4xl font-bold"
                  style={{ background: orbColor }}
                >
                  {character.name.charAt(0)}
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Name and status */}
        <div className="text-center">
          <h3 className="text-lg font-semibold text-white">{character.name}</h3>
          {character.specialty && (
            <p className="text-xs text-white/50">{character.specialty}</p>
          )}
          <p className={cn(
            "text-sm mt-2 font-medium",
            configError ? "text-red-400" :
            isSpeaking ? "text-white" :
            isListening ? "text-green-400" :
            "text-white/60"
          )}>
            {getStatusText()}
          </p>
        </div>
      </div>

      {/* Middle section: Student mic visualization */}
      {isConnected && (
        <div className="flex flex-col items-center gap-2">
          <VoiceOrb
            level={inputLevel}
            isActive={isListening && !isMuted}
            color={isMuted ? '#6B7280' : '#10B981'}
            glowColor={isMuted ? '#6B7280' : '#10B981'}
            size={60}
          />
          <div className="flex items-center gap-1.5">
            {isMuted ? (
              <MicOff className="w-3.5 h-3.5 text-red-400" />
            ) : (
              <Mic className={cn(
                "w-3.5 h-3.5 transition-colors",
                isListening && inputLevel > 0.02 ? "text-green-400" : "text-white/40"
              )} />
            )}
            <span className={cn(
              "text-xs font-medium transition-colors",
              isMuted ? "text-red-400" :
              isListening && inputLevel > 0.02 ? "text-green-400" :
              "text-white/50"
            )}>
              {isMuted ? 'Muto' :
               isListening && inputLevel > 0.02 ? 'Parli tu' :
               'Il tuo microfono'}
            </span>
          </div>
        </div>
      )}

      {/* Bottom section: Controls */}
      <div className="flex items-center gap-3">
        <AudioDeviceSelector compact />

        {isConnected && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleMute}
            aria-label={isMuted ? 'Attiva microfono' : 'Disattiva microfono'}
            className={cn(
              'rounded-full w-12 h-12 transition-all',
              isMuted
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 ring-2 ring-red-500/50'
                : 'bg-white/10 text-white hover:bg-white/20'
            )}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={onEndCall}
          aria-label="Termina chiamata"
          className="rounded-full w-12 h-12 bg-red-500 text-white hover:bg-red-600"
        >
          <PhoneOff className="w-5 h-5" />
        </Button>
      </div>
    </motion.div>
  );
}

'use client';

/**
 * VoicePanel - Shared side panel for voice calls
 *
 * Used by both MaestroSession and CharacterChatView for consistent voice UI.
 * Shows avatar, connection status, audio visualizer, and controls.
 */

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Mic, MicOff, PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Pre-computed random offsets for audio visualizer bars
const VISUALIZER_BAR_OFFSETS = [8, 12, 6, 14, 10];

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
  connectionState: string;
  configError: string | null;
  onToggleMute: () => void;
  onEndCall: () => void;
}

/**
 * Determines if a color string is a hex color or a tailwind class
 */
function isHexColor(color: string): boolean {
  return color.startsWith('#');
}

export function VoicePanel({
  character,
  isConnected,
  isListening,
  isSpeaking,
  isMuted,
  inputLevel,
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

  // Build background style based on color type
  const backgroundStyle = isHexColor(character.color)
    ? { background: `linear-gradient(to bottom, ${character.color}, ${character.color}dd)` }
    : undefined;

  const backgroundClass = !isHexColor(character.color)
    ? `bg-gradient-to-b ${character.color}`
    : '';

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={cn(
        "w-64 flex flex-col items-center justify-center gap-4 p-4 rounded-2xl",
        backgroundClass
      )}
      style={backgroundStyle}
    >
      {/* Avatar with status ring */}
      <motion.div
        animate={{ scale: isSpeaking ? [1, 1.05, 1] : 1 }}
        transition={{ repeat: Infinity, duration: 1.5 }}
        className="relative"
      >
        {character.avatar ? (
          <Image
            src={character.avatar}
            alt={character.name}
            width={80}
            height={80}
            className={cn(
              'rounded-full border-4 object-cover transition-colors duration-300',
              isConnected ? 'border-white' : 'border-white/50',
              isSpeaking && 'border-white shadow-lg shadow-white/30'
            )}
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-3xl font-bold">
            {character.name.charAt(0)}
          </div>
        )}
        {isConnected && (
          <span className="absolute bottom-1 right-1 w-4 h-4 bg-green-400 border-2 border-white/50 rounded-full animate-pulse" />
        )}
      </motion.div>

      {/* Name and specialty */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-white">{character.name}</h3>
        {character.specialty && (
          <p className="text-xs text-white/70">{character.specialty}</p>
        )}
        <p className={cn(
          "text-xs mt-1",
          configError ? "text-red-200" : "text-white/60"
        )}>
          {getStatusText()}
        </p>
      </div>

      {/* Audio visualizer */}
      {isConnected && (
        <div className="flex items-center gap-1 h-8">
          {VISUALIZER_BAR_OFFSETS.map((offset, i) => (
            <motion.div
              key={i}
              animate={{
                height: isSpeaking
                  ? [4, 20 + offset, 4]
                  : isListening && !isMuted
                    ? [4, 4 + inputLevel * 40, 4]
                    : 4
              }}
              transition={{
                repeat: Infinity,
                duration: 0.5 + i * 0.1,
                ease: 'easeInOut'
              }}
              className={cn(
                "w-1.5 rounded-full",
                isSpeaking ? "bg-white" : isListening && !isMuted ? "bg-white/80" : "bg-white/30"
              )}
            />
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3 mt-2">
        {isConnected && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleMute}
            aria-label={isMuted ? 'Attiva microfono' : 'Disattiva microfono'}
            className={cn(
              'rounded-full w-12 h-12 transition-colors',
              isMuted
                ? 'bg-white/20 text-white hover:bg-white/30'
                : 'bg-white/30 text-white hover:bg-white/40'
            )}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={onEndCall}
          className="rounded-full w-12 h-12 bg-red-500 text-white hover:bg-red-600"
        >
          <PhoneOff className="w-5 h-5" />
        </Button>
      </div>

      {/* Mute status text */}
      {isConnected && (
        <p className="text-xs text-white/60">
          {isMuted ? 'Microfono disattivato' : 'Parla ora...'}
        </p>
      )}
    </motion.div>
  );
}

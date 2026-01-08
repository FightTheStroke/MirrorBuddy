'use client';

/**
 * VoicePanel Variant F - Pannello Verticale per Coach/Buddies
 * 
 * Stessa struttura della Variante F ma adattata per coach/buddies.
 * - Contrasto migliorato per accessibilità
 * - Device selector accanto a mute/TTS
 * - TTS fixato
 */

import Image from 'next/image';
import { motion } from 'framer-motion';
import { X, Phone, PhoneOff, Volume2, VolumeX, RotateCcw, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AudioDeviceSelector } from '@/components/conversation/components/audio-device-selector';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';
import { useAccessibilityStore } from '@/lib/accessibility/accessibility-store';

const VISUALIZER_BARS = [10, 14, 8, 16, 12, 14, 10];

export interface VoicePanelVariantFCharacter {
  name: string;
  avatar?: string;
  specialty?: string;
  color: string;
}

export interface VoicePanelVariantFProps {
  character: VoicePanelVariantFCharacter;
  isConnected: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  isMuted: boolean;
  inputLevel: number;
  outputLevel?: number;
  connectionState: string;
  configError: string | null;
  ttsEnabled: boolean;
  onToggleMute: () => void;
  onEndCall: () => void;
  onStopTTS: () => void;
  onClearChat?: () => void;
  onClose?: () => void;
}

function isHexColor(color: string): boolean {
  return color.startsWith('#');
}

// Calculate contrast ratio for accessibility (WCAG AA requires 4.5:1 for normal text)
function getContrastColor(bgColor: string): string {
  // For colored backgrounds, use white with high opacity for better contrast
  // If background is very light, use dark text
  if (bgColor.includes('light') || bgColor.includes('yellow') || bgColor.includes('lime')) {
    return 'text-slate-900';
  }
  // For dark/colored backgrounds, use white with sufficient opacity
  return 'text-white';
}

export function VoicePanelVariantF({
  character,
  isConnected,
  isListening,
  isSpeaking,
  isMuted,
  inputLevel,
  outputLevel = 0,
  connectionState,
  configError,
  ttsEnabled,
  onToggleMute,
  onEndCall,
  onStopTTS,
  onClearChat,
  onClose,
}: VoicePanelVariantFProps) {
  const statusText = configError
    ? configError
    : connectionState === 'connecting'
      ? 'Connessione...'
      : isConnected && isSpeaking
        ? `${character.name} sta parlando...`
        : isConnected && isListening
          ? 'In ascolto...'
          : isConnected
            ? 'Connesso'
            : 'Avvio chiamata...';

  // Handle Esc key
  useEffect(() => {
    if (!onClose) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Calculate aura intensity
  const getAuraIntensity = () => {
    if (!isConnected) return 0;
    if (isSpeaking) return outputLevel;
    if (isListening && !isMuted) return inputLevel;
    return 0.1;
  };

  const auraIntensity = getAuraIntensity();

  // TTS toggle function
  const { updateSettings } = useAccessibilityStore();
  const handleTTSToggle = () => {
    if (ttsEnabled) {
      // If TTS is enabled, stop current speech
      onStopTTS();
    } else {
      // If TTS is disabled, enable it
      updateSettings({ ttsEnabled: true });
    }
  };

  const backgroundStyle = isHexColor(character.color)
    ? { background: `linear-gradient(180deg, ${character.color}, ${character.color}dd)` }
    : undefined;

  const backgroundClass = !isHexColor(character.color)
    ? `bg-gradient-to-b ${character.color}`
    : '';

  // Ensure high contrast for text and icons
  const textColor = 'text-white';
  const iconColor = 'text-white';
  const buttonBg = 'bg-white/25 hover:bg-white/35'; // Higher opacity for better contrast

  return (
    <div
      className={cn(
        "relative w-64 sm:w-72 flex flex-col p-4 sm:p-5 rounded-2xl h-full min-h-[120px]",
        backgroundClass,
        textColor
      )}
      style={backgroundStyle}
    >
      {/* Top bar: Left controls and Right close button */}
      <div className="flex items-center justify-between mb-4">
        {/* Left: Reload (if provided) */}
        {onClearChat && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClearChat}
            className={cn(
              'rounded-full h-8 w-8',
              buttonBg,
              iconColor
            )}
            aria-label="Nuova conversazione"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        )}

        {/* Right: Close button */}
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className={cn(
              'rounded-full h-8 w-8',
              buttonBg,
              iconColor
            )}
            aria-label="Chiudi (Esc)"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Center: Name and status */}
      <div className="flex flex-col items-center gap-1.5 mb-4">
        <h2 className="text-lg sm:text-xl font-bold text-center">{character.name}</h2>
        {character.specialty && (
          <p className="text-xs sm:text-sm text-white/90 text-center">{character.specialty}</p>
        )}
        <p className={cn(
          "text-xs text-center",
          configError ? "text-red-200" : "text-white/80"
        )}>
          {statusText}
        </p>
      </div>

      {/* Avatar with animated aura - centered */}
      <div className="flex-1 flex items-center justify-center my-4">
        <div className="relative">
          {/* Animated aura rings */}
          {isConnected && (
            <>
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-white/30"
                animate={{
                  scale: isSpeaking ? [1, 1.15 + auraIntensity * 0.1, 1] : [1, 1.08, 1],
                  opacity: [0.2, 0.4 + auraIntensity * 0.3, 0.2],
                }}
                transition={{
                  repeat: Infinity,
                  duration: isSpeaking ? 0.8 : 2,
                  ease: 'easeInOut',
                }}
                style={{
                  width: '100px',
                  height: '100px',
                  margin: '-10px',
                }}
              />
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-white/40"
                animate={{
                  scale: isSpeaking ? [1, 1.12 + auraIntensity * 0.08, 1] : [1, 1.06, 1],
                  opacity: [0.3, 0.5 + auraIntensity * 0.4, 0.3],
                }}
                transition={{
                  repeat: Infinity,
                  duration: isSpeaking ? 0.7 : 1.8,
                  ease: 'easeInOut',
                }}
                style={{
                  width: '90px',
                  height: '90px',
                  margin: '-5px',
                }}
              />
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-white/50"
                animate={{
                  scale: isSpeaking ? [1, 1.08 + auraIntensity * 0.06, 1] : [1, 1.04, 1],
                  opacity: [0.4, 0.6 + auraIntensity * 0.3, 0.4],
                }}
                transition={{
                  repeat: Infinity,
                  duration: isSpeaking ? 0.6 : 1.5,
                  ease: 'easeInOut',
                }}
                style={{
                  width: '85px',
                  height: '85px',
                  margin: '-2.5px',
                }}
              />
            </>
          )}

          {/* Avatar */}
          <div className="relative z-10">
            {character.avatar ? (
              <Image
                src={character.avatar}
                alt={character.name}
                width={80}
                height={80}
                className={cn(
                  'w-20 h-20 rounded-full border-4 object-cover',
                  isConnected ? 'border-white shadow-2xl' : 'border-white/50'
                )}
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-3xl font-bold border-4 border-white">
                {character.name.charAt(0)}
              </div>
            )}
            {isConnected && (
              <span className="absolute bottom-0 right-0 w-5 h-5 bg-green-400 border-2 border-white rounded-full animate-pulse z-20" />
            )}
          </div>
        </div>
      </div>

      {/* Bottom: Audio controls */}
      <div className="flex flex-col items-center gap-3 mt-auto">
        {/* Device selector, Mute and TTS buttons - grouped together */}
        <div className="flex items-center gap-2">
          <AudioDeviceSelector compact />
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleMute}
            disabled={!isConnected}
            className={cn(
              'rounded-full h-10 w-10',
              !isConnected && 'opacity-40',
              isMuted ? 'bg-red-500/50 hover:bg-red-500/60' : buttonBg,
              iconColor
            )}
            aria-label={isMuted ? 'Attiva microfono' : 'Disattiva microfono'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleTTSToggle}
            className={cn(
              'rounded-full h-10 w-10',
              !ttsEnabled && 'opacity-60',
              buttonBg,
              iconColor
            )}
            aria-label={ttsEnabled ? 'Ferma lettura vocale' : 'Attiva lettura vocale'}
          >
            {ttsEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </Button>
        </div>

        {/* Call button - green when inactive, red when active (iPhone style) */}
        <Button
          variant={isConnected ? 'destructive' : 'default'}
          size="icon"
          onClick={onEndCall}
          className={cn(
            'rounded-full h-14 w-14',
            isConnected
              ? 'bg-red-500 hover:bg-red-600 animate-pulse'
              : 'bg-green-500 hover:bg-green-600',
            iconColor
          )}
          aria-label={isConnected ? 'Termina chiamata' : 'Avvia chiamata'}
        >
          {isConnected ? (
            <PhoneOff className="w-7 h-7" />
          ) : (
            <Phone className="w-7 h-7" />
          )}
        </Button>

        {/* Status text */}
        {isConnected && (
          <p className="text-xs text-white/80 text-center mt-2">
            {isMuted ? 'Microfono disattivato' : 'Parla ora...'}
          </p>
        )}
      </div>
    </div>
  );
}

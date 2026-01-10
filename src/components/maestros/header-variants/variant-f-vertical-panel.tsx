'use client';

/**
 * VARIANTE F: Pannello Verticale Destro (Migliorata)
 * 
 * - Contrasto migliorato per accessibilità WCAG AA
 * - Device selector accanto a mute/TTS
 * - TTS fixato
 * - Tutti i controlli organizzati
 */

import Image from 'next/image';
import { X, Phone, PhoneOff, Volume2, VolumeX, RotateCcw, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AudioDeviceSelector } from '@/components/conversation/components/audio-device-selector';
import { AuraRings } from './aura-rings';
import { cn } from '@/lib/utils';
import type { Maestro } from '@/types';
import { useEffect } from 'react';
import { useAccessibilityStore } from '@/lib/accessibility/accessibility-store';

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

export function HeaderVariantF(props: HeaderVariantProps) {
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

  // Handle Esc key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

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

  // High contrast colors for accessibility (WCAG AA: 4.5:1 minimum)
  const textColor = 'text-white';
  const iconColor = 'text-white';
  const buttonBg = 'bg-white/30 hover:bg-white/40'; // Higher opacity for better contrast
  const buttonBgMuted = 'bg-red-500/60 hover:bg-red-500/70'; // Higher opacity for muted state

  return (
    <div
      className={cn(
        "relative w-64 sm:w-72 flex flex-col p-4 sm:p-5 rounded-2xl h-full min-h-[120px]",
        textColor
      )}
      style={{ background: `linear-gradient(180deg, ${maestro.color}, ${maestro.color}dd)` }}
    >
      {/* Top bar: Left controls and Right close button */}
      <div className="flex items-center justify-between mb-4">
        {/* Left: Reload */}
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

        {/* Right: Close button */}
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
      </div>

      {/* Center: Name and status */}
      <div className="flex flex-col items-center gap-1.5 mb-4">
        <h2 className="text-lg sm:text-xl font-bold text-center">{maestro.name}</h2>
        <p className={cn(
          "text-xs sm:text-sm text-center",
          configError ? "text-red-200" : "text-white/90"
        )}>
          {statusText}
        </p>
      </div>

      {/* Avatar with animated aura - centered */}
      <div className="flex-1 flex items-center justify-center my-4">
        <div className="relative">
          {/* Animated aura rings - dynamic based on voice */}
          {isVoiceActive && isConnected && (
            <>
              {/* Outer ring */}
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
              {/* Middle ring */}
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
              {/* Inner ring */}
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

          {/* Avatar - static, no movement */}
          <div className="relative z-10">
            <Image
              src={maestro.avatar}
              alt={maestro.name}
              width={80}
              height={80}
              className={cn(
                'w-20 h-20 rounded-full border-4 object-cover',
                isConnected ? 'border-white shadow-2xl' : 'border-white/50'
              )}
            />
            <span className={cn(
              "absolute bottom-0 right-0 w-5 h-5 border-2 border-white rounded-full z-20",
              isVoiceActive && isConnected ? "bg-green-400 animate-pulse" : "bg-green-400"
            )} />
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
            disabled={!isVoiceActive || !isConnected}
            className={cn(
              'rounded-full h-10 w-10',
              !isVoiceActive && 'opacity-40',
              isMuted ? buttonBgMuted : buttonBg,
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
          variant={isVoiceActive ? 'destructive' : 'default'}
          size="icon"
          onClick={onVoiceCall}
          disabled={!!configError && !isVoiceActive}
          className={cn(
            'rounded-full h-14 w-14',
            isVoiceActive
              ? 'bg-red-500 hover:bg-red-600 animate-pulse'
              : 'bg-green-500 hover:bg-green-600',
            configError && !isVoiceActive && 'opacity-40',
            iconColor
          )}
          aria-label={isVoiceActive ? 'Termina chiamata' : 'Avvia chiamata'}
        >
          {isVoiceActive ? (
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

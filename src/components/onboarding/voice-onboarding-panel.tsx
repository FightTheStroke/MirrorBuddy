'use client';

/**
 * VoiceOnboardingPanel - Voice panel for Melissa during onboarding
 *
 * Provides:
 * - Voice call controls with Melissa's avatar and styling
 * - Connection status and audio visualizer
 * - Fallback message when Azure is unavailable
 *
 * Related: #61 Onboarding Voice Integration
 */

import { useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useOnboardingVoice } from '@/lib/hooks/use-onboarding-voice';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';
import { MELISSA } from '@/data/support-teachers';

// Pre-computed random offsets for audio visualizer bars
const VISUALIZER_BAR_OFFSETS = [8, 12, 6, 14, 10];

// Melissa's pink theme color
const MELISSA_COLOR = '#EC4899';

export interface VoiceOnboardingPanelProps {
  className?: string;
  onFallbackToWebSpeech?: () => void;
}

export function VoiceOnboardingPanel({
  className,
  onFallbackToWebSpeech,
}: VoiceOnboardingPanelProps) {
  const {
    isConnected,
    isConnecting,
    isSpeaking,
    isMuted,
    azureAvailable,
    connect,
    disconnect,
    toggleMute,
    checkAzureAvailability,
  } = useOnboardingVoice({
    onAzureUnavailable: () => {
      onFallbackToWebSpeech?.();
    },
    onError: (error) => {
      console.error('[VoiceOnboardingPanel] Error:', error);
    },
  });

  const { isVoiceMuted } = useOnboardingStore();
  const [hasCheckedAzure, setHasCheckedAzure] = useState(false);

  // Check Azure availability on mount
  useEffect(() => {
    if (!hasCheckedAzure) {
      checkAzureAvailability().then((available) => {
        setHasCheckedAzure(true);
        // If Azure not available, trigger fallback
        if (!available) {
          onFallbackToWebSpeech?.();
        }
      });
    }
  }, [checkAzureAvailability, hasCheckedAzure, onFallbackToWebSpeech]);

  const handleStartCall = useCallback(() => {
    connect();
  }, [connect]);

  const handleEndCall = useCallback(() => {
    disconnect();
  }, [disconnect]);

  const getStatusText = () => {
    if (isConnecting) return 'Connessione...';
    if (isConnected && isSpeaking) return 'Melissa sta parlando...';
    if (isConnected) return 'In ascolto...';
    if (azureAvailable === false) return 'Voce non disponibile';
    return 'Premi per chiamare';
  };

  // If Azure is not available, show fallback UI
  if (azureAvailable === false) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          'flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-gray-100 dark:bg-gray-800',
          className
        )}
      >
        <VolumeX className="w-10 h-10 text-gray-400" />
        <p className="text-sm text-gray-600 dark:text-gray-300 text-center">
          La voce interattiva non è disponibile.
          <br />
          Compila i campi manualmente.
        </p>
      </motion.div>
    );
  }

  // Loading state while checking Azure
  if (!hasCheckedAzure) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn(
          'flex flex-col items-center justify-center gap-3 p-6 rounded-2xl',
          className
        )}
        style={{ background: `linear-gradient(to bottom, ${MELISSA_COLOR}40, ${MELISSA_COLOR}20)` }}
      >
        <div className="w-12 h-12 rounded-full border-4 border-pink-300 border-t-pink-500 animate-spin" />
        <p className="text-sm text-gray-600 dark:text-gray-300">Verifica connessione...</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        'flex flex-col items-center justify-center gap-4 p-6 rounded-2xl',
        className
      )}
      style={{ background: `linear-gradient(to bottom, ${MELISSA_COLOR}, ${MELISSA_COLOR}dd)` }}
    >
      {/* Avatar with status ring */}
      <motion.div
        animate={{ scale: isSpeaking ? [1, 1.05, 1] : 1 }}
        transition={{ repeat: Infinity, duration: 1.5 }}
        className="relative"
      >
        <div
          className={cn(
            'w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold border-4 transition-all duration-300',
            'bg-gradient-to-br from-pink-400 to-pink-600',
            isConnected ? 'border-white shadow-lg' : 'border-white/50',
            isSpeaking && 'shadow-xl shadow-white/30'
          )}
        >
          M
        </div>
        {isConnected && (
          <span className="absolute bottom-1 right-1 w-4 h-4 bg-green-400 border-2 border-white/50 rounded-full animate-pulse" />
        )}
      </motion.div>

      {/* Name and status */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-white">{MELISSA.name}</h3>
        <p className="text-xs text-white/70">Coach di sostegno</p>
        <p className="text-xs text-white/60 mt-1">{getStatusText()}</p>
      </div>

      {/* Audio visualizer - only when connected */}
      <AnimatePresence>
        {isConnected && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 32 }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-1"
          >
            {VISUALIZER_BAR_OFFSETS.map((offset, i) => (
              <motion.div
                key={i}
                animate={{
                  height: isSpeaking
                    ? [4, 20 + offset, 4]
                    : !isMuted
                      ? [4, 8, 4]
                      : 4,
                }}
                transition={{
                  repeat: Infinity,
                  duration: 0.5 + i * 0.1,
                  ease: 'easeInOut',
                }}
                className={cn(
                  'w-1.5 rounded-full',
                  isSpeaking ? 'bg-white' : !isMuted ? 'bg-white/80' : 'bg-white/30'
                )}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <div className="flex items-center gap-3 mt-2">
        {!isConnected ? (
          <Button
            onClick={handleStartCall}
            disabled={isConnecting}
            className="rounded-full w-14 h-14 bg-white text-pink-500 hover:bg-white/90 shadow-lg"
            aria-label="Inizia chiamata con Melissa"
          >
            <Phone className="w-6 h-6" />
          </Button>
        ) : (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
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

            <Button
              variant="ghost"
              size="icon"
              onClick={handleEndCall}
              className="rounded-full w-12 h-12 bg-red-500 text-white hover:bg-red-600"
              aria-label="Termina chiamata"
            >
              <PhoneOff className="w-5 h-5" />
            </Button>
          </>
        )}
      </div>

      {/* Mute status text */}
      {isConnected && (
        <p className="text-xs text-white/60" aria-live="polite" role="status">
          {isMuted ? 'Microfono disattivato' : 'Parla con Melissa...'}
        </p>
      )}

      {/* Hint text when not connected */}
      {!isConnected && !isConnecting && (
        <p className="text-xs text-white/60 text-center max-w-[180px]">
          Parla con Melissa per completare l&apos;onboarding
        </p>
      )}
    </motion.div>
  );
}

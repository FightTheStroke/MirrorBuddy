'use client';

/**
 * VoiceOnboardingPanel - Unified voice experience with Melissa
 *
 * REFACTORED: Now receives voice session from parent (welcome/page.tsx) to maintain
 * a single persistent connection across all onboarding steps.
 *
 * When voice is active:
 * - Shows large Melissa avatar with speaking animation
 * - Integrated transcript (last messages)
 * - Checklist of captured data
 * - Mute/Hangup controls
 *
 * When voice is not active:
 * - Compact "Call Melissa" button
 *
 * Related: #61 Onboarding Voice Integration
 */

import { useEffect, useCallback, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Phone, PhoneOff, Mic, MicOff, Check, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';
import type { Maestro, VoiceSessionHandle } from '@/types';
import type { ExistingUserDataForPrompt } from '@/lib/voice/onboarding-tools';

interface VoiceConnectionInfo {
  provider: 'azure';
  proxyPort: number;
  configured: boolean;
}

export interface VoiceOnboardingPanelProps {
  className?: string;
  onFallbackToWebSpeech?: () => void;
  /** Which step we're on - affects what data we show */
  step?: 'welcome' | 'info';
  /** Voice session handle from parent - maintains single connection */
  voiceSession: VoiceSessionHandle;
  /** Connection info from parent */
  connectionInfo: VoiceConnectionInfo | null;
  /** Melissa maestro config from parent */
  onboardingMelissa: Maestro;
  /** Existing user data for returning users - Melissa will acknowledge them */
  existingUserData?: ExistingUserDataForPrompt | null;
}

export function VoiceOnboardingPanel({
  className,
  onFallbackToWebSpeech: _onFallbackToWebSpeech,
  step = 'welcome',
  voiceSession,
  connectionInfo,
  onboardingMelissa,
  existingUserData: _existingUserData,
}: VoiceOnboardingPanelProps) {
  const { data, voiceTranscript, clearVoiceTranscript } = useOnboardingStore();
  const hasInitializedRef = useRef(false);
  const hasAttemptedConnectionRef = useRef(false);

  const [configError, setConfigError] = useState<string | null>(null);
  const [isVoiceActive, setIsVoiceActive] = useState(false);

  // Destructure voice session
  const {
    isConnected,
    isListening,
    isSpeaking,
    isMuted,
    connectionState,
    connect,
    disconnect,
    toggleMute,
  } = voiceSession;

  // Clear transcript only on first mount of welcome step
  useEffect(() => {
    if (!hasInitializedRef.current && step === 'welcome') {
      hasInitializedRef.current = true;
      clearVoiceTranscript();
    }
  }, [clearVoiceTranscript, step]);

  // Connect when voice is activated (only if not already connected)
  useEffect(() => {
    const startConnection = async () => {
      // Skip if already connected or already attempted
      if (isConnected) return;
      if (!isVoiceActive) return;
      if (hasAttemptedConnectionRef.current) return;
      if (!connectionInfo) return;
      if (connectionState !== 'idle') return;

      hasAttemptedConnectionRef.current = true;
      setConfigError(null);

      try {
        logger.debug('[VoiceOnboardingPanel] Connecting to voice session...');
        await connect(onboardingMelissa, connectionInfo);
      } catch (error) {
        logger.error('[VoiceOnboardingPanel] Connection failed', { error: String(error) });
        if (error instanceof DOMException && error.name === 'NotAllowedError') {
          setConfigError('Microfono non autorizzato. Abilita il microfono nelle impostazioni del browser.');
        } else {
          setConfigError('Errore di connessione vocale');
        }
        hasAttemptedConnectionRef.current = false;
      }
    };

    startConnection();
  }, [isVoiceActive, connectionInfo, isConnected, connectionState, connect, onboardingMelissa]);

  const handleStartCall = useCallback(() => {
    setIsVoiceActive(true);
    hasAttemptedConnectionRef.current = false;
  }, []);

  const handleEndCall = useCallback(() => {
    setIsVoiceActive(false);
    disconnect();
    hasAttemptedConnectionRef.current = false;
  }, [disconnect]);

  // Get last 4 transcript entries
  const recentTranscript = voiceTranscript.slice(-4);

  // Data checklist based on step
  const getChecklist = () => {
    if (step === 'welcome') {
      return [
        { key: 'name', label: 'Nome', value: data.name, required: true },
      ];
    }
    return [
      { key: 'name', label: 'Nome', value: data.name, required: true },
      { key: 'age', label: 'Età', value: data.age ? `${data.age} anni` : null, required: false },
      { key: 'school', label: 'Scuola', value: data.schoolLevel ?
        (data.schoolLevel === 'elementare' ? 'Elementare' :
         data.schoolLevel === 'media' ? 'Media' : 'Superiore') : null, required: false },
      { key: 'differences', label: 'Difficoltà', value: data.learningDifferences?.length ?
        `${data.learningDifferences.length} indicate` : null, required: false },
    ];
  };

  const checklist = getChecklist();

  // If Azure is not available, show nothing (form mode will be used)
  if (!connectionInfo) {
    return null;
  }

  // ========== NOT CONNECTED - Show call button ==========
  // Show call button if not connected AND (not active OR in idle state)
  if (!isConnected && (!isVoiceActive || connectionState === 'idle')) {
    return (
      <motion.button
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={handleStartCall}
        className={cn(
          'flex items-center gap-3 px-6 py-4 rounded-2xl',
          'bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700',
          'text-white font-medium shadow-lg hover:shadow-xl transition-all',
          className
        )}
      >
        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/30">
          <Image
            src="/avatars/melissa.jpg"
            alt="Melissa"
            width={48}
            height={48}
            className="object-cover w-full h-full"
          />
        </div>
        <div className="text-left">
          <div className="font-semibold">Chiama Melissa</div>
          <div className="text-sm text-pink-100">Completa con la voce</div>
        </div>
        <Phone className="w-6 h-6 ml-2" />
      </motion.button>
    );
  }

  // ========== CONNECTING ==========
  if (isVoiceActive && !isConnected && connectionState === 'connecting') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn(
          'flex flex-col items-center justify-center gap-4 p-8 rounded-2xl',
          'bg-gradient-to-br from-pink-500 to-pink-600',
          className
        )}
      >
        <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white/30 animate-pulse">
          <Image
            src="/avatars/melissa.jpg"
            alt="Melissa"
            width={80}
            height={80}
            className="object-cover w-full h-full"
          />
        </div>
        <p className="text-white font-medium">
          {configError || 'Connessione in corso...'}
        </p>
        {configError && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsVoiceActive(false);
              setConfigError(null);
            }}
            className="text-white/80 hover:text-white"
          >
            Annulla
          </Button>
        )}
      </motion.div>
    );
  }

  // ========== CONNECTED - Full voice experience ==========
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex flex-col rounded-2xl overflow-hidden shadow-2xl',
        'bg-gradient-to-br from-pink-500 via-pink-600 to-pink-700',
        className
      )}
    >
      {/* Header with avatar and status */}
      <div className="flex items-center gap-4 p-6 pb-4">
        <motion.div
          animate={{ scale: isSpeaking ? [1, 1.05, 1] : 1 }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="relative"
        >
          <div className={cn(
            'w-20 h-20 rounded-full overflow-hidden border-4 transition-all',
            isSpeaking ? 'border-white shadow-lg shadow-white/30' : 'border-white/50'
          )}>
            <Image
              src="/avatars/melissa.jpg"
              alt="Melissa"
              width={80}
              height={80}
              className="object-cover w-full h-full"
            />
          </div>
          <span className="absolute bottom-1 right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full animate-pulse" />
        </motion.div>

        <div className="flex-1">
          <h3 className="text-xl font-bold text-white">Melissa</h3>
          <p className="text-sm text-pink-100">
            {isSpeaking ? 'Sta parlando...' : isMuted ? 'Microfono spento' : isListening ? 'In ascolto...' : 'Connessa'}
          </p>
        </div>

        {/* Audio visualizer */}
        <div className="flex items-center gap-1 h-8">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              animate={{
                height: isSpeaking ? [4, 20 + i * 3, 4] : isListening && !isMuted ? [4, 8, 4] : 4,
              }}
              transition={{
                repeat: Infinity,
                duration: 0.5 + i * 0.1,
                ease: 'easeInOut',
              }}
              className={cn(
                'w-1.5 rounded-full',
                isSpeaking ? 'bg-white' : isListening && !isMuted ? 'bg-white/60' : 'bg-white/30'
              )}
            />
          ))}
        </div>
      </div>

      {/* Transcript area */}
      <div className="flex-1 px-6 py-4 bg-white/10 backdrop-blur-sm min-h-[120px] max-h-[200px] overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {recentTranscript.length === 0 ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-pink-100 text-sm italic text-center py-4"
            >
              Parla con Melissa...
            </motion.p>
          ) : (
            recentTranscript.map((entry) => (
              <motion.div
                key={entry.timestamp}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={cn(
                  'mb-2 p-2 rounded-lg text-sm',
                  entry.role === 'assistant'
                    ? 'bg-white/20 text-white'
                    : 'bg-pink-800/30 text-pink-100 ml-4'
                )}
              >
                <span className="font-medium">
                  {entry.role === 'assistant' ? 'Melissa: ' : 'Tu: '}
                </span>
                {entry.text}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Data checklist */}
      <div className="px-6 py-3 bg-white/5">
        <div className="flex flex-wrap gap-2">
          {checklist.map((item) => (
            <div
              key={item.key}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm',
                item.value
                  ? 'bg-green-500/20 text-green-100'
                  : 'bg-white/10 text-white/60'
              )}
            >
              {item.value ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Circle className="w-3.5 h-3.5" />
              )}
              <span>{item.label}</span>
              {item.value && <span className="font-medium">: {item.value}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 p-4 bg-pink-800/30">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleMute}
          aria-label={isMuted ? 'Attiva microfono' : 'Disattiva microfono'}
          className={cn(
            'rounded-full w-14 h-14 transition-colors',
            isMuted
              ? 'bg-red-500/20 text-red-200 hover:bg-red-500/30'
              : 'bg-white/20 text-white hover:bg-white/30'
          )}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleEndCall}
          className="rounded-full w-14 h-14 bg-red-500 text-white hover:bg-red-600"
          aria-label="Termina chiamata"
        >
          <PhoneOff className="w-6 h-6" />
        </Button>
      </div>
    </motion.div>
  );
}

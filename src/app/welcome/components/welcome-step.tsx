'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Sparkles, ArrowRight, Volume2, VolumeX, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';
import { VoiceOnboardingPanel } from '@/components/onboarding/voice-onboarding-panel';
import {
  useOnboardingTTS,
  ONBOARDING_SCRIPTS,
} from '@/lib/hooks/use-onboarding-tts';
import type { Maestro, VoiceSessionHandle } from '@/types';

interface VoiceConnectionInfo {
  provider: 'azure';
  proxyPort: number;
  configured: boolean;
}

interface WelcomeStepProps {
  useWebSpeechFallback?: boolean;
  onAzureUnavailable?: () => void;
  /** Voice session handle from parent */
  voiceSession?: VoiceSessionHandle;
  /** Connection info from parent */
  connectionInfo?: VoiceConnectionInfo | null;
  /** Melissa maestro from parent */
  onboardingMelissa?: Maestro;
}

/**
 * Step 1: Melissa intro + asks for student name
 *
 * TWO MODES:
 * 1. Voice mode (default): Melissa auto-starts and asks for name via voice
 * 2. Form mode (fallback): Traditional form when Azure unavailable
 *
 * Voice Integration (#61):
 * - Melissa auto-connects when page loads (no button click needed)
 * - Falls back to form + Web Speech TTS when Azure unavailable
 */
export function WelcomeStep({
  useWebSpeechFallback = false,
  onAzureUnavailable,
  voiceSession,
  connectionInfo,
  onboardingMelissa,
}: WelcomeStepProps) {
  const {
    data,
    updateData,
    nextStep,
    isReplayMode,
    isVoiceMuted,
    setVoiceMuted,
  } = useOnboardingStore();

  const [name, setName] = useState(data.name || '');
  const [error, setError] = useState('');

  // Track previous store value to detect voice-captured changes
  const prevNameRef = useRef(data.name);

  // Sync local name state with store (when voice captures name)
  useEffect(() => {
    if (data.name && data.name !== prevNameRef.current) {
      prevNameRef.current = data.name;
      queueMicrotask(() => {
        setName(data.name);
      });
    }
  }, [data.name]);

  // Auto-speak Melissa's welcome message (only when using Web Speech fallback)
  const { isPlaying, stop } = useOnboardingTTS({
    autoSpeak: useWebSpeechFallback && !isVoiceMuted,
    text: ONBOARDING_SCRIPTS.welcome,
    delay: 800,
  });

  const toggleMute = () => {
    if (isPlaying) {
      stop();
    }
    setVoiceMuted(!isVoiceMuted);
  };

  const handleContinue = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Per favore, dimmi come ti chiami!');
      return;
    }
    if (trimmedName.length < 2) {
      setError('Il nome deve avere almeno 2 caratteri');
      return;
    }
    stop();
    updateData({ name: trimmedName });
    nextStep();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleContinue();
    }
  };

  // ========== VOICE MODE: Melissa auto-starts (default when Azure available) ==========
  if (!useWebSpeechFallback) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md mx-auto"
      >
        {/* Melissa voice panel - user clicks to start call */}
        {voiceSession && onboardingMelissa && (
          <VoiceOnboardingPanel
            step="welcome"
            onFallbackToWebSpeech={onAzureUnavailable}
            className="w-full"
            voiceSession={voiceSession}
            connectionInfo={connectionInfo ?? null}
            onboardingMelissa={onboardingMelissa}
          />
        )}

        {/* Show captured name with continue button */}
        <AnimatePresence>
          {data.name && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-4 p-4 bg-white/90 dark:bg-gray-800/90 rounded-2xl shadow-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Nome catturato</p>
                  <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">{data.name}</p>
                </div>
              </div>

              <Button
                onClick={handleContinue}
                className="w-full mt-4 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white"
              >
                Continua
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {isReplayMode && (
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
            Stai rivedendo il tutorial. I tuoi dati esistenti non verranno modificati.
          </p>
        )}
      </motion.div>
    );
  }

  // ========== FORM MODE: Fallback when Azure unavailable ==========
  return (
    <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-0 shadow-2xl overflow-hidden">
      <CardContent className="p-0">
        {/* Melissa header with gradient */}
        <div className="relative bg-gradient-to-r from-pink-500 to-pink-600 p-8 text-white">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex items-center gap-6"
          >
            {/* Melissa avatar */}
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/30 shadow-lg">
                <Image
                  src="/avatars/melissa.jpg"
                  alt="Melissa - Coach"
                  width={96}
                  height={96}
                  className="object-cover w-full h-full"
                  priority
                />
              </div>
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 2, repeatDelay: 3 }}
                className="absolute -bottom-1 -right-1 bg-yellow-400 rounded-full p-1.5"
              >
                <Sparkles className="w-4 h-4 text-yellow-800" />
              </motion.div>
            </div>

            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-1">Ciao! Sono Melissa</h1>
              <p className="text-pink-100 text-sm">
                La tua insegnante di sostegno
              </p>
            </div>

            {/* Voice toggle button (Web Speech) */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              onClick={toggleMute}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              aria-label={isVoiceMuted ? 'Attiva voce' : 'Disattiva voce'}
              title={isVoiceMuted ? 'Attiva voce' : 'Disattiva voce'}
            >
              {isVoiceMuted ? (
                <VolumeX className="w-5 h-5 text-white" />
              ) : (
                <Volume2 className={`w-5 h-5 text-white ${isPlaying ? 'animate-pulse' : ''}`} />
              )}
            </motion.button>
          </motion.div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-4"
          >
            <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
              Benvenuto nella <strong>Scuola Che Vorrei</strong>! Sono qui per aiutarti
              a studiare nel modo che funziona meglio per te.
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              Non preoccuparti se qualcosa ti sembra difficile - insieme troveremo
              sempre un modo per capirlo!
            </p>
          </motion.div>

          {/* Manual input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="space-y-3"
          >
            <label
              htmlFor="student-name"
              className="block text-lg font-medium text-gray-800 dark:text-gray-200"
            >
              Come ti chiami?
            </label>
            <Input
              id="student-name"
              type="text"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setName(e.target.value);
                setError('');
              }}
              onKeyDown={handleKeyDown}
              placeholder="Scrivi il tuo nome..."
              className="text-lg py-6 px-4 border-2 focus:border-pink-500 focus:ring-pink-500"
              aria-describedby={error ? 'name-error' : undefined}
              autoFocus
            />
            {error && (
              <p id="name-error" className="text-red-500 text-sm" role="alert">
                {error}
              </p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="pt-4"
          >
            <Button
              onClick={handleContinue}
              size="lg"
              className="w-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white py-6 text-lg font-semibold shadow-lg"
            >
              Piacere di conoscerti!
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </motion.div>

          {isReplayMode && (
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              Stai rivedendo il tutorial. I tuoi dati esistenti non verranno modificati.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

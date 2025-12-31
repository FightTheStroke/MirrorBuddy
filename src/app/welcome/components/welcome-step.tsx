'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Sparkles, ArrowRight, Volume2, VolumeX, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';
import {
  useOnboardingTTS,
  ONBOARDING_SCRIPTS,
} from '@/lib/hooks/use-onboarding-tts';

interface WelcomeStepProps {
  useWebSpeechFallback?: boolean;
}

/**
 * Step 1: Melissa intro + asks for student name
 *
 * Melissa is the default coach, but the student can change coach later in settings.
 * She warmly welcomes the student and asks for their name.
 *
 * Voice Integration (#61):
 * - Syncs with voice-captured name from onboarding store
 * - Shows feedback when voice captures data
 * - Falls back to Web Speech TTS when Azure unavailable
 */
export function WelcomeStep({ useWebSpeechFallback = false }: WelcomeStepProps) {
  const {
    data,
    updateData,
    nextStep,
    isReplayMode,
    isVoiceMuted,
    setVoiceMuted,
    voiceSessionActive,
  } = useOnboardingStore();
  const [name, setName] = useState(data.name || '');
  const [error, setError] = useState('');
  const [voiceCapturedName, setVoiceCapturedName] = useState(false);

  // Track previous store value to detect voice-captured changes
  const prevNameRef = useRef(data.name);

  // Sync local name state with store (when voice captures name)
  useEffect(() => {
    if (data.name && data.name !== prevNameRef.current) {
      prevNameRef.current = data.name;
      // Use microtask to avoid synchronous setState in effect
      queueMicrotask(() => {
        setName(data.name);
        setVoiceCapturedName(true);
        setTimeout(() => setVoiceCapturedName(false), 3000);
      });
    }
  }, [data.name]);

  // Auto-speak Melissa's welcome message (only when using Web Speech fallback)
  // When Azure voice is active, Melissa speaks through the realtime API
  const { isPlaying, stop } = useOnboardingTTS({
    autoSpeak: useWebSpeechFallback && !isVoiceMuted && !voiceSessionActive,
    text: ONBOARDING_SCRIPTS.welcome,
    delay: 800, // Wait for animation
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
    stop(); // Stop voice before navigating
    updateData({ name: trimmedName });
    nextStep();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleContinue();
    }
  };

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

            {/* Voice toggle button */}
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
              sempre un modo per capirlo! E se preferisci un altro coach, potrai
              cambiarmi dalle impostazioni.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="space-y-3"
          >
            <label
              htmlFor="student-name"
              className="block text-lg font-medium text-gray-800 dark:text-gray-200"
            >
              Come ti chiami?
            </label>
            <div className="relative">
              <Input
                id="student-name"
                type="text"
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setName(e.target.value);
                  setError('');
                  setVoiceCapturedName(false);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Scrivi il tuo nome..."
                className={`text-lg py-6 px-4 border-2 focus:border-pink-500 focus:ring-pink-500 ${
                  voiceCapturedName ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : ''
                }`}
                aria-describedby={error ? 'name-error' : undefined}
                autoFocus={!voiceSessionActive}
              />
              {voiceCapturedName && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-green-600 dark:text-green-400"
                >
                  <Mic className="w-4 h-4" />
                  <span className="text-xs font-medium">Melissa ha capito!</span>
                </motion.div>
              )}
            </div>
            {error && (
              <p id="name-error" className="text-red-500 text-sm" role="alert">
                {error}
              </p>
            )}
            {voiceSessionActive && !name && (
              <p className="text-sm text-pink-600 dark:text-pink-400 flex items-center gap-1">
                <Mic className="w-3 h-3" />
                Parla con Melissa per dirle il tuo nome...
              </p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
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

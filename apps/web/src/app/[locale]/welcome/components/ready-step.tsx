'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { PartyPopper, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';
import { useOnboardingTTS, ONBOARDING_SCRIPTS } from '@/lib/hooks/use-onboarding-tts';
import { ReadyNavigation } from './ready-navigation';

// Pre-defined sparkle offsets (avoids Math.random during render)
const SPARKLE_OFFSETS = [5, -12, 18, -8, 15, -5];

interface ReadyStepProps {
  useWebSpeechFallback?: boolean;
  onAzureUnavailable?: () => void;
}

export function ReadyStep(_props: ReadyStepProps) {
  const t = useTranslations('welcome.ready');
  const { data, isReplayMode, isVoiceMuted, setVoiceMuted } = useOnboardingStore();

  // Auto-speak Melissa's ready message (personalized with name)
  const { isPlaying, stop } = useOnboardingTTS({
    autoSpeak: !isVoiceMuted,
    text: ONBOARDING_SCRIPTS.ready(data.name),
    delay: 500,
  });

  const toggleMute = () => {
    if (isPlaying) stop();
    setVoiceMuted(!isVoiceMuted);
  };

  return (
    <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-0 shadow-2xl overflow-hidden">
      <CardContent className="p-0">
        {/* Celebratory header */}
        <div className="relative bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 p-8 text-white text-center">
          {/* Voice toggle */}
          <button
            onClick={toggleMute}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            aria-label={isVoiceMuted ? t('enableVoice') : t('disableVoice')}
            title={isVoiceMuted ? t('enableVoice') : t('disableVoice')}
          >
            {isVoiceMuted ? (
              <VolumeX className="w-5 h-5 text-white" />
            ) : (
              <Volume2 className={`w-5 h-5 text-white ${isPlaying ? 'animate-pulse' : ''}`} />
            )}
          </button>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="flex justify-center mb-4"
          >
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/30 shadow-lg">
                <Image
                  src="/avatars/melissa.webp"
                  alt="Melissa"
                  width={96}
                  height={96}
                  className="object-cover w-full h-full"
                />
              </div>
              <motion.div
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ repeat: Infinity, duration: 1.5, repeatDelay: 2 }}
                className="absolute -top-2 -right-2"
              >
                <PartyPopper className="w-8 h-8 text-yellow-300" />
              </motion.div>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-bold mb-2"
          >
            {t('perfectName', { name: data.name })}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-white/80"
          >
            {t('readyToStart')}
          </motion.p>

          {/* Floating sparkles */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute"
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0, 1, 0],
                y: [-20, -60],
                x: SPARKLE_OFFSETS[i],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.3,
                repeatDelay: 1,
              }}
              style={{
                left: `${15 + i * 14}%`,
                bottom: '20%',
              }}
            >
              <Sparkles className="w-4 h-4 text-yellow-300" />
            </motion.div>
          ))}
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-center space-y-4"
          >
            <p className="text-lg text-gray-700 dark:text-gray-300">{t('preparedForYou')}</p>

            <div className="grid gap-3 text-left max-w-md mx-auto">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-pink-50 dark:bg-pink-950/30">
                <span className="text-2xl">💬</span>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>{t('speakAnytimeTitle')}</strong> - {t('speakAnytimeDescription')}
                </p>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                <span className="text-2xl">📚</span>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>{t('chooseProfessor')}</strong> - {t('chooseProfessorDesc')}
                </p>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30">
                <span className="text-2xl">🎮</span>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>{t('earnXpTitle')}</strong> - {t('earnXpDescription')}
                </p>
              </div>
            </div>
          </motion.div>

          <ReadyNavigation onStart={stop} />

          {isReplayMode && (
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              {t('replayModeMessage', { action: t('startButton') })}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

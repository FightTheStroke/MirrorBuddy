'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { ArrowRight, ArrowLeft, SkipForward, User, GraduationCap, Heart, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';
import { cn } from '@/lib/utils';
import { useOnboardingTTS, ONBOARDING_SCRIPTS } from '@/lib/hooks/use-onboarding-tts';

const SCHOOL_LEVELS = [
  { id: 'elementare', label: 'Elementare', years: '6-10 anni' },
  { id: 'media', label: 'Media', years: '11-13 anni' },
  { id: 'superiore', label: 'Superiore', years: '14-19 anni' },
] as const;

const LEARNING_DIFFERENCES = [
  { id: 'dyslexia', label: 'Dislessia', icon: '📖' },
  { id: 'dyscalculia', label: 'Discalculia', icon: '🔢' },
  { id: 'dysgraphia', label: 'Disgrafia', icon: '✏️' },
  { id: 'adhd', label: 'ADHD', icon: '⚡' },
  { id: 'autism', label: 'Autismo', icon: '🧩' },
  { id: 'cerebralPalsy', label: 'Paralisi Cerebrale', icon: '💪' },
  { id: 'visualImpairment', label: 'Difficoltà Visive', icon: '👁️' },
  { id: 'auditoryProcessing', label: 'Difficoltà Uditive', icon: '👂' },
] as const;

/**
 * Step 2: Optional info collection (skippable)
 *
 * Collects:
 * - Age (optional)
 * - School level (optional)
 * - Learning differences (optional, for accessibility presets)
 */
export function InfoStep() {
  const { data, updateData, nextStep, prevStep, isReplayMode, isVoiceMuted, setVoiceMuted } = useOnboardingStore();

  const [age, setAge] = useState<number | undefined>(data.age);
  const [schoolLevel, setSchoolLevel] = useState<'elementare' | 'media' | 'superiore' | undefined>(
    data.schoolLevel
  );
  const [selectedDifferences, setSelectedDifferences] = useState<string[]>(
    data.learningDifferences || []
  );

  // Auto-speak Melissa's info message
  const { isPlaying, stop } = useOnboardingTTS({
    autoSpeak: !isVoiceMuted,
    text: ONBOARDING_SCRIPTS.info,
    delay: 500,
  });

  const toggleMute = () => {
    if (isPlaying) stop();
    setVoiceMuted(!isVoiceMuted);
  };

  const handleContinue = () => {
    stop();
    updateData({
      age,
      schoolLevel,
      learningDifferences: selectedDifferences,
    });
    nextStep();
  };

  const handleSkip = () => {
    stop();
    nextStep();
  };

  const toggleDifference = (id: string) => {
    setSelectedDifferences((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  return (
    <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-0 shadow-2xl">
      <CardContent className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-pink-200 shadow">
            <Image
              src="/avatars/melissa.jpg"
              alt="Melissa"
              width={64}
              height={64}
              className="object-cover w-full h-full"
            />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
              Raccontami un po&apos; di te, {data.name}!
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Questo mi aiuterà a personalizzare la tua esperienza
            </p>
          </div>
          {/* Voice toggle */}
          <button
            onClick={toggleMute}
            className="p-2 rounded-full bg-pink-100 dark:bg-pink-900/30 hover:bg-pink-200 dark:hover:bg-pink-900/50 transition-colors"
            aria-label={isVoiceMuted ? 'Attiva voce' : 'Disattiva voce'}
            title={isVoiceMuted ? 'Attiva voce' : 'Disattiva voce'}
          >
            {isVoiceMuted ? (
              <VolumeX className="w-5 h-5 text-pink-600 dark:text-pink-400" />
            ) : (
              <Volume2 className={cn('w-5 h-5 text-pink-600 dark:text-pink-400', isPlaying && 'animate-pulse')} />
            )}
          </button>
        </div>

        {/* Age input */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-2"
        >
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <User className="w-4 h-4" />
            Quanti anni hai?
          </label>
          <div className="flex gap-2">
            {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((a) => (
              <button
                key={a}
                onClick={() => setAge(a)}
                className={cn(
                  'w-10 h-10 rounded-lg font-medium transition-all',
                  age === a
                    ? 'bg-pink-500 text-white shadow-lg scale-110'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                )}
              >
                {a}
              </button>
            ))}
          </div>
        </motion.div>

        {/* School level */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-2"
        >
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <GraduationCap className="w-4 h-4" />
            Che scuola fai?
          </label>
          <div className="grid grid-cols-3 gap-3">
            {SCHOOL_LEVELS.map((level) => (
              <button
                key={level.id}
                onClick={() => setSchoolLevel(level.id)}
                className={cn(
                  'p-3 rounded-xl border-2 transition-all text-center',
                  schoolLevel === level.id
                    ? 'border-pink-500 bg-pink-50 dark:bg-pink-950'
                    : 'border-gray-200 dark:border-gray-700 hover:border-pink-300'
                )}
              >
                <div className="font-medium text-gray-800 dark:text-gray-200">
                  {level.label}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {level.years}
                </div>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Learning differences */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-2"
        >
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <Heart className="w-4 h-4" />
            Hai qualche difficoltà particolare? (opzionale)
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Questo ci aiuta a rendere l&apos;app più accessibile per te
          </p>
          <div className="grid grid-cols-2 gap-2">
            {LEARNING_DIFFERENCES.map((diff) => (
              <button
                key={diff.id}
                onClick={() => toggleDifference(diff.id)}
                className={cn(
                  'p-3 rounded-xl border-2 transition-all text-left flex items-center gap-2',
                  selectedDifferences.includes(diff.id)
                    ? 'border-pink-500 bg-pink-50 dark:bg-pink-950'
                    : 'border-gray-200 dark:border-gray-700 hover:border-pink-300'
                )}
              >
                <span className="text-xl">{diff.icon}</span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {diff.label}
                </span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex gap-3 pt-4"
        >
          <Button
            onClick={() => { stop(); prevStep(); }}
            variant="outline"
            size="lg"
            className="flex-1"
          >
            <ArrowLeft className="mr-2 w-4 h-4" />
            Indietro
          </Button>
          <Button
            onClick={handleSkip}
            variant="ghost"
            size="lg"
            className="text-gray-500"
          >
            <SkipForward className="mr-2 w-4 h-4" />
            Salta
          </Button>
          <Button
            onClick={handleContinue}
            size="lg"
            className="flex-1 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white"
          >
            Avanti
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </motion.div>

        {isReplayMode && (
          <p className="text-center text-xs text-gray-500 dark:text-gray-400">
            Modalità anteprima - le modifiche non saranno salvate
          </p>
        )}
      </CardContent>
    </Card>
  );
}

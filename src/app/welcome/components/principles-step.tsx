'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { ArrowRight, ArrowLeft, Lightbulb, Users, Heart, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';
import { useOnboardingTTS, ONBOARDING_SCRIPTS } from '@/lib/hooks/use-onboarding-tts';

const PRINCIPLES = [
  {
    icon: Lightbulb,
    title: 'Impara a modo tuo',
    description: 'Ognuno ha il suo modo di imparare. Qui rispettiamo il tuo ritmo e il tuo stile.',
    color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
  },
  {
    icon: Users,
    title: '16 Maestri al tuo fianco',
    description: 'Da Leonardo a Marie Curie, i più grandi geni della storia ti spiegheranno ogni materia.',
    color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  },
  {
    icon: Heart,
    title: 'Mai da solo',
    description: 'Coach, compagni virtuali e strumenti pensati per te. Insieme si impara meglio!',
    color: 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400',
  },
  {
    icon: Sparkles,
    title: 'Divertiti imparando',
    description: 'Quiz, flashcard, mappe mentali e XP da guadagnare. Studiare diventa un\'avventura!',
    color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  },
];

interface PrinciplesStepProps {
  useWebSpeechFallback?: boolean;
  onAzureUnavailable?: () => void;
}

/**
 * Step 3: Principles of ConvergioEdu
 *
 * Brief, engaging overview of what makes the platform special.
 */
export function PrinciplesStep(_props: PrinciplesStepProps) {
  const { data, nextStep, prevStep, isVoiceMuted, setVoiceMuted } = useOnboardingStore();

  // Auto-speak Melissa's principles message
  const { isPlaying, stop } = useOnboardingTTS({
    autoSpeak: !isVoiceMuted,
    text: ONBOARDING_SCRIPTS.principles,
    delay: 500,
  });

  const toggleMute = () => {
    if (isPlaying) stop();
    setVoiceMuted(!isVoiceMuted);
  };

  const handleNext = () => {
    stop();
    nextStep();
  };

  const handlePrev = () => {
    stop();
    prevStep();
  };

  return (
    <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-0 shadow-2xl">
      <CardContent className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-pink-200 shadow">
            <Image
              src="/avatars/melissa.jpg"
              alt="Melissa"
              width={56}
              height={56}
              className="object-cover w-full h-full"
            />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
              Benvenuto nella Scuola Che Vorrei, {data.name}!
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Ecco cosa ci rende speciali
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
              <Volume2 className={`w-5 h-5 text-pink-600 dark:text-pink-400 ${isPlaying ? 'animate-pulse' : ''}`} />
            )}
          </button>
        </div>

        {/* Principles grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PRINCIPLES.map((principle, index) => (
            <motion.div
              key={principle.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 + 0.2 }}
              className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700"
            >
              <div className={`w-10 h-10 rounded-lg ${principle.color} flex items-center justify-center mb-3`}>
                <principle.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-1">
                {principle.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {principle.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Melissa's encouragement */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-950/30 dark:to-purple-950/30 p-4 rounded-xl border border-pink-100 dark:border-pink-900/50"
        >
          <p className="text-gray-700 dark:text-gray-300 italic">
            &ldquo;Ricorda, {data.name}: non esiste un modo sbagliato di imparare.
            Io sono qui per aiutarti a trovare il tuo!&rdquo;
          </p>
          <p className="text-right text-sm text-pink-600 dark:text-pink-400 mt-2 font-medium">
            — Melissa
          </p>
        </motion.div>

        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flex gap-3 pt-2"
        >
          <Button
            onClick={handlePrev}
            variant="outline"
            size="lg"
            className="flex-1"
          >
            <ArrowLeft className="mr-2 w-4 h-4" />
            Indietro
          </Button>
          <Button
            onClick={handleNext}
            size="lg"
            className="flex-1 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white"
          >
            Avanti
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </motion.div>
      </CardContent>
    </Card>
  );
}
